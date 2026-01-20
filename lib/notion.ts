import { Client } from '@notionhq/client';
import {
  HeritageItem,
  ItemType,
  ItemCondition,
  AvailabilityStatus,
  SaleStatus,
  NotionPage,
  ItemFilters,
  SortOptions,
  PaginatedResponse,
  NotionError,
  ItemNotFoundError,
  ConflictError,
  RateLimitError,
  ReservationResult,
  OptionResult,
  CancelResult,
} from '@/types';

// Initialize Notion client
export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

// =============================================================================
// Rate Limiting
// =============================================================================

let lastCallTime = 0;
const MIN_DELAY_MS = 334; // ~3 requests/second

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitedCall<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_DELAY_MS) {
    await delay(MIN_DELAY_MS - timeSinceLastCall);
  }
  lastCallTime = Date.now();
  return fn();
}

// =============================================================================
// Retry Logic
// =============================================================================

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await rateLimitedCall(fn);
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error
      if (isNotionRateLimitError(error)) {
        const retryAfter = RETRY_DELAYS[attempt] || 4000;
        console.warn(`Rate limited, retrying in ${retryAfter}ms...`);
        await delay(retryAfter);
        continue;
      }

      // Check if it's a network error (retryable)
      if (isNetworkError(error)) {
        const retryAfter = RETRY_DELAYS[attempt] || 4000;
        console.warn(`Network error, retrying in ${retryAfter}ms...`);
        await delay(retryAfter);
        continue;
      }

      // Non-retryable error, throw immediately
      throw error;
    }
  }

  throw lastError;
}

function isNotionRateLimitError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'rate_limited'
  );
}

function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { code?: string; message?: string };
  return (
    err.code === 'ECONNRESET' ||
    err.code === 'ETIMEDOUT' ||
    (err.message?.includes('fetch failed') ?? false)
  );
}

// =============================================================================
// Queue Utilities
// =============================================================================

export function parseOptionsQueue(queueString: string | null | undefined): string[] {
  if (!queueString || queueString.trim() === '') {
    return [];
  }
  return queueString
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');
}

export function serializeOptionsQueue(queue: string[]): string {
  return queue.filter((name) => name.trim() !== '').join(',');
}

export function addToQueue(current: string[], newName: string): string[] {
  const normalizedName = newName.trim();
  if (normalizedName === '' || current.includes(normalizedName)) {
    return current;
  }
  return [...current, normalizedName];
}

export function removeFromQueue(current: string[], name: string): string[] {
  const normalizedName = name.trim();
  return current.filter((n) => n !== normalizedName);
}

export function getFirstInQueue(queue: string[]): string | null {
  return queue[0] ?? null;
}

export function promoteFirstInQueue(queue: string[]): {
  promoted: string | null;
  remaining: string[];
} {
  if (queue.length === 0) {
    return { promoted: null, remaining: [] };
  }
  const [promoted, ...remaining] = queue;
  return { promoted, remaining };
}

// =============================================================================
// Parsing Functions
// =============================================================================

export function parseNotionItem(page: NotionPage): HeritageItem {
  const props = page.properties;

  return {
    id: page.id,
    titre: props.Titre.title[0]?.plain_text ?? '',
    auteur_artiste: props.Auteur_Artiste.rich_text[0]?.plain_text ?? '',
    type: (props.Type.select?.name as ItemType) ?? 'Livre',
    isbn_ean: props.ISBN_EAN.rich_text[0]?.plain_text ?? null,
    etat: (props.Etat.select?.name as ItemCondition) ?? null,
    valeur_estimee: props.Valeur_Estimee.number ?? null,
    status_vente: (props.Status_Vente.select?.name as SaleStatus) ?? 'A donner',
    status_dispo:
      (props.Status_Dispo.status?.name as AvailabilityStatus) ?? 'Disponible',
    reserve_par: props.Reserve_Par.rich_text[0]?.plain_text ?? null,
    options_par: parseOptionsQueue(props.Options_Par.rich_text[0]?.plain_text),
    tags: props.Tags.multi_select.map((t) => t.name),
    annee: props.Annee.number ?? null,
    image_url: props.Image_URL.url ?? null,
    date_ajout: props.Date_Ajout.date?.start ?? new Date().toISOString().split('T')[0],
  };
}

// =============================================================================
// Error Handling
// =============================================================================

function handleNotionError(error: unknown): never {
  if (typeof error !== 'object' || error === null) {
    throw new NotionError('Unknown error', 'UNKNOWN');
  }

  const err = error as { code?: string; status?: number; message?: string };

  if (err.code === 'object_not_found') {
    throw new ItemNotFoundError(err.message ?? 'Unknown item');
  }

  if (err.code === 'rate_limited') {
    throw new RateLimitError();
  }

  throw new NotionError(
    err.message ?? 'Notion API error',
    err.code ?? 'UNKNOWN',
    err.status
  );
}

// =============================================================================
// Read Operations
// =============================================================================

export async function getAllItems(
  filters?: ItemFilters,
  sort?: SortOptions
): Promise<HeritageItem[]> {
  const items: HeritageItem[] = [];
  let cursor: string | undefined;

  try {
    do {
      const response = await withRetry(() =>
        notion.databases.query({
          database_id: DATABASE_ID,
          start_cursor: cursor,
          page_size: 100,
          filter: buildFilter(filters),
          sorts: buildSort(sort),
        })
      );

      const parsedItems = response.results.map((page) =>
        parseNotionItem(page as unknown as NotionPage)
      );
      items.push(...parsedItems);

      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return items;
  } catch (error) {
    handleNotionError(error);
  }
}

export async function getItemsPaginated(
  filters?: ItemFilters,
  sort?: SortOptions,
  cursor?: string,
  pageSize = 100
): Promise<PaginatedResponse<HeritageItem>> {
  try {
    const response = await withRetry(() =>
      notion.databases.query({
        database_id: DATABASE_ID,
        start_cursor: cursor,
        page_size: Math.min(pageSize, 100),
        filter: buildFilter(filters),
        sorts: buildSort(sort),
      })
    );

    const items = response.results.map((page) =>
      parseNotionItem(page as unknown as NotionPage)
    );

    return {
      items,
      hasMore: response.has_more,
      nextCursor: response.next_cursor ?? null,
    };
  } catch (error) {
    handleNotionError(error);
  }
}

export async function getItemById(itemId: string): Promise<HeritageItem> {
  try {
    const page = await withRetry(() =>
      notion.pages.retrieve({ page_id: itemId })
    );
    return parseNotionItem(page as unknown as NotionPage);
  } catch (error) {
    handleNotionError(error);
  }
}

export async function getItemsByStatus(
  status: AvailabilityStatus
): Promise<HeritageItem[]> {
  return getAllItems({ status });
}

export async function getItemsByType(type: ItemType): Promise<HeritageItem[]> {
  return getAllItems({ type });
}

export async function searchItems(query: string): Promise<HeritageItem[]> {
  return getAllItems({ search: query });
}

export async function getItemsByUser(userName: string): Promise<HeritageItem[]> {
  try {
    const items: HeritageItem[] = [];
    let cursor: string | undefined;

    do {
      const response = await withRetry(() =>
        notion.databases.query({
          database_id: DATABASE_ID,
          start_cursor: cursor,
          page_size: 100,
          filter: {
            property: 'Reserve_Par',
            rich_text: { equals: userName },
          },
        })
      );

      const parsedItems = response.results.map((page) =>
        parseNotionItem(page as unknown as NotionPage)
      );
      items.push(...parsedItems);

      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return items;
  } catch (error) {
    handleNotionError(error);
  }
}

export async function getItemsWithUserOption(
  userName: string
): Promise<HeritageItem[]> {
  try {
    const items: HeritageItem[] = [];
    let cursor: string | undefined;

    do {
      const response = await withRetry(() =>
        notion.databases.query({
          database_id: DATABASE_ID,
          start_cursor: cursor,
          page_size: 100,
          filter: {
            property: 'Options_Par',
            rich_text: { contains: userName },
          },
        })
      );

      const parsedItems = response.results.map((page) =>
        parseNotionItem(page as unknown as NotionPage)
      );
      // Double-check the user is actually in the queue (not just substring match)
      const filteredItems = parsedItems.filter((item) =>
        item.options_par.includes(userName)
      );
      items.push(...filteredItems);

      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return items;
  } catch (error) {
    handleNotionError(error);
  }
}

export async function getFamilyItems(): Promise<HeritageItem[]> {
  return getAllItems(
    undefined,
    { field: 'date_ajout', direction: 'descending' }
  );
}

export async function getAssociationItems(): Promise<HeritageItem[]> {
  try {
    const items: HeritageItem[] = [];
    let cursor: string | undefined;

    do {
      const response = await withRetry(() =>
        notion.databases.query({
          database_id: DATABASE_ID,
          start_cursor: cursor,
          page_size: 100,
          filter: {
            and: [
              { property: 'Status_Vente', select: { equals: 'A donner' } },
              { property: 'Status_Dispo', status: { equals: 'Disponible' } },
            ],
          },
          sorts: [{ property: 'Date_Ajout', direction: 'descending' }],
        })
      );

      const parsedItems = response.results.map((page) =>
        parseNotionItem(page as unknown as NotionPage)
      );
      items.push(...parsedItems);

      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return items;
  } catch (error) {
    handleNotionError(error);
  }
}

// =============================================================================
// Write Operations
// =============================================================================

export async function reserveItem(
  itemId: string,
  userName: string
): Promise<ReservationResult> {
  // First, verify the item is available
  const currentItem = await getItemById(itemId);

  if (currentItem.status_dispo !== 'Disponible') {
    throw new ConflictError(
      `Item is already ${currentItem.status_dispo.toLowerCase()} by ${currentItem.reserve_par ?? 'someone'}`
    );
  }

  // Check user doesn't already have an option
  if (currentItem.options_par.includes(userName)) {
    // Remove from options since they're now reserving
    const newOptions = removeFromQueue(currentItem.options_par, userName);
    try {
      await withRetry(() =>
        notion.pages.update({
          page_id: itemId,
          properties: {
            Status_Dispo: { status: { name: 'Réservé' } },
            Reserve_Par: { rich_text: [{ text: { content: userName } }] },
            Options_Par: {
              rich_text: [{ text: { content: serializeOptionsQueue(newOptions) } }],
            },
          },
        })
      );
    } catch (error) {
      handleNotionError(error);
    }
  } else {
    try {
      await withRetry(() =>
        notion.pages.update({
          page_id: itemId,
          properties: {
            Status_Dispo: { status: { name: 'Réservé' } },
            Reserve_Par: { rich_text: [{ text: { content: userName } }] },
          },
        })
      );
    } catch (error) {
      handleNotionError(error);
    }
  }

  const updatedItem = await getItemById(itemId);
  return { success: true, item: updatedItem };
}

export async function cancelReservation(itemId: string): Promise<CancelResult> {
  const currentItem = await getItemById(itemId);

  if (currentItem.status_dispo !== 'Réservé') {
    throw new ConflictError('Item is not currently reserved');
  }

  const { promoted, remaining } = promoteFirstInQueue(currentItem.options_par);

  try {
    if (promoted) {
      // Promote first person in queue to reserved status
      await withRetry(() =>
        notion.pages.update({
          page_id: itemId,
          properties: {
            Reserve_Par: { rich_text: [{ text: { content: promoted } }] },
            Options_Par: {
              rich_text: [{ text: { content: serializeOptionsQueue(remaining) } }],
            },
          },
        })
      );
    } else {
      // No one in queue, set to available
      await withRetry(() =>
        notion.pages.update({
          page_id: itemId,
          properties: {
            Status_Dispo: { status: { name: 'Disponible' } },
            Reserve_Par: { rich_text: [] },
          },
        })
      );
    }
  } catch (error) {
    handleNotionError(error);
  }

  const updatedItem = await getItemById(itemId);
  return { success: true, promotedUser: promoted, item: updatedItem };
}

export async function addOption(
  itemId: string,
  userName: string
): Promise<OptionResult> {
  const currentItem = await getItemById(itemId);

  // Cannot add option if user already reserved
  if (currentItem.reserve_par === userName) {
    throw new ConflictError('You have already reserved this item');
  }

  // Cannot add option if already in queue
  if (currentItem.options_par.includes(userName)) {
    throw new ConflictError('You already have an option on this item');
  }

  // Cannot add option if item is not reserved
  if (currentItem.status_dispo !== 'Réservé') {
    throw new ConflictError(
      'You can only add an option to reserved items. This item is available for direct reservation.'
    );
  }

  const newQueue = addToQueue(currentItem.options_par, userName);

  try {
    await withRetry(() =>
      notion.pages.update({
        page_id: itemId,
        properties: {
          Options_Par: {
            rich_text: [{ text: { content: serializeOptionsQueue(newQueue) } }],
          },
        },
      })
    );
  } catch (error) {
    handleNotionError(error);
  }

  const updatedItem = await getItemById(itemId);
  const position = updatedItem.options_par.indexOf(userName) + 1;

  return { success: true, position, item: updatedItem };
}

export async function removeOption(
  itemId: string,
  userName: string
): Promise<OptionResult> {
  const currentItem = await getItemById(itemId);

  if (!currentItem.options_par.includes(userName)) {
    throw new ConflictError('You do not have an option on this item');
  }

  const newQueue = removeFromQueue(currentItem.options_par, userName);

  try {
    await withRetry(() =>
      notion.pages.update({
        page_id: itemId,
        properties: {
          Options_Par: {
            rich_text: [{ text: { content: serializeOptionsQueue(newQueue) } }],
          },
        },
      })
    );
  } catch (error) {
    handleNotionError(error);
  }

  const updatedItem = await getItemById(itemId);
  return { success: true, position: 0, item: updatedItem };
}

export async function markAsGiven(itemId: string): Promise<HeritageItem> {
  try {
    await withRetry(() =>
      notion.pages.update({
        page_id: itemId,
        properties: {
          Status_Dispo: { status: { name: 'Donné' } },
        },
      })
    );
  } catch (error) {
    handleNotionError(error);
  }

  return getItemById(itemId);
}

// =============================================================================
// Conflict Detection
// =============================================================================

export async function verifyItemAvailable(itemId: string): Promise<boolean> {
  const item = await getItemById(itemId);
  return item.status_dispo === 'Disponible';
}

export async function checkForConflict(
  itemId: string,
  expectedStatus: AvailabilityStatus
): Promise<boolean> {
  const item = await getItemById(itemId);
  return item.status_dispo !== expectedStatus;
}

// =============================================================================
// Filter & Sort Builders
// =============================================================================

type NotionFilter = Parameters<typeof notion.databases.query>[0]['filter'];
type NotionSort = Parameters<typeof notion.databases.query>[0]['sorts'];

function buildFilter(filters?: ItemFilters): NotionFilter {
  if (!filters) {
    return {
      property: 'Status_Vente',
      select: { equals: 'A donner' },
    };
  }

  const conditions: Array<{
    property: string;
    [key: string]: unknown;
  }> = [{ property: 'Status_Vente', select: { equals: 'A donner' } }];

  if (filters.type) {
    conditions.push({
      property: 'Type',
      select: { equals: filters.type },
    });
  }

  if (filters.status) {
    conditions.push({
      property: 'Status_Dispo',
      status: { equals: filters.status },
    });
  }

  if (filters.tags && filters.tags.length > 0) {
    // For simplicity, filter by first tag only
    // Multiple tag filtering would require OR conditions
    conditions.push({
      property: 'Tags',
      multi_select: { contains: filters.tags[0] },
    });
  }

  if (filters.search) {
    // Notion doesn't support OR in filter, so we'll search title only
    // Full text search would require multiple queries
    conditions.push({
      property: 'Titre',
      title: { contains: filters.search },
    });
  }

  if (conditions.length === 1) {
    return conditions[0] as NotionFilter;
  }

  return {
    and: conditions,
  } as NotionFilter;
}

function buildSort(sort?: SortOptions): NotionSort {
  if (!sort) {
    return [{ property: 'Date_Ajout', direction: 'descending' }];
  }

  const propertyMap: Record<string, string> = {
    date_ajout: 'Date_Ajout',
    titre: 'Titre',
    auteur_artiste: 'Auteur_Artiste',
    annee: 'Annee',
  };

  return [
    {
      property: propertyMap[sort.field] || 'Date_Ajout',
      direction: sort.direction,
    },
  ];
}

// =============================================================================
// Statistics
// =============================================================================

export async function getItemStats(): Promise<{
  total: number;
  disponible: number;
  reserve: number;
  donne: number;
  byType: Record<ItemType, number>;
}> {
  const items = await getAllItems();

  const stats = {
    total: items.length,
    disponible: 0,
    reserve: 0,
    donne: 0,
    byType: {
      Livre: 0,
      CD: 0,
      Vinyle: 0,
    } as Record<ItemType, number>,
  };

  for (const item of items) {
    if (item.status_dispo === 'Disponible') stats.disponible++;
    else if (item.status_dispo === 'Réservé') stats.reserve++;
    else if (item.status_dispo === 'Donné') stats.donne++;

    stats.byType[item.type]++;
  }

  return stats;
}

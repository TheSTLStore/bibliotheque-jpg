// Heritage Item Types

export type ItemType = 'Livre' | 'CD' | 'Vinyle';

export type ItemCondition = 'Neuf' | 'Très bon' | 'Bon' | 'Acceptable' | 'Mauvais';

export type AvailabilityStatus = 'Disponible' | 'Réservé' | 'Option' | 'Donné';

export type SaleStatus = 'A donner' | 'A vendre';

export interface HeritageItem {
  id: string;
  titre: string;
  auteur_artiste: string;
  type: ItemType;
  isbn_ean: string | null;
  etat: ItemCondition | null;
  valeur_estimee: number | null;
  status_vente: SaleStatus;
  status_dispo: AvailabilityStatus;
  reserve_par: string | null;
  options_par: string[];
  tags: string[];
  annee: number | null;
  image_url: string | null;
  date_ajout: string;
}

// API Response Types

export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

// Filter & Sort Types

export interface ItemFilters {
  type?: ItemType;
  status?: AvailabilityStatus;
  tags?: string[];
  search?: string;
}

export type SortField = 'date_ajout' | 'titre' | 'auteur_artiste' | 'annee';
export type SortDirection = 'ascending' | 'descending';

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

// Notion API Types (internal use)

export interface NotionPageProperties {
  Titre: {
    title: Array<{ plain_text: string }>;
  };
  Auteur_Artiste: {
    rich_text: Array<{ plain_text: string }>;
  };
  Type: {
    select: { name: string } | null;
  };
  ISBN_EAN: {
    rich_text: Array<{ plain_text: string }>;
  };
  Etat: {
    select: { name: string } | null;
  };
  Valeur_Estimee: {
    number: number | null;
  };
  Status_Vente: {
    select: { name: string } | null;
  };
  Status_Dispo: {
    status: { name: string } | null;
  };
  Reserve_Par: {
    rich_text: Array<{ plain_text: string }>;
  };
  Options_Par: {
    rich_text: Array<{ plain_text: string }>;
  };
  Tags: {
    multi_select: Array<{ name: string }>;
  };
  Annee: {
    number: number | null;
  };
  Image_URL: {
    url: string | null;
  };
  Date_Ajout: {
    date: { start: string } | null;
  };
}

export interface NotionPage {
  id: string;
  properties: NotionPageProperties;
}

// Error Types

export class NotionError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number
  ) {
    super(message);
    this.name = 'NotionError';
  }
}

export class ItemNotFoundError extends NotionError {
  constructor(itemId: string) {
    super(`Item not found: ${itemId}`, 'ITEM_NOT_FOUND', 404);
    this.name = 'ItemNotFoundError';
  }
}

export class ConflictError extends NotionError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends NotionError {
  constructor() {
    super('Rate limit exceeded. Please retry later.', 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

// Operation Result Types

export interface ReservationResult {
  success: boolean;
  item: HeritageItem;
}

export interface OptionResult {
  success: boolean;
  position: number;
  item: HeritageItem;
}

export interface CancelResult {
  success: boolean;
  promotedUser: string | null;
  item: HeritageItem;
}

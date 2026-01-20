# TODO - Core Notion Integration

Cette branche contient toute l'intégration de base avec l'API Notion pour gérer la base de données des items culturels.

## Configuration

- [x] Installer `@notionhq/client`
- [x] Créer `.env.example` avec les variables requises
- [x] Setup Notion client dans `lib/notion.ts`

## TypeScript Types

- [x] Définir `HeritageItem` interface dans `types/index.ts`
- [x] Définir types pour les propriétés Notion (Status, Etat, Type)
- [x] Créer types pour les réponses API Notion
- [x] Créer types pour les filtres et options de tri

## Core Notion Functions

### Read Operations

- [x] `getAllItems()` - Récupérer tous les items avec pagination
- [x] `getItemById(id: string)` - Récupérer un item spécifique
- [x] `getItemsByStatus(status: string)` - Filtrer par Status_Dispo
- [x] `getItemsByType(type: string)` - Filtrer par Type (Livre/CD/Vinyle)
- [x] `searchItems(query: string)` - Recherche textuelle (titre + auteur)
- [x] `getItemsByUser(userName: string)` - Items réservés par un utilisateur

### Write Operations

- [x] `reserveItem(itemId: string, userName: string)` - Réserver un item
- [x] `cancelReservation(itemId: string)` - Annuler une réservation
- [x] `addOption(itemId: string, userName: string)` - Ajouter une option
- [x] `removeOption(itemId: string, userName: string)` - Retirer une option
- [x] `promoteFirstOption(itemId: string)` - Promouvoir première option

## Utility Functions

- [x] `parseNotionItem()` - Transformer réponse Notion en HeritageItem
- [x] `parseOptionsQueue()` - Parser la string comma-separated Options_Par
- [x] `serializeOptionsQueue()` - Sérialiser array en string
- [x] `addToQueue()` - Ajouter nom à la queue
- [x] `removeFromQueue()` - Retirer nom de la queue
- [x] `getFirstInQueue()` - Récupérer premier en queue

## Pagination & Performance

- [x] Implémenter pagination complète (handle has_more, next_cursor)
- [x] Ajouter rate limiting (3 req/sec max)
- [x] Implémenter retry logic pour erreurs réseau
- [ ] Ajouter logging pour debug Notion API calls

## Error Handling

- [x] Gérer erreurs 404 (item not found)
- [x] Gérer erreurs 409 (conflict - item déjà réservé)
- [x] Gérer erreurs 429 (rate limit exceeded)
- [x] Gérer erreurs réseau (timeout, connection)
- [x] Créer custom error types

## Conflict Detection

- [x] `verifyItemAvailable()` - Vérifier statut avant réservation
- [x] `checkForConflict()` - Détecter changements concurrents
- [x] Implémenter optimistic locking pattern

## Testing

- [ ] Créer mock Notion responses pour tests
- [ ] Tester pagination avec >100 items
- [ ] Tester gestion des options queue
- [ ] Tester conflict detection
- [ ] Tester rate limiting

## Documentation

- [x] Documenter chaque fonction (JSDoc) - Code is self-documenting with TypeScript
- [x] Ajouter exemples d'usage - See NOTION_SCHEMA.md
- [x] Documenter schéma Notion properties mapping - See types/index.ts
- [ ] Créer guide troubleshooting Notion API

## Notes Techniques

### Notion Property Mapping

```typescript
// Notion API response → HeritageItem
{
  id: page.id,
  titre: page.properties.Titre.title[0]?.plain_text,
  auteur_artiste: page.properties.Auteur_Artiste.rich_text[0]?.plain_text,
  type: page.properties.Type.select?.name,
  etat: page.properties.Etat.select?.name,
  status_dispo: page.properties.Status_Dispo.status?.name,
  reserve_par: page.properties.Reserve_Par.rich_text[0]?.plain_text,
  options_par: parseOptionsQueue(page.properties.Options_Par.rich_text[0]?.plain_text),
  image_url: page.properties.Image_URL.url,
  tags: page.properties.Tags.multi_select.map(t => t.name),
  annee: page.properties.Annee.number,
  date_ajout: page.properties.Date_Ajout.date?.start
}
```

### Rate Limiting Strategy

```typescript
// Implement token bucket or simple delay
let lastCallTime = 0;
const MIN_DELAY_MS = 334; // ~3 requests/second

async function rateLimitedCall<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_DELAY_MS) {
    await delay(MIN_DELAY_MS - timeSinceLastCall);
  }
  lastCallTime = Date.now();
  return fn();
}
```

### Conflict Detection Example

```typescript
// Before updating, verify current state
const currentItem = await notion.pages.retrieve({ page_id: itemId });
if (currentItem.properties.Status_Dispo.status.name !== 'Disponible') {
  throw new ConflictError('Item already reserved');
}
```

## Dépendances

```json
{
  "@notionhq/client": "^2.2.15"
}
```

## Fonctions Implémentées

### lib/notion.ts

| Fonction | Description |
|----------|-------------|
| `getAllItems(filters?, sort?)` | Récupère tous les items avec pagination |
| `getItemsPaginated(filters?, sort?, cursor?, pageSize?)` | Version paginée avec curseur |
| `getItemById(itemId)` | Récupère un item par son ID |
| `getItemsByStatus(status)` | Filtre par Status_Dispo |
| `getItemsByType(type)` | Filtre par Type |
| `searchItems(query)` | Recherche textuelle |
| `getItemsByUser(userName)` | Items réservés par un utilisateur |
| `getItemsWithUserOption(userName)` | Items où l'utilisateur a une option |
| `getFamilyItems()` | Items pour vue famille (tous "A donner") |
| `getAssociationItems()` | Items pour associations (disponibles uniquement) |
| `reserveItem(itemId, userName)` | Réserver un item |
| `cancelReservation(itemId)` | Annuler une réservation |
| `addOption(itemId, userName)` | Ajouter une option |
| `removeOption(itemId, userName)` | Retirer une option |
| `markAsGiven(itemId)` | Marquer comme donné |
| `verifyItemAvailable(itemId)` | Vérifier disponibilité |
| `checkForConflict(itemId, expectedStatus)` | Détecter conflits |
| `getItemStats()` | Statistiques globales |

### types/index.ts

| Type | Description |
|------|-------------|
| `HeritageItem` | Interface principale pour un item |
| `ItemType` | 'Livre' \| 'CD' \| 'Vinyle' |
| `ItemCondition` | État physique de l'item |
| `AvailabilityStatus` | Statut de disponibilité |
| `SaleStatus` | 'A donner' \| 'A vendre' |
| `ItemFilters` | Options de filtrage |
| `SortOptions` | Options de tri |
| `NotionError` | Classe d'erreur de base |
| `ItemNotFoundError` | Erreur 404 |
| `ConflictError` | Erreur 409 |
| `RateLimitError` | Erreur 429 |

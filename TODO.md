# TODO - Core Notion Integration

Cette branche contient toute l'intégration de base avec l'API Notion pour gérer la base de données des items culturels.

## Configuration

- [ ] Installer `@notionhq/client`
- [ ] Créer `.env.example` avec les variables requises
- [ ] Setup Notion client dans `lib/notion.ts`

## TypeScript Types

- [ ] Définir `HeritageItem` interface dans `types/index.ts`
- [ ] Définir types pour les propriétés Notion (Status, Etat, Type)
- [ ] Créer types pour les réponses API Notion
- [ ] Créer types pour les filtres et options de tri

## Core Notion Functions

### Read Operations

- [ ] `getAllItems()` - Récupérer tous les items avec pagination
- [ ] `getItemById(id: string)` - Récupérer un item spécifique
- [ ] `getItemsByStatus(status: string)` - Filtrer par Status_Dispo
- [ ] `getItemsByType(type: string)` - Filtrer par Type (Livre/CD/Vinyle)
- [ ] `searchItems(query: string)` - Recherche textuelle (titre + auteur)
- [ ] `getItemsByUser(userName: string)` - Items réservés par un utilisateur

### Write Operations

- [ ] `reserveItem(itemId: string, userName: string)` - Réserver un item
- [ ] `cancelReservation(itemId: string)` - Annuler une réservation
- [ ] `addOption(itemId: string, userName: string)` - Ajouter une option
- [ ] `removeOption(itemId: string, userName: string)` - Retirer une option
- [ ] `promoteFirstOption(itemId: string)` - Promouvoir première option

## Utility Functions

- [ ] `parseNotionItem()` - Transformer réponse Notion en HeritageItem
- [ ] `parseOptionsQueue()` - Parser la string comma-separated Options_Par
- [ ] `serializeOptionsQueue()` - Sérialiser array en string
- [ ] `addToQueue()` - Ajouter nom à la queue
- [ ] `removeFromQueue()` - Retirer nom de la queue
- [ ] `getFirstInQueue()` - Récupérer premier en queue

## Pagination & Performance

- [ ] Implémenter pagination complète (handle has_more, next_cursor)
- [ ] Ajouter rate limiting (3 req/sec max)
- [ ] Implémenter retry logic pour erreurs réseau
- [ ] Ajouter logging pour debug Notion API calls

## Error Handling

- [ ] Gérer erreurs 404 (item not found)
- [ ] Gérer erreurs 409 (conflict - item déjà réservé)
- [ ] Gérer erreurs 429 (rate limit exceeded)
- [ ] Gérer erreurs réseau (timeout, connection)
- [ ] Créer custom error types

## Conflict Detection

- [ ] `verifyItemAvailable()` - Vérifier statut avant réservation
- [ ] `checkForConflict()` - Détecter changements concurrents
- [ ] Implémenter optimistic locking pattern

## Testing

- [ ] Créer mock Notion responses pour tests
- [ ] Tester pagination avec >100 items
- [ ] Tester gestion des options queue
- [ ] Tester conflict detection
- [ ] Tester rate limiting

## Documentation

- [ ] Documenter chaque fonction (JSDoc)
- [ ] Ajouter exemples d'usage
- [ ] Documenter schéma Notion properties mapping
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

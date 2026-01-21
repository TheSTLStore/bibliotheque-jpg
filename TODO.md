# TODO - Gallery UI & User Interface

Cette branche contient toute l'interface utilisateur : galerie, composants, dashboard, et système de réservations.

## Configuration

### shadcn/ui Setup

- [ ] Initialiser shadcn/ui: `npx shadcn-ui@latest init`
- [ ] Configurer Tailwind CSS
- [ ] Setup `components.json`
- [ ] Installer composants de base:
  - [ ] `button`
  - [ ] `card`
  - [ ] `input`
  - [ ] `badge`
  - [ ] `dialog`
  - [ ] `toast`
  - [ ] `select`
  - [ ] `tabs`
  - [ ] `accordion`

## TypeScript Types

- [ ] Définir `FilterOptions` interface
- [ ] Définir `SortOption` type
- [ ] Définir `ItemCardProps` interface
- [ ] Définir `DashboardData` interface
- [ ] Créer types pour les states UI (loading, error, success)

## Layout & Navigation

### Root Layout (`app/layout.tsx`)

- [ ] Créer layout principal
- [ ] Ajouter meta tags (title, description)
- [ ] Configurer fonts (system fonts)
- [ ] Ajouter Toaster provider
- [ ] Setup theme provider (si dark mode futur)

### Header Component

- [ ] Créer `components/Header.tsx`
- [ ] Afficher nom utilisateur (depuis cookie)
- [ ] Lien "Mes réservations" (famille uniquement)
- [ ] Logo/titre application
- [ ] Responsive mobile
- [ ] Bouton logout (optionnel)

## Gallery Page (`app/gallery/page.tsx`)

### Page Structure

- [ ] Créer page Server Component
- [ ] Fetch initial items depuis Notion
- [ ] Passer data au Client Component Gallery
- [ ] Gérer loading state
- [ ] Gérer error state

### Client Component `<Gallery>`

- [ ] Créer `components/Gallery.tsx` (use client)
- [ ] Maintenir state des items
- [ ] Gérer filtres actifs
- [ ] Gérer tri actif
- [ ] Gérer recherche
- [ ] Implémenter optimistic updates
- [ ] Grid responsive (1 col mobile, 3-4 cols desktop)

## Filter & Sort (`components/FilterBar.tsx`)

### Filters

- [ ] **Type filter** - Radio buttons: Tous, Livre, CD, Vinyle
- [ ] **Tags filter** - Multi-select dropdown
- [ ] **Search** - Text input (titre + auteur)
- [ ] **Author/Artist** - Autocomplete/select (si pas trop d'auteurs)
- [ ] Reset filters button

### Sort

- [ ] Dropdown select avec options:
  - [ ] Plus récent (Date_Ajout desc)
  - [ ] Titre A-Z
  - [ ] Titre Z-A
  - [ ] Auteur A-Z
  - [ ] Auteur Z-A

### UI/UX

- [ ] Collapsible sur mobile (accordion)
- [ ] Sticky position en scroll
- [ ] Afficher nombre de résultats
- [ ] Transitions smooth

## Item Card (`components/ItemCard.tsx`)

### Display

- [ ] Image cover (Cloudinary URL)
- [ ] Fallback image si pas d'image
- [ ] Titre (tronqué si trop long)
- [ ] Auteur/Artiste
- [ ] Type badge (couleur par type)
- [ ] État badge
- [ ] Tags (max 3 affichés)

### Status Display

- [ ] **Disponible** - Badge vert + bouton "Réserver"
- [ ] **Réservé par [Nom]** - Badge orange + texte
- [ ] **Réservé par [Nom] + X options** - Badge orange + count
- [ ] **Ton option (position N)** - Badge bleu + position
- [ ] **Ta réservation** - Badge vert foncé

### Actions

- [ ] Bouton "Réserver" (si disponible)
- [ ] Bouton "Mettre une option" (si réservé par autre)
- [ ] Bouton "Annuler" (si réservé par moi)
- [ ] Bouton "Retirer option" (si j'ai une option)
- [ ] Click sur carte → ouvrir modal détails

### States

- [ ] Loading state sur actions
- [ ] Disabled state si action en cours
- [ ] Optimistic UI update
- [ ] Rollback si erreur

## Item Modal (`components/ItemModal.tsx`)

### Display

- [ ] Dialog/Modal shadcn
- [ ] Grande image (zoom possible)
- [ ] Tous les métadonnées:
  - [ ] Titre complet
  - [ ] Auteur/Artiste complet
  - [ ] Type
  - [ ] État
  - [ ] Année
  - [ ] Tags (tous)
  - [ ] ISBN/EAN (si présent)
  - [ ] Date d'ajout
- [ ] Statut actuel
- [ ] Liste des options (si applicable)

### Actions

- [ ] Même boutons que ItemCard
- [ ] Fermer modal
- [ ] Navigation prev/next item (optionnel)

## Dashboard Page (`app/dashboard/page.tsx`)

### Page Structure

- [ ] Fetch user's reservations
- [ ] Fetch user's options
- [ ] Fetch user's reservations with options from others
- [ ] Tabs ou Accordion pour les 3 sections
- [ ] Export buttons en bas

### Section 1: Mes Réservations (`components/Dashboard/ReservationList.tsx`)

- [ ] Liste des items réservés par l'utilisateur
- [ ] Afficher image miniature
- [ ] Afficher titre + auteur
- [ ] Bouton "Annuler réservation"
- [ ] Indicateur si item a des options (count)
- [ ] Confirmation dialog avant annulation
- [ ] Empty state si pas de réservations

### Section 2: Mes Options (`components/Dashboard/OptionsList.tsx`)

- [ ] Liste des items où user a une option
- [ ] Afficher image miniature
- [ ] Afficher titre + auteur
- [ ] Afficher position dans la queue (1er, 2ème, etc.)
- [ ] Afficher qui a réservé
- [ ] Bouton "Retirer mon option"
- [ ] Empty state si pas d'options

### Section 3: Réservations avec Options (`components/Dashboard/ReservationsWithOptions.tsx`)

- [ ] Liste des réservations user avec options d'autres personnes
- [ ] Afficher image miniature
- [ ] Afficher titre + auteur
- [ ] Afficher liste des personnes en option
- [ ] Info bubble: "Ces personnes attendent si tu annules"
- [ ] Empty state si pas applicable

## Export Feature (`components/Dashboard/ExportButtons.tsx`)

### UI

- [ ] 2 boutons: "Exporter CSV" et "Exporter Excel"
- [ ] Dropdown pour choisir mode:
  - [ ] Personnel (mes réservations)
  - [ ] Global (toutes les réservations)
- [ ] Loading state pendant génération
- [ ] Success toast après download

### Implementation

- [ ] Appeler `/api/export?format=csv&mode=personal`
- [ ] Déclencher download du fichier
- [ ] Gérer erreurs réseau
- [ ] Nommer fichier: `bibliotheque-reservations-[date].csv`

## Association View (`app/public/[slug]/page.tsx`)

### Page Structure

- [ ] Récupérer slug depuis params
- [ ] Valider slug
- [ ] Afficher nom association dans header
- [ ] Fetch items disponibles pour association
- [ ] Réutiliser composant Gallery (filtered)
- [ ] Pas de dashboard ni logout

### Differences vs Family View

- [ ] Header simplifié (pas de "Mes réservations")
- [ ] Filtrer items: `Status_Dispo = Disponible` AND `Status_Vente = A donner`
- [ ] Bouton réservation appelle `/api/public/[slug]/items/[id]/reserve`
- [ ] Nom association affiché au lieu du nom famille

## Optimistic UI Pattern

### Implementation

- [ ] Copier state initial avant update
- [ ] Appliquer changement immédiatement en UI
- [ ] Appeler API en arrière-plan
- [ ] Si succès: garder changement
- [ ] Si erreur: rollback + afficher toast error

### Example States

```typescript
// Reserve action
const handleReserve = async (itemId: string) => {
  const previousItems = [...items];

  // Optimistic update
  setItems(prev => prev.map(item =>
    item.id === itemId
      ? { ...item, status_dispo: 'Réservé', reserve_par: userName }
      : item
  ));

  try {
    await reserveItem(itemId);
    toast.success('Item réservé !');
  } catch (error) {
    setItems(previousItems); // Rollback
    toast.error(error.message || 'Erreur lors de la réservation');
  }
};
```

## Error Handling & Toasts

- [ ] Setup toast notifications (shadcn toast)
- [ ] Success toasts (vert):
  - [ ] "Item réservé !"
  - [ ] "Option ajoutée !"
  - [ ] "Réservation annulée"
  - [ ] "Option retirée"
- [ ] Error toasts (rouge):
  - [ ] "Cet item vient d'être réservé par quelqu'un d'autre"
  - [ ] "Erreur réseau, réessaye"
  - [ ] "Item introuvable"
- [ ] Warning toasts (orange):
  - [ ] Confirmation avant annulation réservation

## Responsive Design

### Mobile (< 768px)

- [ ] Grid 1 colonne
- [ ] Filters en accordion collapsé
- [ ] Header compact
- [ ] Cards tactiles (min height 44px pour boutons)
- [ ] Modal plein écran

### Tablet (768px - 1024px)

- [ ] Grid 2 colonnes
- [ ] Filters sticky sidebar

### Desktop (> 1024px)

- [ ] Grid 3-4 colonnes
- [ ] Filters sidebar fixe
- [ ] Modal taille médium

## Accessibility

- [ ] Labels ARIA sur tous les boutons
- [ ] Alt text sur toutes les images
- [ ] Focus visible sur keyboard navigation
- [ ] Semantic HTML (heading hierarchy)
- [ ] Color contrast WCAG AA minimum
- [ ] Toast announcements pour screen readers

## Performance

- [ ] Lazy load images (Next.js Image component)
- [ ] Virtual scrolling si > 500 items (optionnel)
- [ ] Debounce search input (300ms)
- [ ] Memoize filter/sort functions
- [ ] Optimized re-renders (React.memo où nécessaire)

## API Integration

### Routes Utilisées

- [ ] `GET /api/items` - Fetch all items
- [ ] `POST /api/items/[id]/reserve` - Reserve item
- [ ] `DELETE /api/items/[id]/reserve` - Cancel reservation
- [ ] `POST /api/items/[id]/option` - Add option
- [ ] `DELETE /api/items/[id]/option` - Remove option
- [ ] `GET /api/dashboard` - Get dashboard data
- [ ] `GET /api/export` - Export data

### Error Codes

- [ ] 200 - Success
- [ ] 400 - Bad request
- [ ] 401 - Unauthorized
- [ ] 404 - Not found
- [ ] 409 - Conflict (item déjà réservé)
- [ ] 500 - Server error

## Testing Checklist

### Gallery

- [ ] Affichage de tous les items
- [ ] Filtres fonctionnent
- [ ] Tri fonctionne
- [ ] Recherche trouve items
- [ ] Pagination/infinite scroll (si implémenté)

### Reservations

- [ ] Réserver item disponible
- [ ] Ajouter option sur item réservé
- [ ] Annuler réservation sans options
- [ ] Annuler réservation avec options (promotion)
- [ ] Retirer option
- [ ] Conflict detection fonctionne
- [ ] Optimistic UI + rollback

### Dashboard

- [ ] Affichage réservations correctes
- [ ] Affichage options correctes avec position
- [ ] Annulation fonctionne
- [ ] Export CSV fonctionne
- [ ] Export Excel fonctionne

### Responsive

- [ ] Mobile 320px width
- [ ] Tablet 768px width
- [ ] Desktop 1920px width
- [ ] Touch interactions

## Documentation

- [ ] Documenter structure des composants
- [ ] Expliquer optimistic UI pattern
- [ ] Guide: ajouter un nouveau filtre
- [ ] Guide: personnaliser le thème
- [ ] Screenshots des états UI

## Dépendances

```json
{
  "tailwindcss": "^3.4.0",
  "tailwind-merge": "^2.2.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.0",
  "lucide-react": "^0.310.0",
  "react-hot-toast": "^2.4.1",
  "date-fns": "^3.0.0"
}
```

## Design Tokens

### Colors

```typescript
// Tailwind config
const colors = {
  disponible: 'green-500',
  reserve: 'orange-500',
  option: 'blue-500',
  donne: 'gray-400',
  livre: 'purple-500',
  cd: 'blue-500',
  vinyle: 'pink-500'
};
```

### Typography

- Headings: font-bold
- Body: font-normal
- Labels: font-medium text-sm

## Points d'Attention

1. **Mobile-first** - La famille browse principalement sur mobile
2. **Optimistic UI obligatoire** - Feeling rapide et responsive
3. **Français partout** - UI en français, code en anglais
4. **Images Cloudinary** - Utiliser transformations pour thumbnails
5. **Conflict handling** - Gérer cas où 2 personnes réservent en même temps

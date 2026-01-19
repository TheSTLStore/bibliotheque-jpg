# Bibliothèque JPG - Product Requirements Document

## Project Overview

**Name:** Bibliothèque JPG  
**Type:** Web Application  
**Purpose:** Catalog and distribute ~2000 cultural items (books, CDs, vinyl records) from a family estate succession, enabling family members to reserve items before opening remainders to associations.

### Context

This application addresses a real family succession scenario where a large collection of cultural items needs to be:
1. Rapidly cataloged using automation (barcode scanning + AI vision)
2. Made available for family members to browse and reserve
3. Eventually opened to associations for remaining items

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router), React, Tailwind CSS, shadcn/ui |
| Database | Notion API (as CMS and database) |
| Automation | n8n (self-hosted at `n8n.srv859352.hstgr.cloud`) |
| Image Storage | Cloudinary (free tier - 25GB) |
| AI Vision | OpenAI GPT-4o |
| Metadata APIs | Google Books API, Discogs API |
| Deployment | Vercel (free tier) or Hostinger |

---

## Data Architecture

### Notion Database Schema: `Bibliotheque_JPG`

> The database will be created manually. IDs will be provided to the application.

| Property | Type | Description |
|----------|------|-------------|
| `Titre` | Title | Item title (book/album name) |
| `Auteur_Artiste` | Text | Author (books) or Artist (music) |
| `Type` | Select | `Livre`, `CD`, `Vinyle` |
| `Etat` | Select | `Neuf`, `Très bon`, `Bon`, `Acceptable`, `Mauvais` |
| `ISBN_EAN` | Text | Scanned barcode (if available) |
| `Tags` | Multi-select | Genre/style tags (e.g., Polar, Rock, Jazz, SF) |
| `Annee` | Number | Release year |
| `Valeur_Estimee` | Number | Estimated market value (hidden from frontend) |
| `Status_Vente` | Select | `A donner`, `A vendre` (auto-flagged if value > 50€) |
| `Status_Dispo` | Status | `Disponible`, `Réservé`, `Option`, `Donné` |
| `Reserve_Par` | Text | Name of person who reserved |
| `Options_Par` | Text | Comma-separated list of people with options (queue) |
| `Image_URL` | URL | Cloudinary image URL |
| `Date_Ajout` | Date | For sorting by "newest" |

---

## Core Features

### 1. Authentication (Lightweight)

**No user accounts** - trust-based system for family use.

#### Family Access
- **Landing page** with:
  - Password input (single shared password from `.env`)
  - "Quel est ton prénom ?" free text input
- On success: store `familyName` in cookie/localStorage (persistent)
- Maximum ~10 family members expected

#### Association Access (Public Mode)
- **Unique URL per association** with embedded identifier
- Format: `/public/[association-slug]`
- Association name defined by admin (e.g., `/public/mediatheque-orgelet`)
- No password required - URL acts as access token
- Only sees items with `Status_Dispo = Disponible` AND `Status_Vente = A donner`

### 2. Gallery Interface

#### Display Rules

| User Type | Visible Items |
|-----------|---------------|
| Family | All items where `Status_Vente = A donner` (hides `A vendre`) |
| Association | Only `Status_Dispo = Disponible` AND `Status_Vente = A donner` |

#### Filters & Sorting
- **Filters:** Type (Livre/CD/Vinyle), Tags/Genre, Author/Artist
- **Sort:** Newest first (Date_Ajout), A-Z (Title), A-Z (Author)
- **Search:** Text search on Title + Author

#### Item Cards
Display:
- Cover image (from Cloudinary)
- Title
- Author/Artist
- Type badge
- Condition (Etat)
- Status indicator:
  - `Disponible` → Green badge + "Réserver" button
  - `Réservé par [Name]` → Orange badge (button disabled)
  - `Réservé par [Name] + X options` → Orange badge with option count
  - If user has an option → Show queue position

### 3. Reservation System

#### States Flow

```
Disponible → Réservé (by User A)
                ↓
         User B adds Option (queue position 1)
         User C adds Option (queue position 2)
                ↓
         If User A cancels → User B auto-promoted to Réservé
                           → User C becomes queue position 1
```

#### Actions by Status

| Current Status | User Action | Result |
|----------------|-------------|--------|
| Disponible | Click "Réserver" | `Status_Dispo = Réservé`, `Reserve_Par = [Name]` |
| Réservé (by other) | Click "Mettre une option" | Add name to `Options_Par` queue |
| Réservé (by self) | Click "Annuler" | If options exist: promote first in queue. Else: `Status_Dispo = Disponible` |
| Option (by self) | Click "Retirer option" | Remove from `Options_Par` queue |

#### Conflict Prevention
- Before any write: verify current `Status_Dispo` matches expected state
- Optimistic UI with rollback on conflict
- Show toast notification on conflict: "Cet item vient d'être réservé par quelqu'un d'autre"

### 4. Personal Dashboard

Accessible via header link "Mes réservations" (family users only).

#### Sections

**Mes réservations**
- List of items where `Reserve_Par = [current user]`
- Action: "Annuler la réservation"
- Visual indicator if item has options (shows count)

**Mes options en attente**
- List of items where user appears in `Options_Par`
- Show queue position (1st, 2nd, etc.)
- Action: "Retirer mon option"

**Réservations avec options**
- List of user's reservations that have options from others
- Shows who is waiting: "Option par: Marie, Jean"
- Purpose: visibility for family discussion

### 5. Export Feature

**Location:** Dashboard page

**Formats:**
- CSV export
- Excel (.xlsx) export

**Export Options:**
1. **Par personne (individuel):** One file per family member with their reservations
2. **Global:** Single file with all reservations, column "Réservé par"

**Columns:** Titre, Auteur/Artiste, Type, Etat, Réservé par, Options par

---

## Ingestion Workflow (n8n)

### Trigger
New image file uploaded to Google Drive folder structure:
```
/Heritage_Ingestion/
  ├── Livres/
  ├── CDs/
  └── Vinyles/
```

### Processing Flow

```
1. [Trigger] New file in Drive subfolder
        ↓
2. [Download] Get image from Drive
        ↓
3. [Detect Type] Infer from folder name (Livres/CDs/Vinyles)
        ↓
4. [Barcode Detection] Attempt EAN-13 reading (OCR/barcode lib)
        ↓
   ┌─────────────────┬──────────────────┐
   ↓ Barcode found   ↓ No barcode       
   ↓                 ↓                  
5a. [API Lookup]    5b. [AI Vision]     
    - Books: Google      OpenAI GPT-4o   
      Books API          Prompt below    
    - Music: Discogs                     
        ↓                 ↓              
   └─────────────────┴──────────────────┘
        ↓
6. [Upload Image] Send to Cloudinary → Get public URL
        ↓
7. [Value Check] If Valeur_Estimee > 50€ → Status_Vente = "A vendre"
                 Else → Status_Vente = "A donner"
        ↓
8. [Create Notion Page] With all extracted metadata
        ↓
9. [Move File] Drive: move to /Heritage_Ingestion/Traité/
```

### AI Vision Prompt (Step 5b)

```
Analyse cette image d'un objet culturel (recto et/ou verso si visible).

Identifie:
- Type: Livre, CD, ou Vinyle
- Titre exact
- Auteur (livre) ou Artiste (musique)
- Année de sortie (si visible ou déductible)
- État physique: Neuf, Très bon, Bon, Acceptable, ou Mauvais
- Estimation prix d'occasion en euros (fourchette basse)
- 3 tags pertinents (genre, style, thématique)

La collection est majoritairement en français avec quelques ouvrages techniques en anglais.

Réponds UNIQUEMENT en JSON valide:
{
  "type": "Livre|CD|Vinyle",
  "titre": "string",
  "auteur_artiste": "string",
  "annee": number|null,
  "etat": "Neuf|Très bon|Bon|Acceptable|Mauvais",
  "valeur_estimee": number,
  "tags": ["string", "string", "string"]
}
```

### Daily Notification Workflow (Separate)

- **Trigger:** Daily at 8:00 AM
- **Action:** Query Notion for items where `Status_Dispo` changed in last 24h
- **Output:** If changes exist, send email summary to admin

---

## API Routes (Next.js)

### Public Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth` | Validate family password, return success + set cookie |
| GET | `/api/items` | List items (filtered by user type) |
| GET | `/api/items/[id]` | Single item details |

### Protected Routes (Family)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/items/[id]/reserve` | Reserve an item |
| DELETE | `/api/items/[id]/reserve` | Cancel reservation |
| POST | `/api/items/[id]/option` | Add option to queue |
| DELETE | `/api/items/[id]/option` | Remove option from queue |
| GET | `/api/dashboard` | Get user's reservations + options |
| GET | `/api/export` | Generate CSV/Excel export |

### Association Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/[slug]/items` | List available items for association |
| POST | `/api/public/[slug]/items/[id]/reserve` | Reserve for association |

---

## Environment Variables

```env
# Notion
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx

# Authentication
FAMILY_PASSWORD=xxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# OpenAI (for n8n, not Next.js)
OPENAI_API_KEY=xxx

# Association slugs (comma-separated: slug:display_name)
ASSOCIATION_SLUGS=mediatheque-orgelet:Médiathèque Orgelet,biblio-lons:Bibliothèque Lons
```

---

## UI/UX Requirements

### Design System
- **Theme:** Light mode default, clean and accessible
- **Colors:** Warm, family-friendly palette
- **Typography:** Clear, readable (system fonts)
- **Mobile-first:** Must work well on phones (family will browse on mobile)

### Key Screens

1. **Login Page** (`/`)
   - Logo/title
   - Password field
   - Name field
   - Submit button
   - Error handling

2. **Gallery Page** (`/gallery`)
   - Header with user name + "Mes réservations" link
   - Filter bar (collapsible on mobile)
   - Grid of item cards
   - Infinite scroll or pagination

3. **Item Modal/Detail**
   - Large image
   - Full metadata
   - Action button (context-dependent)
   - Options queue visibility (if applicable)

4. **Dashboard** (`/dashboard`)
   - Three sections as tabs or accordion
   - Action buttons inline
   - Export buttons at bottom

5. **Association View** (`/public/[slug]`)
   - Simplified header with association name
   - Same gallery component, filtered data
   - Reserve functionality

---

## Non-Functional Requirements

### Performance
- Initial page load < 3s
- Notion API calls cached where possible (ISR or SWR)
- Images optimized via Cloudinary transformations

### Scale
- ~2000 items total
- ~10 concurrent family users max
- Notion API: 3 requests/second limit (implement queue/throttling)

### Security
- Password hashed comparison (not plaintext in client)
- Association URLs use unguessable slugs
- No sensitive data exposed to frontend (Valeur_Estimee hidden)

---

## Development Phases

### Phase 1: Core MVP
- [ ] Next.js project setup with Tailwind + shadcn
- [ ] Notion API integration (read items)
- [ ] Family authentication (password + name)
- [ ] Gallery view with filters
- [ ] Basic reservation (reserve/cancel)

### Phase 2: Options & Dashboard
- [ ] Option queue system
- [ ] Auto-promotion on cancellation
- [ ] Personal dashboard
- [ ] Conflict handling

### Phase 3: Export & Associations
- [ ] CSV/Excel export
- [ ] Association public routes
- [ ] Association-specific URLs

### Phase 4: Ingestion Workflow
- [ ] n8n workflow: Drive trigger
- [ ] Barcode detection
- [ ] Google Books / Discogs integration
- [ ] OpenAI vision fallback
- [ ] Cloudinary upload
- [ ] Notion page creation
- [ ] File move to "Traité"

### Phase 5: Polish
- [ ] Daily notification workflow
- [ ] Mobile optimization
- [ ] Error handling improvements
- [ ] Documentation

---

## File Structure (Suggested)

```
bibliotheque-jpg/
├── app/
│   ├── page.tsx                    # Login
│   ├── gallery/
│   │   └── page.tsx                # Main gallery
│   ├── dashboard/
│   │   └── page.tsx                # User dashboard
│   ├── public/
│   │   └── [slug]/
│   │       └── page.tsx            # Association view
│   └── api/
│       ├── auth/
│       │   └── route.ts
│       ├── items/
│       │   ├── route.ts            # GET list
│       │   └── [id]/
│       │       ├── route.ts        # GET single
│       │       ├── reserve/
│       │       │   └── route.ts    # POST/DELETE
│       │       └── option/
│       │           └── route.ts    # POST/DELETE
│       ├── dashboard/
│       │   └── route.ts
│       ├── export/
│       │   └── route.ts
│       └── public/
│           └── [slug]/
│               └── items/
│                   └── route.ts
├── components/
│   ├── ui/                         # shadcn components
│   ├── ItemCard.tsx
│   ├── ItemModal.tsx
│   ├── FilterBar.tsx
│   ├── Gallery.tsx
│   └── Dashboard/
│       ├── ReservationList.tsx
│       ├── OptionsList.tsx
│       └── ExportButtons.tsx
├── lib/
│   ├── notion.ts                   # Notion client & queries
│   ├── auth.ts                     # Auth utilities
│   └── utils.ts
├── types/
│   └── index.ts                    # TypeScript interfaces
└── n8n/
    └── workflows/
        ├── ingestion.json          # Main ingestion workflow
        └── daily-report.json       # Daily notification
```

---

## Acceptance Criteria

### Authentication
- [ ] User cannot access `/gallery` without valid password
- [ ] User name persists across sessions (cookie)
- [ ] Invalid password shows error message

### Gallery
- [ ] All items with `Status_Vente = A donner` are displayed
- [ ] Filters work correctly (Type, Tags)
- [ ] Sort works (Date, Title, Author)
- [ ] Search finds items by title and author

### Reservations
- [ ] "Réserver" updates Notion and UI immediately
- [ ] Cannot reserve already-reserved item (conflict handling)
- [ ] "Annuler" releases item or promotes first option
- [ ] Options queue displays position correctly

### Dashboard
- [ ] Shows all user's reservations
- [ ] Shows all user's pending options with position
- [ ] Shows reservations that have options from others
- [ ] Export generates valid CSV/Excel files

### Associations
- [ ] Unique URL provides access without password
- [ ] Only shows available items (`Disponible` + `A donner`)
- [ ] Reservation works and shows association name

### Ingestion (n8n)
- [ ] New image triggers workflow
- [ ] Barcode detected → API lookup succeeds
- [ ] No barcode → AI vision extracts metadata
- [ ] Image uploaded to Cloudinary with public URL
- [ ] Notion page created with all fields
- [ ] Original file moved to "Traité" folder
- [ ] Items > 50€ flagged as "A vendre"

---

## Notes for Claude Code

1. **Notion as Database:** Use `@notionhq/client`. All queries go through Notion API. Implement caching strategy for list views.

2. **No traditional auth:** This is intentional. Family trust model. Just validate password server-side and use cookies for name persistence.

3. **Options queue:** Store as comma-separated string in Notion `Options_Par` field. Parse/serialize in application code.

4. **Cloudinary:** Use unsigned uploads from n8n. Store only the public URL in Notion.

5. **Mobile-first:** Family will primarily browse on phones. Test touch interactions.

6. **French UI:** All user-facing text in French. Code/comments in English.

7. **n8n workflows:** Export as JSON for version control. Document webhook URLs needed.

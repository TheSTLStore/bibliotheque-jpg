# Bibliotheque JPG — Contexte complet pour Claude Code

## Resume du projet

Application web unifiee (Next.js 14 PWA) pour cataloguer et distribuer ~2000 objets culturels (livres, CDs, vinyles) dans le cadre d'une succession familiale. Utilisee par <10 personnes (famille proche + associations locales).

**Repo GitHub** : https://github.com/TheSTLStore/bibliotheque-jpg (public)
**Deploiement** : Vercel (auto-deploy sur push main)
**Proprietaire** : TheSTLStore (TheSTLStore@protonmail.com)

## Historique du projet

### Projets V1 (abandonnes)
Deux repos existaient avant cette refonte :
- `bibliotheque-scanner-app/` — App mobile React Native/Expo pour scanner des objets (code ~95% complet mais jamais teste en prod)
- `bibliotheque-jpg/` — App web Next.js avec Notion comme DB pour consultation/reservation

Problemes V1 : deux codebases a maintenir, Notion comme DB (lent, 3 req/s), cles API exposees cote client, React Native overkill pour <10 utilisateurs.

### Refonte V2 (cette session)
Tout a ete refait from scratch en une seule app Next.js le 4-5 avril 2026 :
- Brainstorming complet avec le skill superpowers:brainstorming
- Spec ecrite dans `docs/superpowers/specs/2026-04-04-bibliotheque-jpg-unified-design.md`
- Plan d'implementation dans `docs/superpowers/plans/2026-04-04-bibliotheque-jpg-unified.md`
- 12 tasks implementes via subagent-driven-development (Opus 4.6)

### Ameliorations V2.1 (meme session)
Spec dans `docs/superpowers/specs/2026-04-05-improvements-design.md`
Plan dans `docs/superpowers/plans/2026-04-05-improvements.md`
7 tasks supplementaires : miniatures API, visibilite items, estimation prix, admin ameliore.

---

## Stack technique

| Composant | Technologie | Notes |
|-----------|-------------|-------|
| Framework | Next.js 14.2.35 (App Router) | Pas Next.js 15, attention aux differences d'API |
| Langage | TypeScript strict | |
| DB | Supabase PostgreSQL | Projet: REDACTED |
| Storage | Supabase Storage (bucket `item-images`, public) | |
| Hebergement | Vercel | Auto-deploy sur push main |
| IA Vision | Google Gemini (via @google/genai SDK) | Modele configurable via GEMINI_MODEL env var, defaut: gemini-2.5-flash |
| Lookup livres | Google Books API | NECESSITE une cle API (sans cle = rate limit tres bas ~100/jour) |
| Lookup musique | Discogs API | Token requis |
| Estimation prix | Gemini (au scan) + eBay Browse API (en admin) | eBay optionnel |
| UI | Tailwind CSS + shadcn/ui v2 (new-york style) | Theme dark chaleureux |
| PWA | @ducanh2912/next-pwa | Desactive en dev |
| Barcode | BarcodeDetector API + @zxing/library fallback | |

## Architecture des fichiers

```
bibliotheque-jpg-unified/
├── app/
│   ├── page.tsx                            # Login (mot de passe familial + prenom)
│   ├── layout.tsx                          # Root layout (Inter font, fr, PWA manifest)
│   ├── globals.css                         # Tailwind + custom classes (.card, .btn-primary, etc.)
│   ├── (authenticated)/                    # Route group — layout avec Header + BottomNav
│   │   ├── layout.tsx                      # Header (desktop) + BottomNav (mobile) + Toaster
│   │   ├── galerie/page.tsx                # Catalogue filtrable (visible=true uniquement)
│   │   ├── scanner/page.tsx                # Scan code-barre + photo IA + formulaire
│   │   ├── dashboard/page.tsx              # Mes reservations (voir/supprimer)
│   │   └── admin/page.tsx                  # 3 onglets: Stats, Articles, Reservations
│   ├── public/[slug]/page.tsx              # Vue association (sans auth, slug = acces)
│   └── api/
│       ├── auth/                           # POST login, GET check, POST logout
│       ├── items/route.ts                  # GET (visible=true), POST (visible=false par defaut)
│       ├── items/[id]/reserve/route.ts     # POST reserve, DELETE cancel
│       ├── dashboard/route.ts              # GET reservations par prenom
│       ├── scan/
│       │   ├── lookup/route.ts             # Barcode → Google Books + Discogs en parallele
│       │   ├── vision/route.ts             # Photo → Supabase upload + Gemini analyse
│       │   ├── enrich/route.ts             # Metadata → Gemini (categorie, tags, prix)
│       │   └── upload-external/route.ts    # Re-upload URL externe vers Supabase
│       ├── admin/
│       │   ├── auth/route.ts               # POST admin login (cookie admin_token)
│       │   ├── stats/route.ts              # GET stats globales
│       │   ├── items/route.ts              # GET tous les items (admin, pas de filtre visible)
│       │   ├── items/[id]/route.ts         # PATCH/DELETE item
│       │   ├── items/batch/route.ts        # POST batch (show/hide/localisation/etat)
│       │   ├── reservations/route.ts       # GET reservations (avec localisation)
│       │   ├── export/route.ts             # GET CSV (par personne ou global)
│       │   ├── estimate/route.ts           # POST re-estimation Gemini
│       │   └── ebay-search/route.ts        # POST recherche eBay
│       └── public/[slug]/
│           ├── items/route.ts              # GET items visibles+disponibles pour association
│           └── items/[id]/reserve/route.ts # POST reservation association
├── components/
│   ├── ui/                                 # shadcn/ui (button, card, dialog, input, badge, select, tabs, sonner)
│   ├── Header.tsx                          # Nav desktop (Scanner, Galerie, Mes choix, prenom, logout)
│   ├── BottomNav.tsx                       # Nav mobile (3 onglets)
│   ├── FilterBar.tsx                       # Recherche + filtres type (Tous/Livres/CDs/Vinyles)
│   ├── ItemCard.tsx                        # Carte galerie (image, titre, auteur, badges, compteur reservations)
│   ├── ItemModal.tsx                       # Modal detail item + reservations + bouton reserver
│   ├── ScannerView.tsx                     # Camera + detection barcode + bouton photo
│   ├── ItemForm.tsx                        # Formulaire creation item (avec capture photo inline)
│   ├── AdminItemsTab.tsx                   # Onglet articles admin (table, filtres, selection batch)
│   ├── AdminItemEditModal.tsx              # Modal edition item admin (tous champs + eBay + Gemini)
│   ├── AdminBatchBar.tsx                   # Barre actions batch (visible/masquer/localisation/etat)
│   ├── AdminReservationTable.tsx           # Table reservations admin
│   └── EbayResults.tsx                     # Affichage resultats eBay
├── lib/
│   ├── supabase-server.ts                  # Client Supabase cote serveur (service_role key)
│   ├── supabase-browser.ts                 # Client Supabase cote navigateur (anon key, singleton)
│   ├── auth.ts                             # getSession, createSession, deleteSession, verifyFamilyPassword, verifyAdminPassword, parseAssociationSlugs
│   ├── google-books.ts                     # lookupGoogleBooks(isbn) → LookupResult
│   ├── discogs.ts                          # lookupDiscogs(ean) → DiscogsResult (avec format CD/Vinyle)
│   ├── gemini.ts                           # analyzeImage(base64) + enrichWithAI(metadata) avec valeur_estimee
│   ├── ebay.ts                             # searchEbay(query, isbn?) → EbayResult[]
│   ├── csv.ts                              # generateCsv(rows, columns) avec BOM UTF-8
│   └── utils.ts                            # cn() (tailwind merge) + formatDate()
├── hooks/
│   ├── use-auth.ts                         # useAuth() → authenticated, prenom, login, logout
│   └── use-barcode-scanner.ts              # useBarcodeScanner() → videoRef, barcode, start, stop
├── types/
│   └── index.ts                            # Item, Reservation, ItemWithReservations, Session, LookupResult, VisionResult, EnrichResult
├── middleware.ts                            # Protection routes (public, auth, admin, association)
├── supabase/schema.sql                     # Schema complet + ALTER TABLE V2.1
├── public/manifest.json                    # PWA manifest
└── GUIDE-LANCEMENT.md                      # Guide setup pour nouveau collaborateur
```

## Schema de base de donnees

```sql
-- Enums
item_type: 'Livre', 'CD', 'Vinyle'
item_etat: 'Neuf', 'Tres bon', 'Bon', 'Acceptable', 'Mauvais'
item_status: 'Disponible', 'Donne'

-- Tables
items: id, titre, auteur_artiste, type, categorie, etat, isbn_ean, tags[], annee,
       image_url, localisation, visible (default false), valeur_estimee, status, created_at, updated_at
reservations: id, item_id (FK), prenom, created_at — UNIQUE(item_id, prenom)
sessions: id, prenom, token (UNIQUE), created_at, expires_at

-- Trigger: auto-update updated_at on items
-- Indexes: items(type), items(status), reservations(item_id), reservations(prenom), sessions(token)
-- Storage: bucket 'item-images' (public)
```

## Authentification

- **Famille** : mot de passe partage (`FAMILY_PASSWORD`) + prenom → cookie `session_token` (httpOnly, 1 an)
- **Admin** : mot de passe admin separe (`ADMIN_PASSWORD`) → cookie `admin_token` (24h). Necessite aussi d'etre authentifie famille
- **Associations** : URL `/public/[slug]` sans auth, slug valide dans `ASSOCIATION_SLUGS` env var

## Flux de scan

```
1. Camera ouverte → detection barcode continue (BarcodeDetector ou zxing)
2. Barcode detecte → POST /api/scan/lookup
   → Google Books + Discogs appeles EN PARALLELE
   → Type auto-detecte : Discogs trouvee = CD/Vinyle, Google Books seule = Livre
   → Image API re-uploadee vers Supabase Storage cote serveur
3. Enrichissement IA → POST /api/scan/enrich
   → Gemini genere : categorie precise, 3 tags, estimation prix
4. Formulaire pre-rempli affiche
   → Image API affichee si trouvee, sinon bouton "Ajouter une photo"
   → Utilisateur remplit uniquement : localisation + etat
5. Sauvegarde → POST /api/items (visible=false par defaut)
```

**Flux alternatif (photo IA)** :
- Pas de barcode → bouton "Photo (IA)" → capture → upload Supabase + Gemini Vision → formulaire pre-rempli

## Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://REDACTED.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Auth
FAMILY_PASSWORD=REDACTED
ADMIN_PASSWORD=REDACTED

# Associations
ASSOCIATION_SLUGS=mediatheque-orgelet:Mediatheque Orgelet,biblio-lons:Bibliotheque Lons

# APIs
GEMINI_API_KEY=REDACTED
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_BOOKS_API_KEY=REDACTED
DISCOGS_TOKEN=REDACTED

# eBay (optionnel)
EBAY_APP_ID=
EBAY_CERT_ID=
```

## Bugs rencontres et solutions

### 1. Admin accessible sans mot de passe (CRITIQUE)
**Probleme** : `useState(!showLogin)` dans la page admin — si on accedait directement `/admin` sans `?login=true`, `adminAuth` etait `true` d'office.
**Fix** : Change en `useState(false)` pour toujours demander le mot de passe.
**Fichier** : `app/(authenticated)/admin/page.tsx`

### 2. Logout ne redirige pas
**Probleme** : Le hook `useAuth.logout()` supprimait l'etat mais ne redirigeait pas vers `/`.
**Fix** : Ajout `window.location.href = "/"` apres la suppression de session.
**Fichier** : `hooks/use-auth.ts`

### 3. Camera ne s'affiche pas sur mobile
**Probleme** : Race condition — `start()` essayait d'attacher le stream video AVANT que l'element `<video>` soit rendu dans le DOM (car `isActive` etait mis a `true` apres l'assignation).
**Fix** : `setIsActive(true)` d'abord pour rendre le `<video>`, puis un `useEffect` qui attache le stream quand les deux sont disponibles.
**Fichier** : `hooks/use-barcode-scanner.ts`

### 4. Modele Gemini fragile
**Probleme** : Le nom du modele Gemini etait hardcode et pouvait devenir obsolete.
**Fix** : Modele configurable via `GEMINI_MODEL` env var, defaut `gemini-2.5-flash` (stable GA).
**Fichier** : `lib/gemini.ts`

### 5. Images Google Books ne s'affichent pas
**Probleme** : URLs Google Books en HTTP (bloquees sur HTTPS), rate limit sans cle API (429 apres ~100 req), et le code uploadait la photo camera au lieu de l'image API.
**Fix** : Re-upload des images externes cote serveur dans `/api/scan/lookup` avec force HTTPS. Ajout d'une cle API Google Books. Photo camera uniquement si pas d'image API.
**Fichiers** : `app/api/scan/lookup/route.ts`, `lib/google-books.ts`

### 6. Google Books rate limit (429)
**Probleme** : Sans cle API, Google utilise un projet partage avec limite tres basse (~100 req/jour).
**Fix** : L'utilisateur a cree une cle API Google Books gratuite (1000 req/jour).
**Config** : `GOOGLE_BOOKS_API_KEY` dans `.env.local` et Vercel.

### 7. CDs classes comme Livres
**Probleme** : Le lookup essayait Google Books en premier — si un CD avait un ISBN, il etait trouve comme livre.
**Fix** : Les deux APIs (Google Books + Discogs) sont appelees en parallele. Si Discogs trouve = musique (CD/Vinyle determine par le champ format Discogs). Si seulement Google Books trouve = Livre.
**Fichiers** : `app/api/scan/lookup/route.ts`, `lib/discogs.ts`

### 8. Vercel deployment bloque
**Probleme** : "Commit author does not have contributing access" — les commits etaient signes par `kevin.girard.dev` mais le projet Vercel appartient a `TheSTLStore`. Plan Hobby ne permet pas la collaboration sur repos prives.
**Fix** : Repo passe en public. Historique git reecrit avec `git filter-branch` pour mettre `TheSTLStore` comme auteur.

### 9. shadcn/ui v4 incompatible avec Next.js 14
**Probleme** : shadcn v4 genere des composants base-nova incompatibles avec Next.js 14 / Tailwind v3.
**Fix** : Utilise shadcn v2.5.0 avec le style `new-york`.

## Ce qui fonctionne

- Login famille + session cookie
- Scanner barcode (BarcodeDetector + zxing fallback)
- Lookup Google Books + Discogs en parallele avec detection de type
- Vision IA Gemini (identification par photo)
- Enrichissement IA (categorie, tags, estimation prix)
- Re-upload images API vers Supabase Storage
- Photo capture dans le formulaire si pas d'image API
- Galerie filtrable (type, recherche) — visible items only
- Reservations multiples (visible par tous, supprimable par chacun)
- Dashboard personnel
- Admin: 3 onglets (Stats, Articles avec batch, Reservations avec CSV)
- Edition item en admin (tous champs + eBay + Gemini re-estimation)
- Batch actions (visible/masquer/localisation/etat)
- Acces associations via `/public/[slug]`
- PWA installable
- Deploy Vercel auto

## Ce qui n'est PAS encore teste/fait

- eBay Browse API (cles EBAY_APP_ID et EBAY_CERT_ID non configurees)
- Test avec un volume important d'items (~2000)
- Test complet du scan Discogs (CD/Vinyle barcode)
- PWA offline (volontairement non implemente — message d'erreur si pas de reseau)
- Migration des items V1 depuis Notion (pas applicable — rien n'etait scanne)

## Commandes utiles

```bash
# Dev
cd bibliotheque-jpg-unified && npm run dev

# Build
npm run build

# Verifier l'API Google Books
curl "https://www.googleapis.com/books/v1/volumes?q=isbn:9782253004226&key=VOTRE_CLE"

# Schema SQL a executer dans Supabase (si nouveau projet)
# → Copier supabase/schema.sql dans le SQL Editor

# Git push vers Vercel
git push origin master:main
```

## Preferences utilisateur

- Utiliser Opus 4.6 pour tous les agents
- Approche brainstorming → spec → plan → subagent-driven-development
- Interface en francais, code en anglais
- Securite light (famille proche, <10 personnes)
- Theme dark chaleureux (#1a1a2e fond, #e8d5b7 accent)

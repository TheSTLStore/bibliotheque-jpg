# Bibliothèque JPG — Améliorations V2.1

## 1. Priorité des miniatures

### Problème actuel
La photo caméra écrase toujours l'image API. Les URLs Google Books sont en HTTP (bloquées sur HTTPS), et les domaines d'images ne sont pas tous dans next.config.mjs. Résultat : pas de miniatures.

### Nouveau flux

Le re-upload des images externes se fait **côté serveur dans la route `/api/scan/lookup`**, pas côté client.

```
Code-barre détecté
  → POST /api/scan/lookup
    → Google Books / Discogs retourne image_url ?
       OUI → Serveur télécharge l'image externe
             → Re-upload vers Supabase Storage
             → Retourne l'URL Supabase au client
       NON → image_url = null
  → Client reçoit formulaire pré-rempli
    → Image présente ? Affichée depuis Supabase (HTTPS, fiable)
    → Pas d'image ? Bouton "Prendre une photo" dans le formulaire
```

### Modifications

**`app/api/scan/lookup/route.ts`** :
- Après lookup, si `result.image_url` existe, télécharger l'image et l'uploader vers Supabase Storage
- Remplacer l'URL externe par l'URL Supabase dans la réponse
- Importer `createServerClient` pour l'upload

**`app/(authenticated)/scanner/page.tsx`** :
- `handleBarcodeDetected` : ne plus capturer de photo automatiquement au scan
- `ScannerView.onBarcodeDetected` : signature revient à `(barcode: string) => void`
- Si le lookup retourne `image_url = null`, le formulaire affiche un bouton "Prendre une photo"
- Supprimer le re-upload côté client dans `handleSubmit` (plus nécessaire)

**`components/ScannerView.tsx`** :
- Retirer la capture photo automatique au moment du barcode detect
- Revenir à `onBarcodeDetected: (barcode: string) => void`

**`components/ItemForm.tsx`** :
- Si `image_url` est vide, afficher un bouton "Ajouter une photo" qui ouvre la caméra
- Nouveau prop optionnel `onCapturePhoto: (base64: string) => Promise<string>` pour l'upload

**`next.config.mjs`** :
- Pas besoin d'ajouter des domaines supplémentaires puisque toutes les images passent par Supabase

---

## 2. Visibilité des items + Admin amélioré

### Nouveau champ DB

```sql
ALTER TABLE items ADD COLUMN visible BOOLEAN NOT NULL DEFAULT false;
```

### Galerie publique

- `GET /api/items` : ajouter filtre `.eq("visible", true)`
- `GET /api/public/[slug]/items` : idem, ne montre que les items visibles ET disponibles
- Items scannés arrivent masqués par défaut

### TypeScript

Ajouter `visible: boolean` à l'interface `Item` dans `types/index.ts`.

### Admin — Nouvel onglet "Articles"

L'admin passe de une seule vue à **3 onglets** :

```
Panel Admin (onglets)
├── Stats          — existant, inchangé
├── Articles       — NOUVEAU
│   ├── Filtres : type, recherche, visibilité (Tous/Visibles/Masqués)
│   ├── Liste de TOUS les items avec colonnes :
│   │   miniature, titre, auteur, type, état, estimation Gemini,
│   │   localisation, badge visible/masqué
│   ├── Checkboxes de sélection (checkbox "tout sélectionner" en en-tête)
│   ├── Barre d'actions batch (apparaît quand >= 1 item sélectionné) :
│   │   ├── "Rendre visible (X)"
│   │   ├── "Masquer (X)"
│   │   ├── "Changer localisation (X)" → input texte
│   │   └── "Changer état (X)" → select 5 options
│   ├── Clic sur un item → Modal d'édition :
│   │   ├── Tous les champs modifiables (titre, auteur, type,
│   │   │   catégorie, état, année, localisation, tags, visibilité)
│   │   ├── Estimation Gemini affichée + bouton "Recalculer"
│   │   ├── Bouton "Rechercher eBay" → affiche résultats
│   │   ├── Champ valeur estimée (modifiable manuellement)
│   │   └── Bouton supprimer
│   └── Bouton "Rechercher eBay" inline par item
└── Réservations   — existant (filtre par personne + export CSV)
```

### Nouvelles API routes admin

```
GET    /api/admin/items              → Tous les items (avec localisation, visible)
                                       Query params: type, search, visible (true/false/all)
PATCH  /api/admin/items/[id]         → Modifier un item (tous les champs)
DELETE /api/admin/items/[id]         → Supprimer un item
POST   /api/admin/items/batch        → Actions batch
                                       Body: { ids: [...], action: "show"|"hide"|"localisation"|"etat", value?: string }
POST   /api/admin/ebay-search        → Recherche eBay Browse API
                                       Body: { titre, auteur_artiste, isbn_ean, type }
                                       Retourne: [{ titre, prix, lien, image }] (max 5)
POST   /api/admin/estimate           → Re-estimer prix via Gemini
                                       Body: { titre, auteur_artiste, type, etat }
                                       Retourne: { valeur_estimee: number }
```

### Nouveaux composants

- `components/AdminItemsTab.tsx` — onglet articles avec liste, filtres, sélection batch
- `components/AdminItemEditModal.tsx` — modal d'édition individuelle d'un item
- `components/AdminBatchBar.tsx` — barre d'actions batch
- `components/EbayResults.tsx` — affichage des résultats eBay

---

## 3. Estimation de prix

### Au scan (Gemini)

Le prompt d'enrichissement existant (`/api/scan/enrich`) est étendu pour inclure une estimation de prix :

```json
{
  "categorie": "Roman policier",
  "tags": ["poche", "français", "thriller"],
  "valeur_estimee": 3.50
}
```

Le prompt Gemini demande : "Estime le prix de revente d'occasion en euros pour cet objet dans cet état. Retourne un nombre décimal."

### Nouveau champ DB

```sql
ALTER TABLE items ADD COLUMN valeur_estimee DECIMAL;
```

Ajouté à l'interface TypeScript `Item`.

### En admin (eBay Browse API)

**Setup eBay** :
- Créer un compte développeur sur developer.ebay.com
- Créer une application → récupérer App ID + Cert ID
- OAuth2 client credentials flow pour obtenir un access token

**Nouveau client** : `lib/ebay.ts`
- `searchEbay(query, condition?)` → appelle `GET /buy/browse/v1/item_summary/search`
- Filtre par mots-clés (titre + auteur) et optionnellement par ISBN/EAN
- Retourne les 5 premiers résultats avec titre, prix, URL, image

**Variables d'environnement** :
```
EBAY_APP_ID=xxx
EBAY_CERT_ID=xxx
```

### Flux en admin

```
Item dans la liste admin
  → Estimation Gemini affichée (ex: "~3.50€")
  → Clic "Rechercher eBay"
    → POST /api/admin/ebay-search
    → 5 résultats affichés dans un panel
    → L'admin voit les prix réels du marché
    → Peut mettre à jour manuellement la valeur estimée
```

---

## Résumé des modifications DB

```sql
ALTER TABLE items ADD COLUMN visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE items ADD COLUMN valeur_estimee DECIMAL;
```

## Nouvelles variables d'environnement

```
EBAY_APP_ID=xxx
EBAY_CERT_ID=xxx
```

## Fichiers impactés

### Modifiés
- `supabase/schema.sql` — nouveaux champs
- `types/index.ts` — visible + valeur_estimee
- `app/api/scan/lookup/route.ts` — re-upload image serveur
- `app/api/items/route.ts` — filtre visible=true
- `app/api/public/[slug]/items/route.ts` — filtre visible=true
- `app/(authenticated)/scanner/page.tsx` — nouveau flux image
- `components/ScannerView.tsx` — retirer capture auto barcode
- `components/ItemForm.tsx` — bouton "Ajouter photo" si pas d'image
- `app/(authenticated)/admin/page.tsx` — 3 onglets, gestion articles
- `lib/gemini.ts` — estimation prix dans enrichWithAI
- `app/api/scan/enrich/route.ts` — retourne valeur_estimee
- `.env.example` — variables eBay

### Nouveaux
- `lib/ebay.ts` — client eBay Browse API
- `app/api/admin/items/route.ts` — GET tous les items admin
- `app/api/admin/items/[id]/route.ts` — PATCH/DELETE item
- `app/api/admin/items/batch/route.ts` — actions batch
- `app/api/admin/ebay-search/route.ts` — recherche eBay
- `app/api/admin/estimate/route.ts` — re-estimation Gemini
- `components/AdminItemsTab.tsx` — onglet articles
- `components/AdminItemEditModal.tsx` — modal édition
- `components/AdminBatchBar.tsx` — barre actions batch
- `components/EbayResults.tsx` — résultats eBay

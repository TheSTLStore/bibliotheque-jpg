# Bibliotheque JPG - Guide de lancement

## Contexte du projet

Application web unifiee (Next.js 14 PWA) pour cataloguer et distribuer ~2000 objets culturels (livres, CDs, vinyles) dans le cadre d'une succession familiale. Utilisee par <10 personnes (famille + associations locales).

**Le code est ecrit et build avec succes.** Il reste la configuration des services externes et le premier lancement.

---

## Etape 1 : Creer le projet Supabase

1. Aller sur https://supabase.com et creer un compte gratuit
2. Creer un nouveau projet (region : Europe West pour la France)
3. **Noter** les informations suivantes (dans Project Settings > API) :
   - `Project URL` → c'est le `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → c'est le `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → c'est le `SUPABASE_SERVICE_ROLE_KEY`

## Etape 2 : Executer le schema SQL

1. Dans Supabase, aller dans **SQL Editor**
2. Copier-coller le contenu du fichier `supabase/schema.sql` (reproduit ci-dessous)
3. Cliquer sur **Run**

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE item_type AS ENUM ('Livre', 'CD', 'Vinyle');
CREATE TYPE item_etat AS ENUM ('Neuf', 'Tres bon', 'Bon', 'Acceptable', 'Mauvais');
CREATE TYPE item_status AS ENUM ('Disponible', 'Donne');

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  auteur_artiste TEXT NOT NULL,
  type item_type NOT NULL,
  categorie TEXT,
  etat item_etat NOT NULL,
  isbn_ean TEXT,
  tags TEXT[] DEFAULT '{}',
  annee INTEGER,
  image_url TEXT,
  localisation TEXT,
  status item_status NOT NULL DEFAULT 'Disponible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, prenom)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prenom TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_reservations_item_id ON reservations(item_id);
CREATE INDEX idx_reservations_prenom ON reservations(prenom);
CREATE INDEX idx_sessions_token ON sessions(token);
```

## Etape 3 : Creer le bucket de stockage images

1. Dans Supabase, aller dans **Storage**
2. Cliquer sur **New Bucket**
3. Nom : `item-images`
4. Cocher **Public bucket** (les images doivent etre accessibles sans auth)
5. Cliquer sur Create

### Configurer la policy du bucket

Dans Storage > item-images > Policies, ajouter ces policies :

**Policy 1 - Lecture publique :**
- Name: `Public read access`
- Allowed operation: SELECT
- Target roles: anon, authenticated
- Policy: `true`

**Policy 2 - Upload avec service role :**
- Name: `Service role upload`
- Allowed operation: INSERT
- Target roles: service_role
- Policy: `true`

> Ou plus simplement, dans le SQL Editor :
```sql
CREATE POLICY "Public read item-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'item-images');

CREATE POLICY "Service role upload item-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'item-images');
```

## Etape 4 : Obtenir les cles API

### Gemini API (obligatoire pour le scan par photo)
1. Aller sur https://aistudio.google.com/apikey
2. Creer une cle API
3. C'est le `GEMINI_API_KEY`

### Discogs (obligatoire pour le scan CD/vinyle par code-barre)
1. Creer un compte sur https://www.discogs.com
2. Aller dans Settings > Developers > Generate new token
3. C'est le `DISCOGS_TOKEN`

### Google Books (optionnel)
- L'API Google Books fonctionne sans cle (avec des limites de rate)
- Pour un usage intensif : https://console.cloud.google.com > APIs & Services > Credentials
- C'est le `GOOGLE_BOOKS_API_KEY` (laisser vide si pas necessaire)

## Etape 5 : Configurer le fichier .env.local

Dans le dossier `bibliotheque-jpg-unified/`, creer un fichier `.env.local` :

```env
# Supabase (depuis l'etape 1)
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...votre-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...votre-service-role-key...

# Auth - choisir vos mots de passe
FAMILY_PASSWORD=le-mot-de-passe-pour-la-famille
ADMIN_PASSWORD=le-mot-de-passe-admin

# Associations (format slug:Nom Affiche, separes par des virgules)
ASSOCIATION_SLUGS=mediatheque-orgelet:Mediatheque Orgelet,biblio-lons:Bibliotheque Lons

# APIs (depuis l'etape 4)
GEMINI_API_KEY=votre-cle-gemini
DISCOGS_TOKEN=votre-token-discogs
GOOGLE_BOOKS_API_KEY=
```

## Etape 6 : Lancer le projet

```bash
cd bibliotheque-jpg-unified
npm run dev
```

Ouvrir http://localhost:3000

### Test rapide :
1. **Login** : entrer un prenom + le mot de passe familial choisi
2. **Scanner** : aller sur l'onglet Scanner, ouvrir la camera, scanner un livre
3. **Galerie** : verifier que l'objet scanne apparait
4. **Reservation** : cliquer sur un objet, reserver, verifier dans le dashboard
5. **Admin** : aller sur /admin, entrer le mot de passe admin, verifier les stats

---

## Architecture du projet

```
bibliotheque-jpg-unified/
├── app/
│   ├── page.tsx                    # Page de login
│   ├── layout.tsx                  # Layout racine
│   ├── (authenticated)/            # Pages protegees
│   │   ├── layout.tsx              # Layout avec nav (Header + BottomNav)
│   │   ├── galerie/page.tsx        # Catalogue filtrable
│   │   ├── scanner/page.tsx        # Scanner camera + formulaire
│   │   ├── dashboard/page.tsx      # Mes reservations
│   │   └── admin/page.tsx          # Panel admin
│   ├── public/[slug]/page.tsx      # Vue association (sans auth)
│   └── api/                        # 15 routes API
│       ├── auth/                   # Login, check, logout
│       ├── items/                  # CRUD items + reservations
│       ├── scan/                   # Lookup (code-barre) + Vision (IA)
│       ├── dashboard/              # Reservations par personne
│       ├── admin/                  # Stats, export CSV, reservations
│       └── public/[slug]/          # API associations
├── components/                     # Composants React
├── hooks/                          # use-auth, use-barcode-scanner
├── lib/                            # Clients API (Supabase, Gemini, Google Books, Discogs)
├── types/                          # Types TypeScript
└── supabase/schema.sql             # Schema de la DB
```

## Pages et acces

| Route | Description | Auth |
|-------|-------------|------|
| `/` | Login (mot de passe + prenom) | Non |
| `/galerie` | Catalogue avec filtres et reservation | Oui |
| `/scanner` | Scanner code-barre / photo IA | Oui |
| `/dashboard` | Mes reservations (voir/supprimer) | Oui |
| `/admin` | Stats, localisations, export CSV | Oui + mdp admin |
| `/public/[slug]` | Vue association (items disponibles) | Non (slug = acces) |

## Stack technique

- **Next.js 14** (App Router) + TypeScript
- **Supabase** (PostgreSQL + Storage)
- **Tailwind CSS** + shadcn/ui (theme dark chaleureux)
- **Gemini 3 Flash Preview** (vision IA)
- **Google Books API** + **Discogs API** (lookup code-barre)
- **PWA** installable sur mobile

---

## Deploiement sur Vercel

1. Pusher le code sur un repo GitHub
2. Aller sur https://vercel.com, importer le repo
3. Configurer les variables d'environnement (memes que .env.local)
4. Deployer

---

## En cas de bug de code

**Important** : cette application a ete construite par Claude Code (Opus 4.6). Le code build correctement mais n'a pas encore ete teste en conditions reelles avec de vrais services Supabase/Gemini.

Si tu rencontres un bug :

1. **Note le message d'erreur exact** (console navigateur ou terminal serveur)
2. **Identifie le fichier et la ligne concernes** si possible
3. **Formule un prompt a redonner a Claude Code**, par exemple :

```
Dans le projet bibliotheque-jpg-unified, j'ai cette erreur :
[coller l'erreur]

Ca se produit quand je [decrire l'action].
Le fichier concerne semble etre [fichier].

Peux-tu corriger ?
```

4. Donne ce prompt a Claude Code qui a le contexte complet du projet

### Bugs probables a anticiper :

| Probleme potentiel | Cause probable | Fichier |
|---|---|---|
| Erreur Supabase "relation does not exist" | Schema SQL pas execute | `supabase/schema.sql` |
| Erreur Storage "bucket not found" | Bucket `item-images` pas cree | Dashboard Supabase |
| Erreur Storage "policy violation" | Policies de bucket manquantes | Voir etape 3 |
| Erreur Gemini "model not found" | Nom du modele change | `lib/gemini.ts` ligne 21 |
| Camera ne s'ouvre pas | Pas en HTTPS (requis sauf localhost) | Normal en dev |
| Images ne s'affichent pas | Domaine pas dans next.config.mjs | `next.config.mjs` |
| `params` async error (Next.js) | Next.js 14 requiert await sur params | Routes API `[id]` et `[slug]` |

---

## Recapitulatif des etapes

- [ ] Creer le projet Supabase
- [ ] Executer le schema SQL
- [ ] Creer le bucket `item-images` + policies
- [ ] Obtenir la cle Gemini API
- [ ] Obtenir le token Discogs
- [ ] Creer le fichier `.env.local`
- [ ] `npm run dev` et tester
- [ ] (Optionnel) Deployer sur Vercel

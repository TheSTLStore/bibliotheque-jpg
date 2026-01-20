# TODO - Authentication System

Cette branche contient le système d'authentification simplifié (trust-based) pour la famille et les associations.

## Configuration

- [ ] Ajouter `FAMILY_PASSWORD` à `.env.example`
- [ ] Ajouter `ASSOCIATION_SLUGS` à `.env.example` (format: `slug:DisplayName,slug2:Name2`)
- [ ] Documenter le format des slugs d'association

## TypeScript Types

- [ ] Définir `AuthUser` interface dans `types/index.ts`
- [ ] Définir `AssociationConfig` interface
- [ ] Créer types pour les réponses d'authentification
- [ ] Créer enum pour les types d'utilisateurs (Family, Association)

## Core Auth Utilities (`lib/auth.ts`)

### Family Authentication

- [ ] `validateFamilyPassword(password: string)` - Vérifier mot de passe famille
- [ ] `setFamilyNameCookie(name: string)` - Créer cookie avec nom famille
- [ ] `getFamilyNameFromCookie()` - Récupérer nom depuis cookie
- [ ] `clearFamilyNameCookie()` - Supprimer cookie (logout)
- [ ] Implémenter hash comparison (bcrypt ou similaire)

### Association Authentication

- [ ] `parseAssociationSlugs()` - Parser ASSOCIATION_SLUGS env variable
- [ ] `validateAssociationSlug(slug: string)` - Vérifier slug valide
- [ ] `getAssociationName(slug: string)` - Récupérer nom display depuis slug
- [ ] `isValidAssociation(slug: string)` - Check si slug existe

### User Context

- [ ] `getCurrentUser(request: NextRequest)` - Identifier user depuis request
- [ ] `getUserType()` - Retourner "family" ou "association"
- [ ] `requireAuth()` - Middleware helper pour routes protégées
- [ ] `requireFamilyAuth()` - Middleware pour routes famille uniquement

## API Routes

### `/api/auth/route.ts`

- [ ] POST - Authentification famille
  - [ ] Valider password
  - [ ] Valider nom (non-vide, max length)
  - [ ] Créer cookie
  - [ ] Retourner success + user info
  - [ ] Gérer erreurs (wrong password, missing fields)

### `/api/auth/logout/route.ts`

- [ ] POST - Logout famille
  - [ ] Supprimer cookie
  - [ ] Retourner success

### `/api/auth/check/route.ts`

- [ ] GET - Vérifier session active
  - [ ] Lire cookie
  - [ ] Retourner user info ou null

## Cookie Management

- [ ] Définir cookie options (httpOnly: false pour accès client)
- [ ] Définir maxAge (1 an)
- [ ] Définir path (/)
- [ ] Implémenter secure flag pour production
- [ ] Implémenter sameSite policy

## Middleware (`middleware.ts`)

- [ ] Créer middleware Next.js pour routes protégées
- [ ] Rediriger vers `/` si pas authentifié
- [ ] Autoriser routes publiques (`/public/[slug]`)
- [ ] Autoriser routes API publiques
- [ ] Gérer cas association (vérifier slug valide)

### Routes Protégées

```typescript
const protectedRoutes = [
  '/gallery',
  '/dashboard',
  '/api/items',
  '/api/dashboard',
  '/api/export'
];
```

## Login Page (`app/page.tsx`)

- [ ] Créer formulaire login
  - [ ] Input password (type="password")
  - [ ] Input nom (type="text", placeholder="Ton prénom")
  - [ ] Submit button
  - [ ] Error display
  - [ ] Loading state
- [ ] Appeler `/api/auth` au submit
- [ ] Rediriger vers `/gallery` au success
- [ ] Gérer erreurs réseau
- [ ] Valider inputs côté client

## Association Public Routes

### Page `/app/public/[slug]/page.tsx`

- [ ] Valider slug dans params
- [ ] Afficher nom association dans header
- [ ] Rediriger vers 404 si slug invalide
- [ ] Passer slug en context pour API calls

### API Route `/app/api/public/[slug]/items/route.ts`

- [ ] GET - Lister items disponibles pour association
  - [ ] Valider slug
  - [ ] Filtrer: `Status_Dispo = Disponible` AND `Status_Vente = A donner`
  - [ ] Retourner liste

## Security

- [ ] NEVER exposer le password en clair dans le frontend
- [ ] Valider tous les inputs côté serveur
- [ ] Implémenter rate limiting sur `/api/auth` (max 5 tentatives/min)
- [ ] Logger tentatives de login échouées
- [ ] Sanitiser le nom utilisateur (XSS prevention)
- [ ] Vérifier longueur max du nom (< 50 caractères)

## Error Handling

- [ ] Gérer password incorrect (401)
- [ ] Gérer champs manquants (400)
- [ ] Gérer session expirée (redirect to login)
- [ ] Gérer slug invalide (404)
- [ ] Messages d'erreur en français pour l'UI

## Testing

- [ ] Tester login avec bon password
- [ ] Tester login avec mauvais password
- [ ] Tester champs vides
- [ ] Tester persistance cookie après refresh
- [ ] Tester logout
- [ ] Tester accès routes protégées sans auth
- [ ] Tester validation slug association
- [ ] Tester slug invalide

## Documentation

- [ ] Documenter le flow d'authentification famille
- [ ] Documenter le flow association (URL-based)
- [ ] Expliquer pourquoi httpOnly: false
- [ ] Guide: comment ajouter une nouvelle association
- [ ] Guide: comment changer le mot de passe famille

## Notes Techniques

### Cookie Structure

```typescript
// Next.js cookie options
const cookieOptions = {
  name: 'familyName',
  value: userName,
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: '/',
  httpOnly: false, // Allow client-side access
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const
};
```

### Association Slugs Parsing

```typescript
// From env: "mediatheque-orgelet:Médiathèque Orgelet,biblio-lons:Bibliothèque Lons"
function parseAssociationSlugs(): Map<string, string> {
  const slugsEnv = process.env.ASSOCIATION_SLUGS || '';
  const map = new Map<string, string>();

  slugsEnv.split(',').forEach(pair => {
    const [slug, name] = pair.split(':');
    if (slug && name) {
      map.set(slug.trim(), name.trim());
    }
  });

  return map;
}
```

### Middleware Pattern

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (pathname.startsWith('/public/')) {
    return NextResponse.next();
  }

  // Check family auth for protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const familyName = request.cookies.get('familyName')?.value;
    if (!familyName) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}
```

## Dépendances

```json
{
  "bcryptjs": "^2.4.3",
  "@types/bcryptjs": "^2.4.6"
}
```

## Points d'Attention

1. **Pas de comptes utilisateurs** - C'est intentionnel, système basé sur la confiance
2. **httpOnly: false** - Nécessaire pour que le client puisse lire le nom pour l'UI
3. **Slug = Auth pour associations** - L'URL elle-même est le "secret"
4. **Validation server-side obligatoire** - Jamais faire confiance au client

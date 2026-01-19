# Bibliothèque JPG - Claude Code Instructions

## MCP Servers (Model Context Protocol)

Ce projet utilise 3 MCP servers pour interagir directement avec les services externes.

### Configuration

Les MCP sont configurés dans `.claude/mcp.json`. **Avant de commencer, remplace les clés API :**

```bash
# Dans .claude/mcp.json, remplace :
# - "secret_XXX..." par ta clé Notion (notion.so/my-integrations)
# - "YOUR_N8N_API_KEY_HERE" par ta clé n8n (Settings → API dans ton instance)
```

### MCP disponibles

| MCP | Package | Utilité |
|-----|---------|---------|
| **notion** | `@modelcontextprotocol/server-notion` | Lire/écrire dans la DB Notion |
| **n8n-mcp** | `n8n-mcp` | Documentation des 1084 nodes n8n, validation workflows |
| **n8n-server** | `@leonardsellem/n8n-mcp-server` | Gérer les workflows sur ton instance n8n |

### Utilisation

Une fois configurés, tu peux demander à Claude Code :

**Notion :**
- "Liste les databases dans mon workspace Notion"
- "Crée une page de test dans Bibliotheque_JPG"
- "Montre-moi le schéma de la database"

**n8n (documentation) :**
- "Quels nodes existent pour Google Drive ?"
- "Comment configurer un node OpenAI Vision ?"
- "Valide ce workflow JSON"

**n8n (instance) :**
- "Liste mes workflows actifs"
- "Crée un nouveau workflow vide nommé heritage-ingestion"
- "Montre les dernières exécutions"

### Obtenir les clés API

**Notion API Key :**
1. Va sur https://www.notion.so/my-integrations
2. Crée une intégration "Bibliothèque JPG"
3. Copie le "Internal Integration Token" (commence par `secret_`)
4. Partage ta database avec l'intégration

**n8n API Key :**
1. Va sur https://n8n.srv859352.hstgr.cloud
2. Settings → API (dans le menu utilisateur)
3. "Create API Key"
4. Copie la clé générée

---

## Project Context

Application web pour cataloguer et distribuer ~2000 objets culturels (livres, CDs, vinyles) issus d'une succession familiale. Les membres de la famille réservent des items, puis le reste est ouvert aux associations.

**Owner:** Kevin - Ingénieur CVC, développeur side-projects, expert n8n  
**Stack:** Next.js 14 (App Router) + Notion API + n8n + Cloudinary  
**Langue UI:** Français | **Code/Comments:** English

---

## Quick Reference

### Key Files
- `PRD.md` - Product Requirements Document complet
- `docs/NOTION_SCHEMA.md` - Schéma détaillé de la base Notion
- `.env.example` - Variables d'environnement requises

### Commands
```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint check

# Notion
# Database ID will be provided in .env
```

### External Services
| Service | Purpose | Dashboard |
|---------|---------|-----------|
| Notion | Database & CMS | notion.so |
| Cloudinary | Image hosting | cloudinary.com |
| n8n | Automation workflows | n8n.srv859352.hstgr.cloud |
| Vercel | Deployment | vercel.com |

---

## Code Conventions

### Project Structure
```
app/
├── page.tsx                 # Login (/)
├── gallery/page.tsx         # Main gallery (/gallery)
├── dashboard/page.tsx       # User dashboard (/dashboard)
├── public/[slug]/page.tsx   # Association view (/public/[slug])
└── api/                     # API routes
components/
├── ui/                      # shadcn/ui components
├── ItemCard.tsx
├── ItemModal.tsx
└── ...
lib/
├── notion.ts                # Notion client & queries
├── auth.ts                  # Auth utilities
└── utils.ts                 # Helpers (cn, etc.)
types/
└── index.ts                 # TypeScript interfaces
```

### Naming Conventions
- **Components:** PascalCase (`ItemCard.tsx`)
- **Utilities:** camelCase (`formatDate.ts`)
- **API routes:** lowercase (`route.ts`)
- **CSS classes:** Tailwind only, no custom CSS files
- **Notion properties:** French with underscores (`Status_Dispo`, `Reserve_Par`)

### TypeScript
```typescript
// Always define interfaces in types/index.ts
export interface HeritageItem {
  id: string;
  titre: string;
  auteur_artiste: string;
  type: 'Livre' | 'CD' | 'Vinyle';
  etat: 'Neuf' | 'Très bon' | 'Bon' | 'Acceptable' | 'Mauvais';
  status_dispo: 'Disponible' | 'Réservé' | 'Option' | 'Donné';
  reserve_par: string | null;
  options_par: string[]; // Parsed from comma-separated
  image_url: string;
  tags: string[];
  annee: number | null;
  date_ajout: string;
}
```

### Component Pattern
```typescript
// Use 'use client' only when needed (interactivity, hooks)
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  item: HeritageItem;
  onReserve: (id: string) => Promise<void>;
}

export function ItemCard({ item, onReserve }: Props) {
  const [loading, setLoading] = useState(false);
  
  // Component logic...
}
```

### API Routes Pattern
```typescript
// app/api/items/[id]/reserve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { notion } from '@/lib/notion';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Get user from cookie
    // 2. Verify item is still available (conflict check)
    // 3. Update Notion
    // 4. Return success
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reserve' },
      { status: 500 }
    );
  }
}
```

---

## Notion Integration

### Client Setup
```typescript
// lib/notion.ts
import { Client } from '@notionhq/client';

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export const DATABASE_ID = process.env.NOTION_DATABASE_ID!;
```

### Query Pattern
```typescript
// Always handle pagination for large datasets
export async function getAllItems(): Promise<HeritageItem[]> {
  const items: HeritageItem[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
      filter: {
        property: 'Status_Vente',
        select: { equals: 'A donner' },
      },
    });
    
    items.push(...response.results.map(parseNotionItem));
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return items;
}
```

### Rate Limiting
- Notion API: 3 requests/second
- Implement delay between batch operations
- Use ISR/SWR for caching on frontend

---

## Authentication Logic

### Family Flow
1. User enters shared password + their name
2. Server validates password against `FAMILY_PASSWORD` env
3. On success: set `familyName` cookie (httpOnly: false for client access)
4. Middleware checks cookie on protected routes

### Association Flow
1. User accesses `/public/[slug]`
2. Server validates slug against `ASSOCIATION_SLUGS` env
3. No cookie needed - slug in URL is the auth

### Cookie Structure
```typescript
// Set on login
cookies().set('familyName', name, {
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: '/',
});

// Read anywhere
const name = cookies().get('familyName')?.value;
```

---

## Options Queue System

### Data Model
Stored in Notion as comma-separated string: `"Marie,Jean,Pierre"`

### Operations
```typescript
// Add option
function addOption(current: string, newName: string): string {
  const queue = current ? current.split(',') : [];
  if (!queue.includes(newName)) {
    queue.push(newName);
  }
  return queue.join(',');
}

// Remove option
function removeOption(current: string, name: string): string {
  return current.split(',').filter(n => n !== name).join(',');
}

// Promote first (when reservation cancelled)
function promoteFirst(options: string): { promoted: string; remaining: string } {
  const queue = options.split(',').filter(Boolean);
  const [promoted, ...rest] = queue;
  return { promoted, remaining: rest.join(',') };
}
```

---

## Error Handling

### Client-Side (Optimistic UI)
```typescript
const [items, setItems] = useState(initialItems);

async function handleReserve(id: string) {
  // Optimistic update
  setItems(prev => prev.map(item => 
    item.id === id 
      ? { ...item, status_dispo: 'Réservé', reserve_par: userName }
      : item
  ));

  try {
    await reserveItem(id);
  } catch (error) {
    // Rollback on failure
    setItems(initialItems);
    toast.error("Cet item vient d'être réservé par quelqu'un d'autre");
  }
}
```

### Server-Side (Conflict Detection)
```typescript
// Always verify current state before update
const currentPage = await notion.pages.retrieve({ page_id: id });
const currentStatus = currentPage.properties.Status_Dispo.status.name;

if (currentStatus !== 'Disponible') {
  return NextResponse.json(
    { error: 'Item already reserved', current: currentStatus },
    { status: 409 } // Conflict
  );
}
```

---

## UI Components (shadcn/ui)

### Required Components
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input badge dialog toast select
```

### Custom Components to Build
- `ItemCard` - Gallery card with image, title, status badge, action button
- `ItemModal` - Detailed view with all metadata
- `FilterBar` - Type, Tags, Search filters
- `ReservationList` - Dashboard list component
- `ExportButtons` - CSV/Excel download triggers

---

## Environment Variables

```env
# .env.local
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx

FAMILY_PASSWORD=xxx

CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Format: slug:DisplayName,slug2:DisplayName2
ASSOCIATION_SLUGS=mediatheque-orgelet:Médiathèque Orgelet

# Optional: for API routes
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Testing Checklist

Before each PR/deploy, verify:

### Authentication
- [ ] Wrong password shows error
- [ ] Correct password + name redirects to gallery
- [ ] Cookie persists on refresh
- [ ] Association URL works without login

### Gallery
- [ ] All "A donner" items display
- [ ] "A vendre" items are hidden
- [ ] Filters work (Type, Tags)
- [ ] Search finds by title and author
- [ ] Sort works (Date, A-Z)

### Reservations
- [ ] Reserve updates UI immediately
- [ ] Reserve updates Notion
- [ ] Cannot reserve already-reserved item
- [ ] Option adds to queue
- [ ] Cancel promotes first option
- [ ] Cancel without options → Disponible

### Dashboard
- [ ] Shows my reservations
- [ ] Shows my options with position
- [ ] Shows my reservations with others' options
- [ ] Export generates valid file

---

## Common Pitfalls

### Notion
- **Property names are case-sensitive** - use exact names from schema
- **Multi-select returns array of objects** - need to map to strings
- **Status is special type** - access via `.status.name`
- **Pagination required** - default limit is 100 items

### Next.js
- **Server vs Client components** - only use 'use client' when needed
- **Cookies in API routes** - use `cookies()` from next/headers
- **Dynamic routes** - params are always strings

### Cloudinary
- **URL format** - `https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}`
- **Transformations** - add before public_id: `/c_fill,w_300,h_400/`

---

## Deployment Notes

### Vercel
1. Connect GitHub repo
2. Add all env variables
3. Deploy

### Post-Deploy
- Test with real Notion data
- Verify Cloudinary images load
- Test on mobile devices
- Share family password securely

---

## n8n Workflows

Workflows are managed separately in n8n instance: `n8n.srv859352.hstgr.cloud`

See `docs/N8N_WORKFLOWS.md` for specifications (user will create based on GitHub examples).

Required webhooks to configure:
- None for MVP (n8n pushes to Notion, Next.js reads)

Future: daily notification workflow.

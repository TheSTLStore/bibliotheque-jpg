# Notion Database Schema - Bibliotheque_JPG

## Overview

This document defines the exact Notion database structure for the Bibliothèque JPG application. Create this database manually in Notion, then provide the Database ID to the application.

---

## Database Properties

### Core Identification

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| **Titre** | Title | ✅ | Item title (book title, album name) |
| **Auteur_Artiste** | Text | ✅ | Author (books) or Artist (music) |
| **Type** | Select | ✅ | Item category |
| **ISBN_EAN** | Text | ❌ | Barcode if scanned |

**Type Options:**
- `Livre`
- `CD`
- `Vinyle`

---

### Condition & Value

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| **Etat** | Select | ❌ | Physical condition |
| **Valeur_Estimee** | Number | ❌ | Estimated value in € (hidden from frontend) |
| **Status_Vente** | Select | ✅ | Sale/donation status |

**Etat Options:**
- `Neuf`
- `Très bon`
- `Bon`
- `Acceptable`
- `Mauvais`

**Status_Vente Options:**
- `A donner` (default)
- `A vendre` (auto-set if Valeur_Estimee > 50€)

---

### Availability & Reservation

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| **Status_Dispo** | Status | ✅ | Current availability |
| **Reserve_Par** | Text | ❌ | Name of person who reserved |
| **Options_Par** | Text | ❌ | Comma-separated queue of option holders |

**Status_Dispo Options:**
- `Disponible` (default) - Available for reservation
- `Réservé` - Reserved by someone
- `Option` - Has options pending (legacy, may not be used)
- `Donné` - Already given away

**Options_Par Format:**
```
Marie,Jean,Pierre
```
First name in list = first in queue. Empty string = no options.

---

### Metadata

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| **Tags** | Multi-select | ❌ | Genre, style, themes |
| **Annee** | Number | ❌ | Release year |
| **Image_URL** | URL | ❌ | Cloudinary public URL |
| **Date_Ajout** | Date | ✅ | When item was added (auto-set) |

**Suggested Tags (create as needed):**

*Books:*
- Roman
- Polar
- SF
- Fantasy
- Histoire
- Biographie
- Technique
- Cuisine
- Art

*Music:*
- Rock
- Jazz
- Classique
- Variété
- Pop
- Blues
- Electro
- World

---

## Notion API Property Access

### Reading Properties

```typescript
// Title
const titre = page.properties.Titre.title[0]?.plain_text ?? '';

// Text
const auteur = page.properties.Auteur_Artiste.rich_text[0]?.plain_text ?? '';

// Select
const type = page.properties.Type.select?.name ?? null;

// Status (special type)
const status = page.properties.Status_Dispo.status?.name ?? 'Disponible';

// Number
const valeur = page.properties.Valeur_Estimee.number ?? 0;
const annee = page.properties.Annee.number ?? null;

// Multi-select (returns array)
const tags = page.properties.Tags.multi_select.map(t => t.name);

// URL
const imageUrl = page.properties.Image_URL.url ?? null;

// Date
const dateAjout = page.properties.Date_Ajout.date?.start ?? null;
```

### Writing Properties

```typescript
// Update reservation
await notion.pages.update({
  page_id: itemId,
  properties: {
    Status_Dispo: {
      status: { name: 'Réservé' }
    },
    Reserve_Par: {
      rich_text: [{ text: { content: userName } }]
    }
  }
});

// Add option to queue
await notion.pages.update({
  page_id: itemId,
  properties: {
    Options_Par: {
      rich_text: [{ text: { content: newQueueString } }]
    }
  }
});

// Create new item (from n8n)
await notion.pages.create({
  parent: { database_id: DATABASE_ID },
  properties: {
    Titre: {
      title: [{ text: { content: 'Book Title' } }]
    },
    Auteur_Artiste: {
      rich_text: [{ text: { content: 'Author Name' } }]
    },
    Type: {
      select: { name: 'Livre' }
    },
    Status_Dispo: {
      status: { name: 'Disponible' }
    },
    Status_Vente: {
      select: { name: 'A donner' }
    },
    Tags: {
      multi_select: [{ name: 'Roman' }, { name: 'Polar' }]
    },
    Annee: {
      number: 2020
    },
    Valeur_Estimee: {
      number: 15
    },
    Image_URL: {
      url: 'https://res.cloudinary.com/xxx/image/upload/xxx.jpg'
    },
    Date_Ajout: {
      date: { start: new Date().toISOString().split('T')[0] }
    }
  }
});
```

---

## Query Filters

### Family View (all "A donner" items)
```typescript
{
  filter: {
    property: 'Status_Vente',
    select: { equals: 'A donner' }
  },
  sorts: [
    { property: 'Date_Ajout', direction: 'descending' }
  ]
}
```

### Association View (only available items)
```typescript
{
  filter: {
    and: [
      {
        property: 'Status_Vente',
        select: { equals: 'A donner' }
      },
      {
        property: 'Status_Dispo',
        status: { equals: 'Disponible' }
      }
    ]
  }
}
```

### User's Reservations
```typescript
{
  filter: {
    property: 'Reserve_Par',
    rich_text: { equals: userName }
  }
}
```

### User's Options (contains name in queue)
```typescript
{
  filter: {
    property: 'Options_Par',
    rich_text: { contains: userName }
  }
}
```

### Filter by Type
```typescript
{
  filter: {
    and: [
      { property: 'Status_Vente', select: { equals: 'A donner' } },
      { property: 'Type', select: { equals: 'Livre' } }
    ]
  }
}
```

### Filter by Tag
```typescript
{
  filter: {
    and: [
      { property: 'Status_Vente', select: { equals: 'A donner' } },
      { property: 'Tags', multi_select: { contains: 'Polar' } }
    ]
  }
}
```

---

## Database Setup Instructions

### Step 1: Create Database
1. Open Notion
2. Create new page "Bibliothèque JPG"
3. Add a Database - Full page
4. Name it "Bibliotheque_JPG"

### Step 2: Add Properties
Add each property from the tables above with exact names (case-sensitive).

For Select/Multi-select, add the suggested options.

For Status:
1. Click on Status_Dispo property settings
2. Add status options: Disponible, Réservé, Option, Donné
3. Set "Disponible" as default

### Step 3: Get Database ID
1. Open the database as a full page
2. Copy the URL: `https://notion.so/your-workspace/DATABASE_ID?v=xxx`
3. The DATABASE_ID is the 32-character string before `?v=`
4. Add to `.env.local`: `NOTION_DATABASE_ID=xxx`

### Step 4: Create Integration
1. Go to https://www.notion.so/my-integrations
2. Create new integration "Bibliothèque JPG"
3. Copy the Internal Integration Token
4. Add to `.env.local`: `NOTION_API_KEY=secret_xxx`

### Step 5: Share Database
1. Open Bibliotheque_JPG database
2. Click "Share" → "Invite"
3. Select your integration
4. Confirm

---

## Data Validation Rules

### On Create (n8n workflow)
- `Titre` required
- `Type` required, must be valid option
- `Status_Dispo` defaults to "Disponible"
- `Status_Vente` = "A vendre" if `Valeur_Estimee` > 50, else "A donner"
- `Date_Ajout` auto-set to current date

### On Reserve (Next.js)
- Verify `Status_Dispo` = "Disponible" before update
- `Reserve_Par` must be non-empty string
- Clear `Options_Par` is not needed (keep for transparency)

### On Cancel Reservation
- If `Options_Par` not empty: promote first, update `Reserve_Par`
- If `Options_Par` empty: set `Status_Dispo` = "Disponible", clear `Reserve_Par`

### On Add Option
- User cannot add option if they already reserved
- User cannot add option if already in queue
- Append to `Options_Par` with comma separator

---

## Notion Limits & Considerations

| Limit | Value | Impact |
|-------|-------|--------|
| API rate | 3 req/s | Batch operations need delays |
| Query results | 100 items | Pagination required |
| Text length | ~2000 chars | Options_Par unlikely to hit |
| Multi-select options | ~100 | Create tags as needed |

### Pagination Example
```typescript
let hasMore = true;
let cursor: string | undefined;

while (hasMore) {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    start_cursor: cursor,
    page_size: 100,
  });
  
  // Process response.results
  
  hasMore = response.has_more;
  cursor = response.next_cursor ?? undefined;
}
```

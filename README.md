# Bibliothèque JPG

Application web pour cataloguer et distribuer des objets culturels (livres, CDs, vinyles) issus d'une succession familiale.

## Features

- 📚 **Catalogue automatisé** - Ingestion via n8n (scan code-barre + vision IA)
- 👨‍👩‍👧‍👦 **Réservation famille** - Les membres réservent les objets qui les intéressent
- 🔄 **Système d'options** - File d'attente si un objet est déjà réservé
- 🏛️ **Mode associations** - Accès pour médiathèques/bibliothèques aux objets restants
- 📊 **Export** - CSV/Excel des réservations par personne

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui
- **Database:** Notion API
- **Automation:** n8n (self-hosted)
- **Images:** Cloudinary
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Notion account with integration
- Cloudinary account
- n8n instance (for ingestion workflow)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/bibliotheque-jpg.git
cd bibliotheque-jpg

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Notion Setup

1. Create the database following `docs/NOTION_SCHEMA.md`
2. Create an integration at notion.so/my-integrations
3. Share the database with your integration
4. Add credentials to `.env.local`

## Documentation

- `PRD.md` - Product Requirements Document
- `CLAUDE.md` - Development instructions (for Claude Code)
- `docs/NOTION_SCHEMA.md` - Database schema reference

## Development

This project is designed to be developed with [Claude Code](https://claude.ai/code).

```bash
# In the project directory
claude
```

## License

Private project - All rights reserved

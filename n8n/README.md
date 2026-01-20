# n8n Workflows

Ce dossier contient les workflows n8n pour l'automatisation de l'ingestion des items.

## Workflows

### ingestion.json
Workflow principal pour l'ingestion automatique des items depuis Google Drive.

**Trigger:** Nouveau fichier ajouté dans `/Heritage_Ingestion/` (Livres, CDs, ou Vinyles)

**Étapes:**
1. Détection du fichier
2. Lecture du code-barres (si disponible)
3. Recherche API (Google Books / Discogs) ou Vision AI (OpenAI GPT-4o)
4. Upload image vers Cloudinary
5. Création de la page Notion
6. Déplacement du fichier vers `/Heritage_Ingestion/Traité/`

### daily-report.json
Workflow de notification quotidienne des changements.

**Trigger:** Tous les jours à 8h00

**Action:** Envoie un email récapitulatif des changements de statut dans les dernières 24h.

## Installation

1. Accéder à l'instance n8n: https://n8n.srv859352.hstgr.cloud
2. Importer les fichiers JSON via l'interface
3. Configurer les credentials nécessaires:
   - Google Drive
   - Notion API
   - Cloudinary
   - OpenAI API
   - Discogs API
4. Activer les workflows

## Documentation

Voir `/docs/N8N_WORKFLOWS.md` pour les spécifications détaillées.

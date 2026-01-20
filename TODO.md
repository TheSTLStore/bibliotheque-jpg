# TODO - n8n Automation Workflows

Cette branche contient les workflows n8n pour l'ingestion automatique des items et les notifications.

## Configuration

### n8n Instance Access

- [ ] Se connecter à `n8n.srv859352.hstgr.cloud`
- [ ] Créer API key dans Settings → API
- [ ] Ajouter credentials pour tous les services

### Required Credentials

- [ ] **Google Drive** - OAuth2 connection
- [ ] **Cloudinary** - API key + API secret + Cloud name
- [ ] **Notion** - Integration token (internal)
- [ ] **OpenAI** - API key pour GPT-4o
- [ ] **Discogs** - API key (optionnel, gratuit)
- [ ] **Google Books API** - API key (gratuit)

## Workflow 1: Heritage Ingestion

### Workflow Structure

Créer workflow nommé: `heritage-ingestion-main`

### Node 1: Google Drive Trigger

- [ ] Type: "Google Drive Trigger"
- [ ] Configuration:
  - [ ] Watch folder: `/Heritage_Ingestion/`
  - [ ] Watch subfolders: true
  - [ ] Trigger on: "File Created"
  - [ ] Poll interval: 1 minute
- [ ] Filtrer uniquement images: jpg, jpeg, png

### Node 2: Detect Type from Folder

- [ ] Type: "Code" (JavaScript)
- [ ] Input: file path from trigger
- [ ] Logic:
  ```javascript
  const path = $input.item.json.path;
  let type = 'Livre'; // default

  if (path.includes('/CDs/')) {
    type = 'CD';
  } else if (path.includes('/Vinyles/')) {
    type = 'Vinyle';
  }

  return { type };
  ```
- [ ] Output: `type` field

### Node 3: Download Image from Drive

- [ ] Type: "Google Drive"
- [ ] Operation: "Download File"
- [ ] File ID: from trigger
- [ ] Output: binary data

### Node 4: Barcode Detection (Optional Attempt)

- [ ] Type: "HTTP Request" ou "Code"
- [ ] Utiliser bibliothèque OCR/barcode (ex: ZXing)
- [ ] Input: image binary
- [ ] Try extract EAN-13/ISBN
- [ ] Output: `barcode` (string ou null)

### Node 5: Switch - Barcode Found or Not

- [ ] Type: "Switch"
- [ ] Condition: `{{ $json.barcode !== null }}`
- [ ] Route 1: Barcode found → API Lookup
- [ ] Route 2: No barcode → AI Vision

### Route 1A: Google Books API Lookup

- [ ] Type: "HTTP Request"
- [ ] Condition: `type === 'Livre'`
- [ ] URL: `https://www.googleapis.com/books/v1/volumes?q=isbn:{{ $json.barcode }}`
- [ ] Method: GET
- [ ] Parse response pour extraire:
  - [ ] Titre
  - [ ] Auteur
  - [ ] Année
  - [ ] Tags (categories)
  - [ ] Image cover (si meilleure que scan)

### Route 1B: Discogs API Lookup

- [ ] Type: "HTTP Request"
- [ ] Condition: `type === 'CD' || type === 'Vinyle'`
- [ ] URL: `https://api.discogs.com/database/search?barcode={{ $json.barcode }}`
- [ ] Headers: User-Agent + Authorization
- [ ] Parse response pour extraire:
  - [ ] Titre album
  - [ ] Artiste
  - [ ] Année
  - [ ] Genres/styles
  - [ ] Valeur estimée (si disponible)

### Route 2: AI Vision with OpenAI

- [ ] Type: "OpenAI"
- [ ] Model: "gpt-4o" (vision capable)
- [ ] Input: image binary (base64)
- [ ] Prompt:
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
- [ ] Response format: JSON
- [ ] Parse JSON response

### Node 6: Merge API/AI Results

- [ ] Type: "Merge" ou "Code"
- [ ] Combiner les deux routes
- [ ] Normaliser les données au même format
- [ ] Validation: tous les champs requis présents

### Node 7: Upload Image to Cloudinary

- [ ] Type: "HTTP Request" ou "Cloudinary" node (si disponible)
- [ ] Upload image binary
- [ ] Folder: `bibliotheque-jpg/items`
- [ ] Transformation: auto-format, quality auto
- [ ] Output: `secure_url`

### Node 8: Determine Status_Vente

- [ ] Type: "Code"
- [ ] Logic:
  ```javascript
  const valeur = $json.valeur_estimee || 0;
  const status_vente = valeur > 50 ? 'A vendre' : 'A donner';
  return { status_vente };
  ```

### Node 9: Create Notion Page

- [ ] Type: "Notion"
- [ ] Operation: "Create Page"
- [ ] Database ID: from env
- [ ] Map fields:
  - [ ] Titre → Title property
  - [ ] Auteur_Artiste → Text
  - [ ] Type → Select
  - [ ] Etat → Select
  - [ ] ISBN_EAN → Text (barcode)
  - [ ] Tags → Multi-select
  - [ ] Annee → Number
  - [ ] Valeur_Estimee → Number
  - [ ] Status_Vente → Select
  - [ ] Status_Dispo → Status ("Disponible" par défaut)
  - [ ] Image_URL → URL (Cloudinary URL)
  - [ ] Date_Ajout → Date (now)

### Node 10: Move File to "Traité"

- [ ] Type: "Google Drive"
- [ ] Operation: "Move File"
- [ ] File ID: original file
- [ ] Destination folder: `/Heritage_Ingestion/Traité/`
- [ ] Optionnel: renommer avec timestamp

### Node 11: Error Handling

- [ ] Ajouter "Error Trigger" node
- [ ] Catch errors de tout le workflow
- [ ] Envoyer notification (email ou Slack)
- [ ] Logger erreur avec détails fichier
- [ ] Optionnel: déplacer fichier vers dossier "Erreurs"

## Workflow 2: Daily Notification Report

### Workflow Structure

Créer workflow nommé: `daily-report-reservations`

### Node 1: Schedule Trigger

- [ ] Type: "Schedule Trigger"
- [ ] Cron: `0 8 * * *` (tous les jours à 8h)
- [ ] Timezone: Europe/Paris

### Node 2: Query Notion - Changes Last 24h

- [ ] Type: "Notion"
- [ ] Operation: "Query Database"
- [ ] Database ID: Bibliotheque_JPG
- [ ] Filter:
  ```json
  {
    "property": "Last Edited Time",
    "date": {
      "after": "{{ $now.minus({ days: 1 }).toISO() }}"
    }
  }
  ```
- [ ] Sort: Last Edited Time descending

### Node 3: Filter - Only Status Changes

- [ ] Type: "Code"
- [ ] Filter items où Status_Dispo a changé
- [ ] Exclure items créés (nouveau items vs modifications)
- [ ] Output: liste des changements

### Node 4: Check if Changes Exist

- [ ] Type: "IF"
- [ ] Condition: `{{ $json.length > 0 }}`
- [ ] True → continuer
- [ ] False → arrêter workflow

### Node 5: Format Email Content

- [ ] Type: "Code"
- [ ] Générer HTML email avec:
  - [ ] Titre: "Rapport quotidien - Bibliothèque JPG"
  - [ ] Date du rapport
  - [ ] Liste des changements:
    - [ ] Titre item
    - [ ] Type
    - [ ] Nouveau statut
    - [ ] Réservé par / Options
  - [ ] Statistiques:
    - [ ] Total items disponibles
    - [ ] Total items réservés
    - [ ] Total items avec options

### Node 6: Send Email

- [ ] Type: "Send Email" (SMTP ou service)
- [ ] To: admin email (from env)
- [ ] Subject: "📚 Rapport quotidien - {{ $now.toFormat('dd/MM/yyyy') }}"
- [ ] Body: HTML from previous node
- [ ] Optionnel: ajouter lien vers app

## Workflow 3: Manual Metadata Correction (Optional)

### Use Case

Permettre corrections manuelles via formulaire ou webhook

### Node 1: Webhook Trigger

- [ ] Type: "Webhook"
- [ ] Path: `/webhook/correct-metadata`
- [ ] Method: POST
- [ ] Authentication: Header API key

### Node 2: Validate Input

- [ ] Type: "Code"
- [ ] Vérifier fields requis: item_id, corrections
- [ ] Sanitize input
- [ ] Return 400 si invalide

### Node 3: Update Notion Page

- [ ] Type: "Notion"
- [ ] Operation: "Update Page"
- [ ] Page ID: from webhook
- [ ] Update only provided fields

### Node 4: Return Success

- [ ] Type: "Respond to Webhook"
- [ ] Status: 200
- [ ] Body: success message

## Testing Workflows

### Ingestion Workflow Tests

- [ ] Test avec image de livre (barcode visible)
- [ ] Test avec image de CD (barcode visible)
- [ ] Test avec image de vinyle (pas de barcode)
- [ ] Test avec image floue/mauvaise qualité
- [ ] Test avec dossier incorrect
- [ ] Vérifier création page Notion
- [ ] Vérifier upload Cloudinary
- [ ] Vérifier déplacement fichier

### Daily Report Tests

- [ ] Test manuellement (trigger now)
- [ ] Vérifier filtre dernières 24h
- [ ] Vérifier email formatting
- [ ] Test avec 0 changements
- [ ] Test avec multiple changements

## Error Handling & Monitoring

- [ ] Activer error workflow sur tous les workflows
- [ ] Logger tous les runs dans Notion (table "Workflow_Logs")
- [ ] Alertes email si échecs > 3 en 1h
- [ ] Monitoring Cloudinary quota
- [ ] Monitoring OpenAI API usage/costs

## Documentation

### Workflow Exports

- [ ] Exporter `ingestion.json`
- [ ] Exporter `daily-report.json`
- [ ] Exporter `metadata-correction.json`
- [ ] Commiter dans `/n8n/workflows/`

### Documentation Files

- [ ] Créer `n8n/README.md` avec:
  - [ ] Comment importer workflows
  - [ ] Liste des credentials requises
  - [ ] Configuration variables d'environnement
  - [ ] Troubleshooting commun

### API Documentation

- [ ] Documenter webhook endpoints
- [ ] Exemples de payloads
- [ ] Authentication headers
- [ ] Response formats

## Optimizations

### Performance

- [ ] Batch processing si multiple files uploaded
- [ ] Cache API responses (Google Books, Discogs)
- [ ] Compress images avant Cloudinary upload
- [ ] Parallelize API calls when possible

### Cost Optimization

- [ ] Utiliser GPT-4o-mini pour simple cases
- [ ] Upgrade to GPT-4o only si GPT-4o-mini échoue
- [ ] Cloudinary transformations optimales
- [ ] Rate limit API calls

## Environment Variables (n8n)

À configurer dans n8n Settings:

```env
NOTION_DATABASE_ID=xxx
GOOGLE_DRIVE_FOLDER_ID=xxx
CLOUDINARY_UPLOAD_PRESET=bibliotheque-jpg
ADMIN_EMAIL=xxx
WEBHOOK_API_KEY=xxx
```

## MCP Integration (Optional)

Si utilisation des MCP servers Claude Code:

### n8n-mcp (Documentation)

- [ ] Utiliser pour valider structures workflows
- [ ] Chercher nodes disponibles
- [ ] Exemples de configurations

### n8n-server (Instance Management)

- [ ] Lister workflows actifs
- [ ] Déployer nouveaux workflows
- [ ] Monitorer exécutions

## Future Enhancements

- [ ] OCR avancé pour livres sans barcode (Tesseract)
- [ ] Détection automatique de l'état physique (AI vision)
- [ ] Suggestions de tags basées sur historique
- [ ] Auto-tagging par genre via NLP
- [ ] Notification Slack en plus d'email
- [ ] Dashboard temps réel dans n8n
- [ ] Workflow de relance pour options longues (> 1 mois)

## Common Pitfalls

### Google Drive API

- [ ] Rate limits: 1000 requests/100 seconds/user
- [ ] Permissions: service account doit avoir accès au dossier
- [ ] File IDs changent après move

### OpenAI Vision

- [ ] Image size limit: 20MB
- [ ] Base64 encoding required
- [ ] Cost: ~$0.01 per image avec GPT-4o
- [ ] Parfois hallucine des infos - toujours valider

### Cloudinary

- [ ] Free tier: 25GB storage, 25GB bandwidth/month
- [ ] Upload preset doit être "unsigned" pour n8n
- [ ] Transformations comptent dans bandwidth

### Notion API

- [ ] Rate limit: 3 requests/second
- [ ] Property names case-sensitive
- [ ] Multi-select: max 100 options
- [ ] Rich text arrays pas juste strings

## Acceptance Criteria

- [ ] Image uploadée → item créé dans Notion (< 2 min)
- [ ] Barcode détecté → métadonnées correctes (>90%)
- [ ] Pas de barcode → AI vision remplit fields (>80% précision)
- [ ] Image dans Cloudinary avec URL publique
- [ ] Fichier déplacé vers "Traité"
- [ ] Email quotidien envoyé si changements
- [ ] 0 erreurs non-gérées (tous catchées et loggées)

## References

- Voir `docs/N8N_WORKFLOWS.md` pour spécifications détaillées
- n8n docs: https://docs.n8n.io
- Notion API: https://developers.notion.com
- Cloudinary API: https://cloudinary.com/documentation
- OpenAI Vision: https://platform.openai.com/docs/guides/vision

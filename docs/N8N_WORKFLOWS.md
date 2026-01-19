# N8N Workflows Documentation - Bibliothèque JPG

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture des workflows](#architecture-des-workflows)
3. [Workflow 1 : Ingestion des items](#workflow-1--ingestion-des-items)
4. [Workflow 2 : Rapport quotidien](#workflow-2--rapport-quotidien)
5. [Configuration des credentials](#configuration-des-credentials)
6. [Gestion des erreurs](#gestion-des-erreurs)
7. [Maintenance et monitoring](#maintenance-et-monitoring)

---

## Vue d'ensemble

Le système Bibliothèque JPG utilise 2 workflows n8n pour automatiser le catalogage et le suivi des objets culturels.

### Instance n8n
- **URL** : `https://n8n.srv859352.hstgr.cloud`
- **Type** : Self-hosted (Hostinger VPS)
- **Timezone** : Europe/Paris

### Workflows

| Workflow | Rôle | Trigger | Fréquence | Statut |
|----------|------|---------|-----------|--------|
| **bibliotheque-jpg-ingestion** | Catalogage automatique des items | Google Drive (nouveau fichier) | Temps réel | 🟡 À créer |
| **bibliotheque-jpg-daily-report** | Rapport des changements | Schedule | 1x/jour (8h00) | 🟡 À créer |

### Flux de données global

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INGESTION WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Google Drive          n8n                    Services externes          │
│  ┌──────────┐     ┌─────────────┐     ┌─────────────────────────┐       │
│  │ /Livres/ │     │             │     │  Google Books API       │       │
│  │ /CDs/    │────▶│  Workflow   │────▶│  Discogs API            │       │
│  │ /Vinyles/│     │  Ingestion  │     │  OpenAI Vision (GPT-4o) │       │
│  └──────────┘     │             │     │  Cloudinary             │       │
│                   └──────┬──────┘     └─────────────────────────┘       │
│                          │                                               │
│                          ▼                                               │
│                   ┌─────────────┐                                        │
│                   │   Notion    │                                        │
│                   │  Database   │                                        │
│                   └─────────────┘                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        DAILY REPORT WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Schedule (8h00)        n8n                    Output                    │
│  ┌──────────┐     ┌─────────────┐     ┌─────────────────────────┐       │
│  │  Cron    │────▶│  Query      │────▶│  Email récapitulatif    │       │
│  │  Daily   │     │  Notion     │     │  (si changements)       │       │
│  └──────────┘     │  Changes    │     └─────────────────────────┘       │
│                   └─────────────┘                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture des workflows

### Structure des dossiers Google Drive

```
Bibliotheque_JPG_Ingestion/
├── Livres/           # Photos de livres à traiter
├── CDs/              # Photos de CDs à traiter
├── Vinyles/          # Photos de vinyles à traiter
└── Traité/           # Fichiers traités (archivage)
    ├── Livres/
    ├── CDs/
    └── Vinyles/
```

### Conventions de nommage

- **Fichiers images** : Pas de convention stricte (le workflow gère tout format)
- **Formats acceptés** : `.jpg`, `.jpeg`, `.png`, `.webp`
- **Taille max** : 20MB par image

---

## Workflow 1 : Ingestion des items

### Informations générales

| Propriété | Valeur |
|-----------|--------|
| **Nom** | `bibliotheque-jpg-ingestion` |
| **Trigger** | Google Drive Trigger (nouveau fichier) |
| **Dossiers surveillés** | `/Bibliotheque_JPG_Ingestion/Livres/`, `/CDs/`, `/Vinyles/` |
| **Exécution moyenne** | 15-30 secondes par item |
| **Retry on failure** | Oui (3 tentatives) |

### Schéma du workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Google    │     │   Detect    │     │  Download   │     │   Detect    │
│   Drive     │────▶│    Type     │────▶│   Image     │────▶│  Barcode    │
│  Trigger    │     │ from Folder │     │             │     │   (OCR)     │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                                              ┌─────────────────────┴─────────────────────┐
                                              │                                           │
                                              ▼                                           ▼
                                       ┌─────────────┐                             ┌─────────────┐
                                       │  Barcode    │                             │ No Barcode  │
                                       │   Found     │                             │   Found     │
                                       └──────┬──────┘                             └──────┬──────┘
                                              │                                           │
                                              ▼                                           ▼
                                       ┌─────────────┐                             ┌─────────────┐
                                       │ API Lookup  │                             │   OpenAI    │
                                       │ Books/      │                             │   Vision    │
                                       │ Discogs     │                             │   GPT-4o    │
                                       └──────┬──────┘                             └──────┬──────┘
                                              │                                           │
                                              └─────────────────────┬─────────────────────┘
                                                                    │
                                                                    ▼
                                                             ┌─────────────┐
                                                             │  Upload to  │
                                                             │ Cloudinary  │
                                                             └──────┬──────┘
                                                                    │
                                                                    ▼
                                                             ┌─────────────┐
                                                             │  Check      │
                                                             │  Value      │
                                                             │  > 50€ ?    │
                                                             └──────┬──────┘
                                                                    │
                                                                    ▼
                                                             ┌─────────────┐
                                                             │  Create     │
                                                             │  Notion     │
                                                             │  Page       │
                                                             └──────┬──────┘
                                                                    │
                                                                    ▼
                                                             ┌─────────────┐
                                                             │  Move to    │
                                                             │  /Traité/   │
                                                             └─────────────┘
```

### Détail des nodes

#### 1. Google Drive Trigger

**Type** : Google Drive Trigger  
**Configuration** :
```json
{
  "triggerOn": "fileCreated",
  "folderId": "ID_DU_DOSSIER_HERITAGE_INGESTION",
  "recursive": true,
  "options": {
    "includeFileTypes": ["image/jpeg", "image/png", "image/webp"]
  }
}
```

#### 2. Detect Type from Folder

**Type** : Code Node (JavaScript)  
**But** : Déterminer le type d'item selon le dossier source

```javascript
const filePath = $input.first().json.name;
const parents = $input.first().json.parents;

// Détecter le type selon le dossier parent
let itemType = 'Livre'; // default

if (filePath.includes('CDs') || parents?.some(p => p.includes('CDs'))) {
  itemType = 'CD';
} else if (filePath.includes('Vinyles') || parents?.some(p => p.includes('Vinyles'))) {
  itemType = 'Vinyle';
} else if (filePath.includes('Livres') || parents?.some(p => p.includes('Livres'))) {
  itemType = 'Livre';
}

return [{
  json: {
    ...$input.first().json,
    detectedType: itemType
  }
}];
```

#### 3. Download Image

**Type** : Google Drive Node  
**Operation** : Download  
**Configuration** :
```json
{
  "fileId": "={{ $json.id }}",
  "options": {
    "fileName": "={{ $json.name }}"
  }
}
```

#### 4. Detect Barcode (OCR)

**Type** : HTTP Request Node  
**Service** : API de détection de code-barres (ex: api4ai, barcodelookup)

**Alternative avec Code Node** (si pas d'API externe) :
```javascript
// Utiliser une lib JS de détection ou passer directement à la vision IA
// Pour simplifier, on peut skip cette étape et toujours utiliser la vision IA
// qui détectera aussi les ISBN visibles sur les couvertures

const hasBarcode = false; // Placeholder - à implémenter avec une vraie API

return [{
  json: {
    ...$input.first().json,
    hasBarcode: hasBarcode,
    barcode: null
  }
}];
```

#### 5a. API Lookup (Branche Barcode trouvé)

**Type** : Switch Node → HTTP Request Nodes

**Pour les livres (Google Books API)** :
```json
{
  "method": "GET",
  "url": "https://www.googleapis.com/books/v1/volumes",
  "qs": {
    "q": "isbn:{{ $json.barcode }}",
    "key": "{{ $credentials.googleBooksApiKey }}"
  }
}
```

**Pour les CDs/Vinyles (Discogs API)** :
```json
{
  "method": "GET", 
  "url": "https://api.discogs.com/database/search",
  "qs": {
    "barcode": "{{ $json.barcode }}",
    "token": "{{ $credentials.discogsToken }}"
  },
  "headers": {
    "User-Agent": "HeritageManager/1.0"
  }
}
```

**Code Node - Parse API Response** :
```javascript
const input = $input.first().json;
const itemType = input.detectedType;

let result = {
  titre: '',
  auteur_artiste: '',
  annee: null,
  tags: [],
  valeur_estimee: 0,
  source: 'api'
};

if (itemType === 'Livre' && input.items?.[0]) {
  const book = input.items[0].volumeInfo;
  result.titre = book.title || '';
  result.auteur_artiste = book.authors?.join(', ') || '';
  result.annee = book.publishedDate ? parseInt(book.publishedDate.substring(0, 4)) : null;
  result.tags = book.categories?.slice(0, 3) || [];
} else if (input.results?.[0]) {
  // Discogs response
  const release = input.results[0];
  result.titre = release.title || '';
  result.auteur_artiste = release.title?.split(' - ')[0] || '';
  result.annee = release.year || null;
  result.tags = release.genre?.slice(0, 3) || [];
}

return [{ json: { ...input, extracted: result } }];
```

#### 5b. OpenAI Vision (Branche pas de barcode)

**Type** : OpenAI Node  
**Model** : GPT-4o  
**Operation** : Message a Model

**System Prompt** :
```
Tu es un expert en identification d'objets culturels (livres, CDs, vinyles).
Tu dois analyser l'image fournie et extraire les informations.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires.
```

**User Prompt** :
```
Analyse cette image d'un objet culturel (recto et/ou verso si visible).

Identifie:
- Type: Livre, CD, ou Vinyle
- Titre exact
- Auteur (livre) ou Artiste (musique)
- Année de sortie (si visible ou déductible)
- État physique: Neuf, Très bon, Bon, Acceptable, ou Mauvais
- Estimation prix d'occasion en euros (valeur basse réaliste)
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

**Configuration** :
```json
{
  "model": "gpt-4o",
  "maxTokens": 500,
  "temperature": 0.3,
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "{{ $json.prompt }}" },
        { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,{{ $binary.data.data }}" } }
      ]
    }
  ]
}
```

**Code Node - Parse Vision Response** :
```javascript
const input = $input.first().json;
let visionResponse;

try {
  // Nettoyer la réponse (enlever markdown si présent)
  let content = input.message.content;
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  visionResponse = JSON.parse(content);
} catch (e) {
  // Fallback si parsing échoue
  visionResponse = {
    type: input.detectedType || 'Livre',
    titre: 'Titre non identifié',
    auteur_artiste: 'Auteur inconnu',
    annee: null,
    etat: 'Bon',
    valeur_estimee: 5,
    tags: []
  };
}

return [{
  json: {
    ...input,
    extracted: {
      ...visionResponse,
      source: 'vision'
    }
  }
}];
```

#### 6. Upload to Cloudinary

**Type** : HTTP Request Node  
**Method** : POST  
**URL** : `https://api.cloudinary.com/v1_1/{{ $credentials.cloudinaryCloudName }}/image/upload`

**Body (Form Data)** :
```json
{
  "file": "data:image/jpeg;base64,{{ $binary.data.data }}",
  "upload_preset": "bibliotheque_jpg_unsigned",
  "folder": "bibliotheque-jpg",
  "public_id": "item_{{ $now.format('yyyyMMdd_HHmmss') }}_{{ $randomInt(1000, 9999) }}"
}
```

**Note** : Créer un "upload preset" unsigned dans Cloudinary Dashboard pour permettre les uploads sans signature.

**Code Node - Extract URL** :
```javascript
const cloudinaryResponse = $input.first().json;

return [{
  json: {
    ...$input.first().json,
    imageUrl: cloudinaryResponse.secure_url
  }
}];
```

#### 7. Check Value & Set Status

**Type** : Code Node

```javascript
const input = $input.first().json;
const extracted = input.extracted;
const SEUIL_VENTE = 50;

const statusVente = extracted.valeur_estimee > SEUIL_VENTE ? 'A vendre' : 'A donner';

return [{
  json: {
    ...input,
    finalData: {
      titre: extracted.titre,
      auteur_artiste: extracted.auteur_artiste,
      type: extracted.type || input.detectedType,
      etat: extracted.etat || null,
      isbn_ean: input.barcode || null,
      tags: extracted.tags || [],
      annee: extracted.annee,
      valeur_estimee: extracted.valeur_estimee || 0,
      status_vente: statusVente,
      status_dispo: 'Disponible',
      reserve_par: null,
      options_par: '',
      image_url: input.imageUrl,
      date_ajout: new Date().toISOString().split('T')[0]
    }
  }
}];
```

#### 8. Create Notion Page

**Type** : Notion Node  
**Operation** : Create Database Page  
**Database ID** : `{{ $credentials.notionDatabaseId }}`

**Properties** :
```json
{
  "Titre": {
    "title": [{ "text": { "content": "{{ $json.finalData.titre }}" } }]
  },
  "Auteur_Artiste": {
    "rich_text": [{ "text": { "content": "{{ $json.finalData.auteur_artiste }}" } }]
  },
  "Type": {
    "select": { "name": "{{ $json.finalData.type }}" }
  },
  "Etat": {
    "select": { "name": "{{ $json.finalData.etat }}" }
  },
  "ISBN_EAN": {
    "rich_text": [{ "text": { "content": "{{ $json.finalData.isbn_ean || '' }}" } }]
  },
  "Tags": {
    "multi_select": "={{ $json.finalData.tags.map(t => ({ name: t })) }}"
  },
  "Annee": {
    "number": "{{ $json.finalData.annee }}"
  },
  "Valeur_Estimee": {
    "number": "{{ $json.finalData.valeur_estimee }}"
  },
  "Status_Vente": {
    "select": { "name": "{{ $json.finalData.status_vente }}" }
  },
  "Status_Dispo": {
    "status": { "name": "{{ $json.finalData.status_dispo }}" }
  },
  "Image_URL": {
    "url": "{{ $json.finalData.image_url }}"
  },
  "Date_Ajout": {
    "date": { "start": "{{ $json.finalData.date_ajout }}" }
  }
}
```

#### 9. Move to Traité

**Type** : Google Drive Node  
**Operation** : Move

```json
{
  "fileId": "={{ $json.originalFileId }}",
  "folderId": "ID_DU_DOSSIER_TRAITE_CORRESPONDANT"
}
```

**Code Node préalable - Déterminer dossier destination** :
```javascript
const input = $input.first().json;
const type = input.finalData.type;

// Mapping des dossiers "Traité"
const traiteFolders = {
  'Livre': 'ID_FOLDER_TRAITE_LIVRES',
  'CD': 'ID_FOLDER_TRAITE_CDS',
  'Vinyle': 'ID_FOLDER_TRAITE_VINYLES'
};

return [{
  json: {
    ...input,
    destinationFolderId: traiteFolders[type] || traiteFolders['Livre']
  }
}];
```

---

## Workflow 2 : Rapport quotidien

### Informations générales

| Propriété | Valeur |
|-----------|--------|
| **Nom** | `bibliotheque-jpg-daily-report` |
| **Trigger** | Schedule Trigger |
| **Heure d'exécution** | 08:00 (Europe/Paris) |
| **Condition** | Envoie email uniquement si changements détectés |

### Schéma du workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Schedule   │     │   Query     │     │  Filter     │     │  Has        │
│  Trigger    │────▶│   Notion    │────▶│  Last 24h   │────▶│  Changes?   │
│  (8h00)     │     │  Database   │     │  Changes    │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                                              ┌─────────────────────┴─────────────────────┐
                                              │                                           │
                                              ▼                                           ▼
                                       ┌─────────────┐                             ┌─────────────┐
                                       │    Yes      │                             │     No      │
                                       │  Changes    │                             │  Changes    │
                                       └──────┬──────┘                             └──────┬──────┘
                                              │                                           │
                                              ▼                                           ▼
                                       ┌─────────────┐                             ┌─────────────┐
                                       │  Generate   │                             │    Stop     │
                                       │  Report     │                             │  Workflow   │
                                       └──────┬──────┘                             └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │   Send      │
                                       │   Email     │
                                       └─────────────┘
```

### Détail des nodes

#### 1. Schedule Trigger

**Type** : Schedule Trigger

```json
{
  "rule": {
    "interval": [{ "field": "cronExpression", "expression": "0 8 * * *" }]
  },
  "options": {
    "timezone": "Europe/Paris"
  }
}
```

#### 2. Query Notion Database

**Type** : Notion Node  
**Operation** : Get Many (Database)

```json
{
  "databaseId": "{{ $credentials.notionDatabaseId }}",
  "returnAll": true,
  "options": {
    "filter": {
      "timestamp": "last_edited_time",
      "last_edited_time": {
        "past_week": {}
      }
    }
  }
}
```

#### 3. Filter Last 24h Changes

**Type** : Code Node

```javascript
const items = $input.all();
const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const recentChanges = items.filter(item => {
  const lastEdited = new Date(item.json.last_edited_time);
  return lastEdited >= yesterday;
});

// Catégoriser les changements
const newItems = recentChanges.filter(item => {
  const created = new Date(item.json.created_time);
  return created >= yesterday;
});

const reservations = recentChanges.filter(item => {
  const status = item.json.properties?.Status_Dispo?.status?.name;
  const reservePar = item.json.properties?.Reserve_Par?.rich_text?.[0]?.plain_text;
  return status === 'Réservé' && reservePar;
});

const cancellations = recentChanges.filter(item => {
  const status = item.json.properties?.Status_Dispo?.status?.name;
  return status === 'Disponible';
});

return [{
  json: {
    hasChanges: recentChanges.length > 0,
    summary: {
      totalChanges: recentChanges.length,
      newItems: newItems.length,
      reservations: reservations.length,
      itemsDetails: {
        new: newItems.map(i => ({
          titre: i.json.properties?.Titre?.title?.[0]?.plain_text,
          type: i.json.properties?.Type?.select?.name
        })),
        reserved: reservations.map(i => ({
          titre: i.json.properties?.Titre?.title?.[0]?.plain_text,
          reservePar: i.json.properties?.Reserve_Par?.rich_text?.[0]?.plain_text
        }))
      }
    }
  }
}];
```

#### 4. IF - Has Changes?

**Type** : IF Node

```json
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{ $json.hasChanges }}",
        "value2": true
      }
    ]
  }
}
```

#### 5. Generate Report (HTML)

**Type** : Code Node

```javascript
const summary = $input.first().json.summary;
const date = new Date().toLocaleDateString('fr-FR', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

let newItemsList = '';
if (summary.itemsDetails.new.length > 0) {
  newItemsList = summary.itemsDetails.new
    .map(i => `<li><strong>${i.titre}</strong> (${i.type})</li>`)
    .join('');
}

let reservationsList = '';
if (summary.itemsDetails.reserved.length > 0) {
  reservationsList = summary.itemsDetails.reserved
    .map(i => `<li><strong>${i.titre}</strong> → réservé par ${i.reservePar}</li>`)
    .join('');
}

const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c5282; border-bottom: 2px solid #2c5282; padding-bottom: 10px; }
    h2 { color: #4a5568; margin-top: 25px; }
    .stat { background: #f7fafc; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .stat-number { font-size: 24px; font-weight: bold; color: #2c5282; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📦 Bibliothèque JPG - Rapport quotidien</h1>
    <p>Bonjour Kevin,</p>
    <p>Voici le résumé des activités des dernières 24 heures (${date}) :</p>
    
    <div class="stat">
      <div class="stat-number">${summary.totalChanges}</div>
      <div>changements détectés</div>
    </div>
    
    ${summary.newItems > 0 ? `
    <h2>📚 Nouveaux items ajoutés (${summary.newItems})</h2>
    <ul>${newItemsList}</ul>
    ` : ''}
    
    ${summary.reservations > 0 ? `
    <h2>🎫 Nouvelles réservations (${summary.reservations})</h2>
    <ul>${reservationsList}</ul>
    ` : ''}
    
    <div class="footer">
      <p>Ce rapport est généré automatiquement par Bibliothèque JPG.</p>
      <p>Instance n8n : n8n.srv859352.hstgr.cloud</p>
    </div>
  </div>
</body>
</html>
`;

return [{
  json: {
    ...summary,
    emailHtml: html,
    emailSubject: `Bibliothèque JPG - ${summary.totalChanges} changement(s) - ${date}`
  }
}];
```

#### 6. Send Email

**Type** : Email Send Node (ou Gmail Node)

```json
{
  "to": "kevin@example.com",
  "subject": "={{ $json.emailSubject }}",
  "html": "={{ $json.emailHtml }}",
  "options": {
    "fromName": "Bibliothèque JPG"
  }
}
```

---

## Configuration des credentials

### Credentials à créer dans n8n

| Credential Name | Type | Variables requises |
|-----------------|------|-------------------|
| `google-drive-oauth` | OAuth2 | Client ID, Client Secret |
| `notion-api` | Header Auth | API Key (Internal Integration Token) |
| `openai-api` | Header Auth | API Key |
| `cloudinary-api` | Custom | Cloud Name, API Key, API Secret |
| `google-books-api` | API Key | API Key |
| `discogs-api` | Header Auth | Personal Access Token |
| `email-smtp` | SMTP | Host, Port, User, Password |

### Configuration détaillée

#### Google Drive OAuth2

1. Créer un projet dans Google Cloud Console
2. Activer l'API Google Drive
3. Créer des identifiants OAuth 2.0
4. Redirect URI : `https://n8n.srv859352.hstgr.cloud/rest/oauth2-credential/callback`
5. Scopes : `https://www.googleapis.com/auth/drive`

#### Notion API

1. Aller sur https://www.notion.so/my-integrations
2. Créer une nouvelle intégration "Bibliothèque JPG n8n"
3. Copier le "Internal Integration Token"
4. Partager la database Bibliotheque_JPG avec l'intégration

#### OpenAI API

1. Aller sur https://platform.openai.com/api-keys
2. Créer une nouvelle clé API
3. S'assurer que le compte a accès à GPT-4o

#### Cloudinary

1. Créer un compte sur cloudinary.com
2. Dashboard → Settings → API Keys
3. Créer un "Upload Preset" unsigned :
   - Settings → Upload → Upload Presets → Add
   - Signing Mode : Unsigned
   - Folder : `bibliotheque-jpg`
   - Nom : `bibliotheque_jpg_unsigned`

#### Google Books API

1. Google Cloud Console → APIs & Services → Library
2. Activer "Books API"
3. APIs & Services → Credentials → Create API Key

#### Discogs API

1. Créer un compte sur discogs.com
2. Settings → Developers → Generate new token
3. User-Agent requis dans les headers

---

## Gestion des erreurs

### Stratégie globale

```
┌─────────────────────────────────────────────────────────────────┐
│                     ERROR HANDLING STRATEGY                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. RETRY LOGIC                                                  │
│     - Max retries: 3                                            │
│     - Wait between: 5 seconds                                   │
│     - Exponential backoff: Non                                  │
│                                                                  │
│  2. ERROR ROUTING                                                │
│     - Continue on fail: Oui (pour ne pas bloquer le batch)     │
│     - Error branch: Log + Notification                          │
│                                                                  │
│  3. FALLBACK VALUES                                              │
│     - Vision AI fail → Valeurs par défaut                       │
│     - API lookup fail → Vision AI                               │
│     - Cloudinary fail → Garder fichier local                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Erreurs courantes et solutions

| Erreur | Cause probable | Solution |
|--------|----------------|----------|
| Google Drive 403 | Token expiré | Ré-authentifier OAuth |
| Notion 400 | Propriété invalide | Vérifier le schéma |
| OpenAI 429 | Rate limit | Attendre + retry |
| OpenAI content_policy | Image problématique | Skip + log |
| Cloudinary 401 | Mauvais credentials | Vérifier API key |

### Error Workflow (optionnel)

Créer un workflow séparé `heritage-error-handler` déclenché sur erreur :

```javascript
// Code Node - Format error notification
const error = $input.first().json;

return [{
  json: {
    message: `⚠️ Erreur Bibliothèque JPG\n\nWorkflow: ${error.workflow?.name}\nNode: ${error.node?.name}\nMessage: ${error.message}\nTimestamp: ${new Date().toISOString()}`
  }
}];
```

---

## Maintenance et monitoring

### Checklist de maintenance

#### Quotidien (automatisé)
- [x] Rapport email des changements

#### Hebdomadaire
- [ ] Vérifier les logs d'exécution n8n
- [ ] Vérifier l'espace disque Drive/Cloudinary
- [ ] Contrôle qualité : items mal identifiés

#### Mensuel
- [ ] Vérifier les quotas API (OpenAI, Google)
- [ ] Renouveler tokens OAuth si nécessaire
- [ ] Backup des workflows (export JSON)
- [ ] Nettoyer le dossier /Traité/ si nécessaire

### Monitoring des quotas

| Service | Quota gratuit | Usage estimé/mois |
|---------|---------------|-------------------|
| OpenAI GPT-4o | Pay as you go | ~$10-20 (2000 images) |
| Google Books API | 1000 req/jour | Largement suffisant |
| Discogs API | 60 req/min | Largement suffisant |
| Cloudinary | 25GB storage | ~5GB (2000 images) |
| Notion API | 3 req/sec | OK avec délais |

### Logs importants à surveiller

```bash
# Accès aux logs n8n (si Docker)
docker logs n8n -f --tail 100

# Filtrer les erreurs
docker logs n8n 2>&1 | grep -i error
```

### Backup des workflows

Exporter régulièrement les workflows en JSON :
1. n8n → Workflows → Sélectionner workflow
2. ... (menu) → Download
3. Stocker dans un repo Git

---

## Annexes

### Variables d'environnement n8n

```env
# Ajouter dans la config n8n si nécessaire
N8N_ENCRYPTION_KEY=your-encryption-key
WEBHOOK_URL=https://n8n.srv859352.hstgr.cloud/
GENERIC_TIMEZONE=Europe/Paris
```

### IDs Google Drive à configurer

```javascript
// À remplacer par les vrais IDs après création des dossiers
const FOLDER_IDS = {
  INGESTION_ROOT: 'xxx',
  LIVRES: 'xxx',
  CDS: 'xxx',
  VINYLES: 'xxx',
  TRAITE_LIVRES: 'xxx',
  TRAITE_CDS: 'xxx',
  TRAITE_VINYLES: 'xxx'
};
```

### Ressources utiles

- [Documentation n8n](https://docs.n8n.io/)
- [Notion API Reference](https://developers.notion.com/reference)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [Cloudinary Upload API](https://cloudinary.com/documentation/upload_images)
- [Google Books API](https://developers.google.com/books/docs/v1/using)
- [Discogs API](https://www.discogs.com/developers)

---

**Version** : 1.0.0  
**Dernière mise à jour** : Janvier 2025  
**Auteur** : Kevin (avec Claude)

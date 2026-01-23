# n8n Workflows - Bibliothèque JPG

Ce dossier contient les workflows n8n pour automatiser l'ingestion et le reporting de la bibliothèque.

## Workflows

### 1. Ingestion v2 (`workflows/ingestion.json`)

**Objectif:** Automatiser l'ajout d'items au catalogue avec détection intelligente.

**Flux principal:**
```
┌─────────────────────────────────────────────────────────────┐
│  1. Google Drive Trigger (nouveau fichier)                  │
│                         ↓                                   │
│  2. Download Image                                          │
│                         ↓                                   │
│  3. Detect Barcode (GPT-4o Vision)                         │
│                         ↓                                   │
│  4. Parse Barcode Result                                    │
│                         ↓                                   │
│  5. Has Barcode? ─────────────────────────────────┐        │
│         │                                          │        │
│    [OUI - ISBN/EAN trouvé]                   [NON - Pas de code-barres]
│         ↓                                          ↓        │
│  ┌──────────────────────┐           ┌──────────────────────┐│
│  │ 6a. Google Books API │           │ 7a. Analyze Cover    ││
│  │         ↓            │           │     (GPT-4o Vision)  ││
│  │ 6b. Parse Response   │           │         ↓            ││
│  │         ↓            │           │ 7b. Parse Analysis   ││
│  │ 6c. Book Found?      │           │         ↓            ││
│  │    │        │        │           │ 7c. Google Image     ││
│  │  [NON]    [OUI]      │           │     Search           ││
│  │    ↓        │        │           │         ↓            ││
│  │ 6d. Open   │        │           │ 7d. Parse Image URL  ││
│  │   Library   │        │           └──────────────────────┘│
│  │    ↓        │        │                    │              │
│  │ 6e. Parse   │        │                    │              │
│  └──────────────────────┘                    │              │
│              │                               │              │
│              └───────────────┬───────────────┘              │
│                              ↓                              │
│                    8. Merge All Branches                    │
│                              ↓                              │
│                    9. Has Cover URL?                        │
│                         │        │                          │
│                    [OUI]        [NON]                       │
│                         ↓        ↓                          │
│              10a. Download   10c. Use                       │
│                  Cover       Original                       │
│                         │        │                          │
│                         └────┬───┘                          │
│                              ↓                              │
│                   11. Merge Cover Sources                   │
│                              ↓                              │
│                   12. Upload to Cloudinary                  │
│                              ↓                              │
│                   13. Prepare Notion Data                   │
│                              ↓                              │
│                   14. Create Notion Page                    │
│                              ↓                              │
│                   15. Move to Processed                     │
└─────────────────────────────────────────────────────────────┘
```

**Logique:**
1. **Photo avec code-barres visible** → Lecture ISBN → Google Books API → Open Library (fallback) → Télécharge couverture HD
2. **Photo sans code-barres** → Analyse visuelle GPT-4o → Recherche Google Images → Télécharge couverture

**APIs utilisées:**
- **Google Books API** - Gratuit, pas de clé requise
- **Open Library API** - Gratuit, pas de clé requise
- **Google Custom Search API** - 100 requêtes/jour gratuites, puis payant

### 2. Daily Report (`workflows/daily-report.json`)

**Objectif:** Envoyer un email quotidien avec les statistiques du catalogue.

**Flux:**
```
Cron (9h00 chaque jour)
    ↓
Query Notion (items récents)
    ↓
Process Data (stats)
    ↓
If has new items?
    ├── Yes → Generate HTML → Send Email
    └── No → Generate Empty Report → Send Email
```

---

## Configuration des Credentials

### 1. Google Drive OAuth2

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un projet ou sélectionner un existant
3. Activer l'API Google Drive
4. Créer des identifiants OAuth 2.0 (type: Application Web)
5. Ajouter l'URL de callback n8n: `https://n8n.srv859352.hstgr.cloud/rest/oauth2-credential/callback`
6. Dans n8n: Credentials → Add → Google Drive OAuth2 API
7. Coller Client ID et Client Secret
8. Cliquer "Sign in with Google" et autoriser

### 2. OpenAI API

1. Aller sur [OpenAI Platform](https://platform.openai.com/)
2. API Keys → Create new secret key
3. Dans n8n: Credentials → Add → OpenAI API
4. Coller la clé API

**Note:** Le workflow utilise GPT-4o Vision pour:
- Détecter les codes-barres (ISBN/EAN)
- Analyser les couvertures quand pas de code-barres

### 3. Cloudinary API

1. Aller sur [Cloudinary Console](https://cloudinary.com/console)
2. Dashboard → Account Details
3. Copier: Cloud name, API Key, API Secret
4. Dans n8n: Credentials → Add → Cloudinary API
5. Remplir les 3 champs

### 4. Notion API

1. Aller sur [Notion Integrations](https://www.notion.so/my-integrations)
2. Créer une nouvelle intégration "Bibliothèque JPG"
3. Copier le "Internal Integration Token" (commence par `secret_`)
4. **Important:** Partager la database Notion avec l'intégration
5. Dans n8n: Credentials → Add → Notion API
6. Coller le token

### 5. Google Custom Search API (pour recherche d'images)

**Étape 1: Activer l'API**
1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Enable APIs
3. Chercher "Custom Search API" et l'activer
4. APIs & Services → Credentials → Create Credentials → API Key
5. Copier la clé API

**Étape 2: Créer un moteur de recherche personnalisé**
1. Aller sur [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Cliquer "Add" pour créer un nouveau moteur
3. Dans "Sites to search", entrer `*.com` (recherche globale)
4. Nommer le moteur "Bibliotheque JPG Images"
5. Créer le moteur
6. Aller dans "Overview" → Copier le "Search engine ID" (cx)

**Coût:** 100 requêtes/jour gratuites, puis $5 pour 1000 requêtes

### 6. SMTP (pour les emails)

Option A: Gmail
1. Activer l'authentification à 2 facteurs sur Gmail
2. Créer un mot de passe d'application: [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Dans n8n: Credentials → Add → SMTP
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: votre email Gmail
   - Password: le mot de passe d'application généré
   - SSL/TLS: STARTTLS

Option B: Autre fournisseur
- Utiliser les paramètres SMTP de votre fournisseur

---

## Variables d'environnement (n8n)

Configurer ces variables dans n8n (Settings → Variables):

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DRIVE_FOLDER_ID` | ID du dossier Drive pour les nouvelles images | `1abc...xyz` |
| `DRIVE_PROCESSED_FOLDER_ID` | ID du dossier pour les images traitées | `1def...uvw` |
| `DRIVE_ERROR_FOLDER_ID` | ID du dossier pour les erreurs | `1ghi...rst` |
| `NOTION_DATABASE_ID` | ID de la database Notion | `abc123...` |
| `GOOGLE_SEARCH_API_KEY` | Clé API Google Custom Search | `AIza...` |
| `GOOGLE_SEARCH_CX` | ID du moteur de recherche personnalisé | `012345:abcdef` |
| `NOTIFICATION_EMAIL` | Email pour recevoir les rapports | `kevin@example.com` |
| `APP_URL` | URL de l'application déployée | `https://bibliotheque-jpg.vercel.app` |

### Comment trouver l'ID d'un dossier Google Drive

1. Ouvrir le dossier dans Google Drive
2. L'URL ressemble à: `https://drive.google.com/drive/folders/1ABC123xyz`
3. L'ID est la partie après `/folders/`: `1ABC123xyz`

### Comment trouver l'ID de la database Notion

1. Ouvrir la database dans Notion (vue pleine page)
2. L'URL ressemble à: `https://www.notion.so/workspace/abc123def456...`
3. L'ID est la partie de 32 caractères (sans tirets): `abc123def456...`

---

## Structure des dossiers Google Drive

Créer cette structure:
```
📁 Bibliothèque JPG
├── 📁 Inbox       ← Dossier surveillé (nouvelles images)
├── 📁 Processed   ← Images traitées avec succès
└── 📁 Errors      ← Images en erreur
```

---

## Test des Workflows

### Test Ingestion - Scénario 1: Livre avec code-barres

1. Activer le workflow
2. Prendre une photo du **dos d'un livre** (code-barres visible)
3. Déposer l'image dans le dossier Inbox
4. Vérifier:
   - [ ] Code-barres détecté par GPT-4o
   - [ ] Informations récupérées depuis Google Books
   - [ ] Couverture HD téléchargée depuis le web
   - [ ] Image uploadée sur Cloudinary
   - [ ] Page créée dans Notion avec toutes les infos

### Test Ingestion - Scénario 2: Livre sans code-barres

1. Prendre une photo de la **couverture d'un livre** (pas de code-barres)
2. Déposer l'image dans le dossier Inbox
3. Vérifier:
   - [ ] GPT-4o analyse la couverture
   - [ ] Titre et auteur extraits
   - [ ] Recherche Google Images lancée
   - [ ] Meilleure couverture téléchargée (ou original utilisé)
   - [ ] Page créée dans Notion

### Test Daily Report

1. Activer le workflow
2. Exécuter manuellement (bouton "Execute Workflow")
3. Vérifier:
   - [ ] La requête Notion fonctionne
   - [ ] Les stats sont calculées
   - [ ] L'email est envoyé

---

## Troubleshooting

### "Barcode not detected"
- Assurez-vous que le code-barres est bien visible et net
- Essayez avec une meilleure luminosité
- Le workflow passera automatiquement en mode "analyse visuelle"

### "Google Books API returns no results"
- L'ISBN peut être incorrect ou non répertorié
- Le workflow essaiera automatiquement Open Library
- Si les deux échouent, l'image originale sera utilisée

### "Google Image Search failed"
- Vérifiez la clé API et le CX
- Vérifiez le quota (100/jour gratuit)
- Le workflow utilisera l'image originale en fallback

### "Google Drive trigger not firing"
- Vérifier que le workflow est activé
- Vérifier les permissions du credential Google Drive
- Essayer de recréer le credential OAuth

### "OpenAI Vision error"
- Vérifier le quota API OpenAI
- Vérifier que le modèle `gpt-4o` est disponible sur votre compte
- Vérifier le format de l'image (doit être PNG, JPG, WEBP, GIF)

### "Notion page creation failed"
- Vérifier que l'intégration a accès à la database
- Vérifier que les noms de propriétés correspondent au schéma
- Vérifier la Notion-Version header (2022-06-28)

### "Cloudinary upload failed"
- Vérifier les credentials (cloud name, API key, API secret)
- Vérifier que le folder "bibliotheque-jpg" existe ou sera créé

### "Email not sent"
- Vérifier les credentials SMTP
- Pour Gmail: vérifier le mot de passe d'application
- Vérifier que l'email destinataire est valide

---

## Coûts estimés

| Service | Gratuit | Payant |
|---------|---------|--------|
| Google Books API | Illimité | - |
| Open Library API | Illimité | - |
| Google Custom Search | 100/jour | $5/1000 req |
| OpenAI GPT-4o | - | ~$0.01/image |
| Cloudinary | 25 crédits/mois | Variable |
| n8n | Self-hosted | - |

**Estimation pour 2000 items:**
- OpenAI: ~$20-40 (selon le nombre d'appels par item)
- Google Search: ~$10-20 (si dépassement quota)
- Cloudinary: Inclus dans le plan gratuit

---

## Documentation

Voir `/docs/N8N_WORKFLOWS.md` pour les spécifications détaillées des workflows.

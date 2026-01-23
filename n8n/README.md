# n8n Workflows - Bibliothèque JPG

Ce dossier contient les workflows n8n pour automatiser l'ingestion et le reporting de la bibliothèque.

## Workflows

### 1. Ingestion (`workflows/ingestion.json`)

**Objectif:** Automatiser l'ajout d'items au catalogue depuis Google Drive.

**Flux:**
```
Google Drive (nouveau fichier)
    ↓
Detect Type (Code node)
    ↓
Download from Drive
    ↓
OpenAI Vision (GPT-4o)
    ↓
Parse Response (Code node)
    ↓
Upload to Cloudinary
    ↓
Create Notion Page
    ↓
Move to Processed/Error folder
```

**Déclencheur:** Nouveau fichier dans le dossier Google Drive configuré

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

**Déclencheur:** Cron quotidien à 9h00

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

**Note:** Assurez-vous d'avoir accès à GPT-4o Vision (gpt-4o)

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

### 5. SMTP (pour les emails)

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

## Importation des Workflows

### Méthode 1: Interface n8n

1. Ouvrir n8n: `https://n8n.srv859352.hstgr.cloud`
2. Workflows → Import from File
3. Sélectionner `ingestion.json` ou `daily-report.json`
4. Remplacer les placeholders de credentials:
   - `GOOGLE_DRIVE_CREDENTIAL_ID` → ID de votre credential Google Drive
   - `OPENAI_CREDENTIAL_ID` → ID de votre credential OpenAI
   - `CLOUDINARY_CREDENTIAL_ID` → ID de votre credential Cloudinary
   - `NOTION_CREDENTIAL_ID` → ID de votre credential Notion
   - `SMTP_CREDENTIAL_ID` → ID de votre credential SMTP

### Méthode 2: API n8n

```bash
# Avec le MCP n8n-server configuré, demander à Claude:
"Importe le workflow ingestion.json dans mon instance n8n"
```

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

### Test Ingestion

1. Activer le workflow
2. Déposer une image de livre/CD/vinyle dans le dossier Inbox
3. Vérifier:
   - [ ] Le fichier est téléchargé
   - [ ] OpenAI analyse l'image
   - [ ] L'image est uploadée sur Cloudinary
   - [ ] Une page est créée dans Notion
   - [ ] Le fichier est déplacé vers Processed

### Test Daily Report

1. Activer le workflow
2. Exécuter manuellement (bouton "Execute Workflow")
3. Vérifier:
   - [ ] La requête Notion fonctionne
   - [ ] Les stats sont calculées
   - [ ] L'email est envoyé

---

## Troubleshooting

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

## Documentation

Voir `/docs/N8N_WORKFLOWS.md` pour les spécifications détaillées des workflows.

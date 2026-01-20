# Guide de Test - Système d'Authentification

Ce document contient tous les tests à effectuer avant de créer la PR pour la Phase 2 (Authentification).

## ✅ Tests Préliminaires

### 1. Compilation TypeScript
```bash
npm run build
```
**Résultat attendu:** Build réussi sans erreurs TypeScript

### 2. Serveur de Développement
```bash
npm run dev
```
**Résultat attendu:** Serveur démarré sur http://localhost:3000

---

## 🧪 Tests Fonctionnels

### Test 1: Page de Login - Affichage Initial
**URL:** http://localhost:3000

**Actions:**
1. Ouvrir l'URL dans le navigateur

**Résultat attendu:**
- [ ] La page de login s'affiche avec un design propre
- [ ] Le formulaire contient deux champs : "Mot de passe familial" et "Quel est ton prénom ?"
- [ ] Un bouton "Se connecter" est présent
- [ ] Pas de message d'erreur affiché

---

### Test 2: Login - Champs Vides
**URL:** http://localhost:3000

**Actions:**
1. Cliquer sur "Se connecter" sans remplir les champs

**Résultat attendu:**
- [ ] Message d'erreur : "Veuillez remplir tous les champs"
- [ ] L'utilisateur reste sur la page de login
- [ ] Aucune redirection

---

### Test 3: Login - Mauvais Mot de Passe
**URL:** http://localhost:3000

**Actions:**
1. Entrer "test123" dans le champ mot de passe
2. Entrer "Marie" dans le champ prénom
3. Cliquer sur "Se connecter"

**Résultat attendu:**
- [ ] Redirection vers /gallery (note: la page gallery n'existe pas encore, donc Next.js affichera 404 - c'est normal)
- [ ] Cookie `familyName=Marie` créé (vérifier dans DevTools → Application → Cookies)

---

### Test 4: Login - Mauvais Mot de Passe
**URL:** http://localhost:3000

**Actions:**
1. Entrer "wrongpassword" dans le champ mot de passe
2. Entrer "Jean" dans le champ prénom
3. Cliquer sur "Se connecter"

**Résultat attendu:**
- [ ] Message d'erreur : "Mot de passe incorrect"
- [ ] L'utilisateur reste sur la page de login
- [ ] Aucun cookie créé

---

### Test 5: Login - Nom avec Caractères Spéciaux
**URL:** http://localhost:3000

**Actions:**
1. Entrer "test123" dans le champ mot de passe
2. Entrer "<script>alert('xss')</script>" dans le champ prénom
3. Cliquer sur "Se connecter"

**Résultat attendu:**
- [ ] Message d'erreur : "Le nom contient des caractères non autorisés"
- [ ] L'utilisateur reste sur la page de login
- [ ] Protection XSS fonctionne

---

### Test 6: API Check - Sans Cookie
**URL:** http://localhost:3000/api/auth/check

**Actions:**
1. Supprimer tous les cookies du site (DevTools → Application → Cookies → Clear All)
2. Ouvrir l'URL directement dans le navigateur

**Résultat attendu:**
```json
{
  "authenticated": false,
  "user": null
}
```

---

### Test 7: API Check - Avec Cookie
**URL:** http://localhost:3000/api/auth/check

**Actions:**
1. Se connecter avec succès (Test 3)
2. Ouvrir l'URL directement dans le navigateur

**Résultat attendu:**
```json
{
  "authenticated": true,
  "user": {
    "name": "Marie",
    "type": "family"
  }
}
```

---

### Test 8: Protection Middleware - Route Protégée Sans Auth
**URL:** http://localhost:3000/gallery (ou /dashboard)

**Actions:**
1. Supprimer tous les cookies
2. Essayer d'accéder à /gallery

**Résultat attendu:**
- [ ] Redirection automatique vers la page de login (/)
- [ ] Aucune erreur dans la console

---

### Test 9: Association - Slug Valide
**URL:** http://localhost:3000/public/mediatheque-orgelet

**Actions:**
1. Ouvrir l'URL directement (sans login)

**Résultat attendu:**
- [ ] Page s'affiche avec le header "Médiathèque Orgelet"
- [ ] Texte : "Bienvenue Médiathèque Orgelet !"
- [ ] Aucune redirection vers login

---

### Test 10: Association - Slug Invalide
**URL:** http://localhost:3000/public/slug-inexistant

**Actions:**
1. Ouvrir l'URL directement

**Résultat attendu:**
- [ ] Redirection automatique vers la page de login (/)
- [ ] Middleware bloque l'accès

---

### Test 11: API Association Items - Slug Valide
**URL:** http://localhost:3000/api/public/mediatheque-orgelet/items

**Actions:**
1. Ouvrir l'URL directement dans le navigateur

**Résultat attendu:**
```json
{
  "items": []
}
```
**Note:** Le tableau est vide car il n'y a pas encore de données Notion, mais l'API répond correctement.

---

### Test 12: API Association Items - Slug Invalide
**URL:** http://localhost:3000/api/public/slug-invalide/items

**Actions:**
1. Ouvrir l'URL directement dans le navigateur

**Résultat attendu:**
```json
{
  "error": "Association invalide"
}
```
**Status:** 404

---

### Test 13: Logout
**URL:** http://localhost:3000

**Actions:**
1. Se connecter avec succès
2. Ouvrir la console DevTools
3. Exécuter :
```javascript
fetch('/api/auth/logout', { method: 'POST' }).then(r => r.json()).then(console.log)
```

**Résultat attendu:**
```json
{
  "success": true
}
```
- [ ] Cookie `familyName` supprimé (vérifier dans DevTools)

---

### Test 14: Persistance du Cookie
**URL:** http://localhost:3000

**Actions:**
1. Se connecter avec succès
2. Fermer complètement le navigateur
3. Rouvrir le navigateur
4. Aller sur http://localhost:3000/api/auth/check

**Résultat attendu:**
- [ ] Cookie toujours présent
- [ ] API check retourne `authenticated: true`
- [ ] Session persiste (maxAge: 1 an)

---

## 🔍 Tests de Sécurité

### Test 15: SQL Injection dans le Nom
**Actions:**
1. Entrer "test123" comme mot de passe
2. Entrer "'; DROP TABLE users; --" comme prénom
3. Cliquer sur "Se connecter"

**Résultat attendu:**
- [ ] Pas d'erreur serveur
- [ ] Le nom est sanitisé ou refusé
- [ ] Aucune injection possible (Notion API gère automatiquement)

---

### Test 16: Longueur Maximale du Nom
**Actions:**
1. Entrer "test123" comme mot de passe
2. Entrer un nom de plus de 50 caractères
3. Cliquer sur "Se connecter"

**Résultat attendu:**
- [ ] Message d'erreur ou troncation à 50 caractères
- [ ] Input HTML limite à maxLength={50}

---

## 📊 Checklist Finale

Avant de créer la PR, vérifier :

- [ ] Tous les tests ci-dessus passent
- [ ] Aucune erreur dans la console navigateur
- [ ] Aucune erreur dans le terminal serveur (sauf warnings bcrypt/Edge Runtime attendus)
- [ ] Le code compile sans erreurs TypeScript (`npm run build`)
- [ ] Les fichiers suivants existent et sont corrects :
  - [ ] `lib/auth.ts` (toutes les fonctions)
  - [ ] `types/index.ts` (types auth)
  - [ ] `middleware.ts` (protection routes)
  - [ ] `app/page.tsx` (login)
  - [ ] `app/api/auth/route.ts` (POST login)
  - [ ] `app/api/auth/check/route.ts` (GET check)
  - [ ] `app/api/auth/logout/route.ts` (POST logout)
  - [ ] `app/public/[slug]/page.tsx` (page association)
  - [ ] `app/api/public/[slug]/items/route.ts` (API items association)

---

## 🚀 Notes de Déploiement

**Pour la production:**
1. Hasher le mot de passe famille avec bcrypt :
```bash
npx tsx -e "import bcrypt from 'bcryptjs'; bcrypt.hash('VOTRE_MOT_DE_PASSE', 10).then(console.log)"
```
2. Mettre le hash dans `FAMILY_PASSWORD` dans les variables d'environnement
3. Le système détectera automatiquement que c'est un hash et utilisera bcrypt

**Sécurité:**
- `httpOnly: false` est nécessaire pour que le client puisse lire le nom (UI)
- `secure: true` en production (HTTPS only)
- `sameSite: 'lax'` protège contre CSRF

---

## ❓ Problèmes Connus

### Warning bcrypt/Edge Runtime
**Message:** "A Node.js module is loaded ('crypto') which is not supported in the Edge Runtime"

**Explication:** bcrypt utilise Node.js crypto, incompatible avec Edge Runtime. Ce n'est pas bloquant car nos routes API utilisent Node.js runtime (pas Edge).

**Solution:** Ignorer le warning ou utiliser bcryptjs alternatif edge-compatible plus tard.

---

## 📝 Après les Tests

Si tous les tests passent :
1. Commit final si nécessaire
2. Push sur `claude/feat-auth-system-Yz9ma`
3. Créer la PR vers `main` avec le titre : "feat(auth): Phase 2 - Authentication System"
4. Référencer ce document dans la PR pour review

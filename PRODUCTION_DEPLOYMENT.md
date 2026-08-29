# 🚀 GUIDE DE DÉPLOIEMENT EN PRODUCTION — MONEYLINK FINTECH

> **MoneyLink** — Système de paiement sécurisé, séquestre (escrow), tontines/coffres d'épargne et abonnements au Sénégal & zone UEMOA (Monnaie : FCFA / XOF).

---

## 📑 Sommaire

1. [Architecture Globale du Système](#1-architecture-globale-du-système)
2. [Inventaire des Variables d'Environnement](#2-inventaire-des-variables-denvironnement)
3. [Base de Données Relationnelle (PostgreSQL)](#3-base-de-données-relationnelle-postgresql)
4. [Déploiement du Backend API (Node.js / Express)](#4-déploiement-du-backend-api-nodejs--express)
5. [Déploiement du Dashboard Admin (React / Vite)](#5-déploiement-du-dashboard-admin-react--vite)
6. [Déploiement du Site Web Public MoneyLink](#6-déploiement-du-site-web-public-moneylink)
7. [Configuration Nginx, Domaine & Certificats HTTPS (SSL)](#7-configuration-nginx-domaine--certificats-https-ssl)
8. [Préparation & Publication Mobile (Flutter)](#8-préparation--publication-mobile-flutter)
   - [Checklist Google Play Store (Android)](#checklist-google-play-store-android)
   - [Checklist Apple App Store (iOS)](#checklist-apple-app-store-ios)
9. [Passage en Production des Paiements (Wave & Orange Money)](#9-passage-en-production-des-paiements-wave--orange-money)
10. [Checklist Finale Avant Mise en Ligne (Go-Live)](#10-checklist-finale-avant-mise-en-ligne-go-live)

---

## 1. Architecture Globale du Système

```
                                    ┌───────────────────────────────┐
                                    │    DNS Cloudflare / Route 53  │
                                    │   (*.moneylink.sn / HTTPS)    │
                                    └──────────────┬────────────────┘
                                                   │
                                                   ▼
                                    ┌───────────────────────────────┐
                                    │   Reverse Proxy / SSL Nginx   │
                                    │      (Let's Encrypt TLS)      │
                                    └──────┬───────┬─────────┬──────┘
                                           │       │         │
                 ┌─────────────────────────┘       │         └──────────────────────────┐
                 ▼                                 ▼                                    ▼
   ┌───────────────────────────┐     ┌───────────────────────────┐        ┌───────────────────────────┐
   │    Dashboard Admin React  │     │   API Backend Node.js     │        │    Site Web Public        │
   │  admin.moneylink.sn       │     │   api.moneylink.sn        │        │    moneylink.sn           │
   │  (Port 3000 / Nginx SPA)  │     │   (Port 5000 / PM2)       │        │    (Landing Page HTML/JS) │
   └─────────────┬─────────────┘     └─────────────┬─────────────┘        └───────────────────────────┘
                 │                                 │
                 │   Requêtes HTTPS REST / JSON    │
                 └────────────────────────────────►│◄───────────────────────────────────┐
                                                   │                                    │
                                                   ▼                                    │
                                     ┌───────────────────────────┐                      │
                                     │  PostgreSQL 15+ (Dakar)   │                      │
                                     │  (Transactions, Séquestre,│                      │
                                     │   Users, Wallets, Audit)  │                      │
                                     └───────────────────────────┘                      │
                                                   ▲                                    │
                                                   │                                    │
                                 ┌─────────────────┴─────────────────┐                  │
                                 │      Passerelles Mobile Money     │                  │
                                 │   • Wave Business API (Webhooks)  │                  │
                                 │   • Orange Money Webpay (IPN)     │                  │
                                 └───────────────────────────────────┘                  │
                                                                                        │
                                 ┌───────────────────────────────────┐                  │
                                 │   Application Flutter Mobile      │──────────────────┘
                                 │   (Android APK/AAB & iOS IPA)     │
                                 └───────────────────────────────────┘
```

---

## 2. Inventaire des Variables d'Environnement

### A. Backend API (`backend/.env`)

| Variable | Exemple de Valeur en Production | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Active les optimisations Node et masque les stack traces |
| `PORT` | `5000` | Port d'écoute du serveur Node.js interne |
| `DATABASE_URL` | `postgresql://ml_user:STRONG_PWD@127.0.0.1:5432/moneylink_prod` | Chaîne de connexion PostgreSQL sécurisée |
| `USE_SQLITE` | `false` | Désactive SQLite pour utiliser PostgreSQL |
| `JWT_SECRET` | `openssl rand -hex 32` (ex: 64 caractères aléatoires) | Clé de signature des jetons d'authentification |
| `JWT_EXPIRES_IN` | `7d` | Durée de validité des jetons JWT |
| `ESCROW_FEE_PERCENT`| `1.0` | Commission sur les transactions séquestrées (1%) |
| `CORS_ORIGIN` | `https://admin.moneylink.sn,https://moneylink.sn` | Domaines autorisés à appeler l'API en Cross-Origin |
| `WAVE_MERCHANT_ID` | `WAVE_SN_MONEYLINK_LIVE` | Identifiant Marchand officiel Wave Sénégal |
| `WAVE_API_KEY` | *(Fourni par Wave au contrat de production)* | Clé secrète API Wave |
| `ORANGE_MONEY_MERCHANT_ID`| `OM_SN_MONEYLINK_LIVE` | Code Marchand Orange Money Sénégal |

### B. Dashboard Admin (`admin/.env`)

| Variable | Exemple Local | Exemple Production |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:5000/api` | `https://api.moneylink.sn/api` |

### C. Application Mobile Flutter

Passée lors de la compilation via `--dart-define` :
```bash
# Compilation Production
flutter build appbundle --dart-define=API_BASE_URL=https://api.moneylink.sn/api --release
```

---

## 3. Base de Données Relationnelle (PostgreSQL)

### A. Séparation Stricte : Production vs Test

> [!CAUTION]
> **Ne chargez jamais `database/seeds/seed.sql` en environnement de production**. Les revenus simulés et les commandes de test ne doivent exister qu'en développement.

1. **En Production** : Exécutez **uniquement** `database/schema.sql`.
2. Créez ensuite manuellement le compte Super-Administrateur initial via l'API ou un script d'initialisation sécurisé avec un mot de passe fort.

### B. Commandes d'Initialisation PostgreSQL (Serveur Linux)

```bash
# 1. Se connecter à PostgreSQL
sudo -u postgres psql

# 2. Créer l'utilisateur et la base de production
CREATE USER moneylink_prod_user WITH ENCRYPTED PASSWORD 'VOTRE_MOT_DE_PASSE_TRES_FORT_ici_2026';
CREATE DATABASE moneylink_prod OWNER moneylink_prod_user;
GRANT ALL PRIVILEGES ON DATABASE moneylink_prod TO moneylink_prod_user;
\q

# 3. Appliquer le schéma de tables, index et triggers
psql -U moneylink_prod_user -d moneylink_prod -h 127.0.0.1 -f database/schema.sql
```

### C. Sauvegardes Automatiques Quotidiennes (Cron)

Ajoutez un cron job (`crontab -e`) pour sauvegarder la base toutes les nuits à 02h00 :
```bash
0 2 * * * pg_dump -U moneylink_prod_user -h 127.0.0.1 moneylink_prod | gzip > /var/backups/moneylink/db_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
```

---

## 4. Déploiement du Backend API (Node.js / Express)

### A. Prérequis Serveur
- Node.js LTS (v18, v20 ou v22)
- PM2 (Process Manager pour Node.js) : `npm install -g pm2`

### B. Commandes de Mise en Service

```bash
# 1. Cloner ou copier le projet
cd /var/www/moneylink/backend

# 2. Installer les dépendances de production uniquement
npm ci --only=production

# 3. Créer le fichier .env de production
cp .env.example .env
nano .env  # Renseigner DATABASE_URL, JWT_SECRET, CORS_ORIGIN

# 4. Lancer l'API avec PM2 en mode cluster haute disponibilité
pm2 start src/server.js --name "moneylink-api" -i max --env production

# 5. Configurer le redémarrage automatique au reboot du serveur
pm2 save
pm2 startup
```

### C. Vérification de Santé (Health Check)
```bash
curl -I http://localhost:5000/api/health
# Réponse attendue : HTTP/1.1 200 OK
```

---

## 5. Déploiement du Dashboard Admin (React / Vite)

Le Dashboard Admin est une application Single Page Application (SPA) compilée en fichiers statiques ultra-rapides et hébergée directement via Nginx ou Cloudflare Pages / Vercel.

### A. Commandes de Compilation

```bash
cd /var/www/moneylink/admin

# 1. Configurer l'URL de l'API de production
echo "VITE_API_URL=https://api.moneylink.sn/api" > .env.production

# 2. Installer les dépendances
npm ci

# 3. Compiler les assets statiques optimisés (Minification, Tree-shaking, Chunks gzip)
npm run build
# Les fichiers générés sont placés dans admin/dist/
```

---

## 6. Déploiement du Site Web Public MoneyLink

Le site web public (Landing page, présentation des fonctionnalités, tarifs, CGU et simulateur de séquestre) est configuré pour un hébergement statique haute performance (Render Static Site, Nginx ou Cloudflare Pages).

### A. Paramètres de Déploiement Render (Static Site)

| Paramètre Render | Valeur |
| :--- | :--- |
| **Service Type** | `Static Site` |
| **Name** | `moneylink-site` |
| **Root Directory** | `site` |
| **Build Command** | `npm run build` *(ou laisser vide)* |
| **Publish Directory** | `.` |
| **Routes / Rewrites** | Rewrite `/*` vers `/index.html` |
| **Variables d'environnement** | `API_URL=https://moneylink-kd6v.onrender.com` |
| **Domaines Personnalisés** | `moneylink.sn`, `www.moneylink.sn` |

### B. Commande Locale / Workspace
```bash
npm run build:site
```


---

## 7. Configuration Nginx, Domaine & Certificats HTTPS (SSL)

### A. Fichier de Configuration Nginx (`/etc/nginx/sites-available/moneylink`)

```nginx
# 1. Redirection HTTP vers HTTPS (Tous sous-domaines)
server {
    listen 80;
    listen [::]:80;
    server_name moneylink.sn www.moneylink.sn api.moneylink.sn admin.moneylink.sn;
    return 301 https://$host$request_uri;
}

# 2. API Backend (api.moneylink.sn)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.moneylink.sn;

    ssl_certificate /etc/letsencrypt/live/moneylink.sn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/moneylink.sn/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}

# 3. Dashboard Admin (admin.moneylink.sn)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.moneylink.sn;

    ssl_certificate /etc/letsencrypt/live/moneylink.sn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/moneylink.sn/privkey.pem;

    root /var/www/moneylink/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Mise en cache des assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}

# 4. Site Web Public / Landing Page (moneylink.sn & www.moneylink.sn)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name moneylink.sn www.moneylink.sn;

    ssl_certificate /etc/letsencrypt/live/moneylink.sn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/moneylink.sn/privkey.pem;

    root /var/www/moneylink/public_html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Sécurité des en-têtes HTTP
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### B. Configuration de la Zone DNS (`moneylink.sn`)

À configurer chez votre registrar de domaine (ex: NIC.SN, Cloudflare, OVH, Hostinger) :

| Type | Nom d'Hôte | Valeur / Cible | Description |
| :--- | :--- | :--- | :--- |
| **A** | `@` (moneylink.sn) | `IP_DE_VOTRE_SERVEUR` | Domaine principal (Site web / Landing page) |
| **A** ou **CNAME** | `www` | `moneylink.sn` | Alias web www |
| **A** | `api` | `IP_DE_VOTRE_SERVEUR` | Endpoint public de l'API Node.js |
| **A** | `admin` | `IP_DE_VOTRE_SERVEUR` | Interface d'administration |

### C. Obtention du Certificat SSL Let's Encrypt Gratuit
```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d moneylink.sn -d www.moneylink.sn -d api.moneylink.sn -d admin.moneylink.sn
```

---

## 8. Préparation & Publication Mobile (Flutter)

### Checklist Google Play Store (Android)

1. **Génération de la clé de signature (Upload Keystore)** :
   ```bash
   keytool -genkey -v -keystore moneylink-upload-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias moneylink-upload
   ```
2. **Configuration Gradle (`android/key.properties`)** :
   ```properties
   storePassword=VOTRE_MOT_DE_PASSE_KEYSTORE
   keyPassword=VOTRE_MOT_DE_PASSE_CLE
   keyAlias=moneylink-upload
   storeFile=/chemin/vers/moneylink-upload-key.jks
   ```
3. **Mise à jour des identifiants (`pubspec.yaml` & `android/app/build.gradle`)** :
   - Application ID : `sn.moneylink.app`
   - Version : `1.0.0+1`
   - Min SDK : `21` (Android 5.0 Lollipop)
   - Target SDK : `34` (Android 14)
4. **Compilation du bundle de production (`.aab`)** :
   ```bash
   cd mobile
   flutter clean
   flutter pub get
   flutter build appbundle --dart-define=API_BASE_URL=https://api.moneylink.sn/api --release
   ```
   *Fichier généré : `build/app/outputs/bundle/release/app-release.aab`*
5. **Assets & Fiches Google Play Console** :
   - Icône HD (512x512 PNG 32-bit).
   - Bannière graphique (1024x500 PNG/JPEG).
   - Captures d'écran (minimum 4 pour mobile).
   - Déclaration de politique de confidentialité (URL publique HTTPS).
   - Déclaration relative aux services financiers et conformité BCEAO / Sénégal.

---

### Checklist Apple App Store (iOS)

1. **Compte Apple Developer Program** (99$/an).
2. **Identifiants & Certificats** :
   - Bundle Identifier : `sn.moneylink.app`
   - Certificat de distribution : *Apple Distribution Certificate*
   - Profil de provisionnement : *App Store Provisioning Profile*
3. **Configuration Info.plist** :
   - `NSCameraUsageDescription` (Pour scanner les QR codes de paiement / séquestre).
   - `NSFaceIDUsageDescription` (Pour l'authentification biométrique rapide).
4. **Compilation et Téléversement via Xcode / Fastlane** :
   ```bash
   cd mobile
   flutter build ipa --dart-define=API_BASE_URL=https://api.moneylink.sn/api --release
   ```
5. **Validation TestFlight** :
   - Tests internes avec les marchands partenaires à Dakar.
   - Soumission à la revue Apple (App Review).

---

## 9. Passage en Production des Paiements (Wave & Orange Money)

| Étape | Action Requise |
| :--- | :--- |
| **1. Contrat Marchand** | Signature des conventions de partenariat avec Wave Digital Finance Sénégal et Sonatel / Orange Money. |
| **2. Clés Live API** | Réception des `API_KEY` et `MERCHANT_ID` de production dans le portail développeur officiel. |
| **3. Webhooks Sécurisés** | Enregistrement de l'URL publique `https://api.moneylink.sn/api/webhooks/wave` et `https://api.moneylink.sn/api/webhooks/orange-money` avec signature HMAC SHA-256. |
| **4. Isolation Séquestre** | Vérification que le compte de cantonnement bancaire (compte séquestre) est audité et séparé du compte d'exploitation de MoneyLink. |

---

## 10. Checklist Finale Avant Mise en Ligne (Go-Live)

- [x] Toutes les références à `localhost:5000` sont dynamisées via variables d'environnement (`VITE_API_URL` et `--dart-define=API_BASE_URL`).
- [x] L'analyse statique Flutter passe à 100% sans erreur (`flutter analyze`).
- [x] Tous les tests unitaires et d'intégration backend sont validés (`npm test`).
- [x] Le build du Dashboard Admin React/Vite est réussi (`npm run build`).
- [x] La politique CORS protège l'API contre les requêtes non autorisées.
- [x] Les données de démonstration (`seeds/`) sont strictement séparées de la base de production.
- [x] Le secret JWT (`JWT_SECRET`) est configuré avec une chaîne aléatoire cryptographique.
- [x] L'endpoint de surveillance `/health` et `/api/health` retourne le statut HTTP 200.

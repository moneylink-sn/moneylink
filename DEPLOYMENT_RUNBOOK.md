# 🌐 MoneyLink V2.5 — Runbook de Déploiement & Exploitation en Production

> **Guide Opérationnel & Procédures d'Exploitation (SOP - Standard Operating Procedures)**  
> *Dernière révision : 31 Août 2026*

---

## 1. 🏗️ Architecture Globale de Production

### 1.1 Domaines & URLs de Déploiement

| Composant | Domaine Officiel | URL Actuelle Staging/Render | Description |
| :--- | :--- | :--- | :--- |
| **Site Web Public & Marketplace** | `https://moneylink.sn` | `https://moneylink-site.onrender.com` | Landing page, catalogue public, séquestre 6 étapes, early access |
| **Backend API Core** | `https://api.moneylink.sn` | `https://moneylink-kd6v.onrender.com` | API REST Node.js, moteur de séquestre, webhooks, auth JWT |
| **Console d'Administration** | `https://admin.moneylink.sn` | `https://moneylink-1.onrender.com` | Dashboard de modération, KPIs, analytics et gestion des litiges |

```
                  ┌─────────────────────────────────────┐
                  │          Clients / Users            │
                  │   (Mobile Flutter / Web Landing)    │
                  └──────────────────┬──────────────────┘
                                     │ HTTPS / TLS 1.3
                                     ▼
                  ┌─────────────────────────────────────┐
                  │       Reverse Proxy / Cloud CDN     │
                  │      (Certificats SSL / HSTS)       │
                  └──────────────────┬──────────────────┘
                                     │ Reverse Proxy
                                     ▼
                  ┌─────────────────────────────────────┐
                  │     MoneyLink Core API (Node.js)    │
                  │   - Express 4.x (ES Modules)        │
                  │   - Helmet, Rate Limiter, CORS      │
                  │   - Escrow Engine & Webhooks        │
                  └──────────────────┬──────────────────┘
                                     │ Pool TCP (SSL)
                                     ▼
                  ┌─────────────────────────────────────┐
                  │    PostgreSQL 15+ Haute Dispo       │
                  │   - Schéma relationnel strict       │
                  │   - Transactions ACID séquestre     │
                  │   - Triggers updated_at & Index     │
                  └─────────────────────────────────────┘
```

---

## 2. 🔐 Checklist des Variables d'Environnement (`.env`)

En production, **toutes** les variables ci-dessous doivent impérativement être définies dans l'environnement du serveur d'hébergement :

| Variable | Description | Exemple / Format |
| :--- | :--- | :--- |
| `NODE_ENV` | Mode d'exécution | `production` |
| `PORT` | Port d'écoute | `5000` ou attribué dynamiquement |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `JWT_SECRET` | Clé cryptographique forte (64 hex) | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Durée de validité des tokens | `7d` |
| `CORS_ORIGIN` | Domaines autorisés (séparés par virgule) | `https://moneylink.sn,https://admin.moneylink.sn` |
| `ESCROW_FEE_PERCENT`| Commission séquestre | `1.0` |
| `WAVE_API_KEY` | Clé API Wave Production | Fournie par Wave Sénégal |
| `WAVE_WEBHOOK_SECRET`| Secret HMAC Webhook Wave | Fourni par Wave Sénégal |
| `ORANGE_MONEY_CLIENT_ID`| Client ID OAuth Orange | Fourni par Orange Developer |
| `ORANGE_MONEY_CLIENT_SECRET`| Client Secret Orange | Fourni par Orange Developer |
| `ORANGE_MONEY_MERCHANT_KEY` | Clé Marchand OM | Fournie par Orange Finances |
| `ORANGE_MONEY_WEBHOOK_SECRET`| Secret Webhook OM | Défini lors du setup |

---

## 3. 🐘 Gestion de la Base de Données & Migrations

### 3.1 Initialisation Initiale (Schéma Vierge)
```bash
# Exécution du script d'initialisation sécurisé
node database/init.js
```

### 3.2 Séparation Stricte des Données de Démo
- Le schéma de production (`database/schema.sql`) **ne contient aucune donnée fictive**.
- Les jeux de données de démonstration sont cantonnés à `database/seeds/seed.sql` et ne doivent **JAMAIS** être injectés en production.

### 3.3 Application d'une Nouvelle Migration
```bash
# Exemple pour appliquer une migration incrémentale :
psql $DATABASE_URL -f database/migrations/001_create_analytics_events.sql
```

---

## 4. 🩺 Endpoints de Santé & Monitoring

| Endpoint | Méthode | Description | Code Attendu |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | Endpoint léger pour les load balancers | `200 OK` (`{"status":"UP"}`) |
| `/api/health` | `GET` | Diagnostic complet incluant la connexion PostgreSQL | `200 OK` (`{"status":"UP", "database":{"connected":true}}`) |

---

## 5. 💾 Sauvegardes & Contrôle d'Intégrité

### 5.1 Sauvegarde Automatisée (Cron Job Quotidien)
```bash
# Sauvegarde quotidienne compressée
pg_dump $DATABASE_URL -F c -b -v -f /backups/moneylink_$(date +\%Y\%m\%d_\%H\%M\%S).dump
```

### 5.2 Restauration d'une Sauvegarde
```bash
# Restauration d'un point de sauvegarde
pg_restore -d $DATABASE_URL -v -c /backups/moneylink_20260831_120000.dump
```

### 5.3 Audit d'Intégrité Comptable
```bash
node database/backup.js
```

---

## 6. 🚨 Procédure d'Urgence & Rollback

En cas d'anomalie critique post-déploiement :

1. **Rollback Applicatif Immédiat** :
   - Redéployer le tag Git stable précédent (`git checkout v2.0.0 && npm install && npm restart`).
   - Sur Render / Cloud Run : déclencher "Rollback to previous commit".
2. **Vérification de l'Intégrité des Soldes** :
   - Lancer `node database/backup.js` pour s'assurer qu'aucun écart de fonds n'est survenu.
3. **Communication** :
   - En cas d'interruption temporaire des passerelles partenaires, les fonds sous séquestre restent protégés et les commandes passent en attente sans risque de perte financière.

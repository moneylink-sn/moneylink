# MoneyLink — API Backend (Node.js & Express)

API REST complète du cœur financier **MoneyLink**, gérant les flux de séquestre (escrow), les commandes e-commerce, les coffres d'épargne (tontines), les marchands, les utilisateurs et le dashboard administrateur.

---

## 1. Installation & Démarrage

```bash
# Se placer dans le dossier backend
cd backend

# Installer les dépendances
npm install

# Démarrer le serveur en mode développement (avec auto-reload)
npm run dev

# Ou démarrer en mode standard
npm start
```

Le serveur sera accessible sur **`http://localhost:5000`**.

---

## 2. Endpoints de l'API REST

### 🔐 Authentification (`/api/auth`)
- `POST /api/auth/register` : Inscription d'un client ou commerçant
- `POST /api/auth/login` : Connexion (JWT)
- `GET /api/auth/profile` : Profil de l'utilisateur connecté `[Auth]`

### 🏪 Commerçants & Catalogue (`/api/merchants`)
- `GET /api/merchants` : Liste des marchands vérifiés
- `GET /api/merchants/:id` : Profil du marchand et catalogue produits
- `GET /api/merchants/me/stats` : Métriques et volume des ventes `[Marchand]`
- `POST /api/merchants/products` : Ajout d'un produit au catalogue `[Marchand]`

### 📦 Commandes & Séquestre (`/api/orders`)
- `POST /api/orders` : Créer une commande `[Auth]`
- `GET /api/orders` : Liste des commandes (Acheteur ou Marchand) `[Auth]`
- `GET /api/orders/:id` : Détails d'une commande `[Auth]`
- `PUT /api/orders/:id/ship` : Marquer comme expédiée `[Marchand]`
- `POST /api/orders/:id/validate-code` : Valider le code secret OTP pour libérer les fonds `[Auth]`
- `POST /api/orders/:id/confirm` : Confirmation directe 1-clic par l'acheteur `[Auth]`
- `POST /api/orders/:id/dispute` : Ouvrir un litige `[Auth]`

### 💳 Paiements & Portefeuille (`/api/payments`)
- `POST /api/payments/checkout` : Payer une commande (Wave, Orange Money, Solde) `[Auth]`
- `POST /api/payments/topup` : Recharger son portefeuille MoneyLink `[Auth]`
- `GET /api/payments/wallet` : Consulter son solde disponible & bloqué en séquestre `[Auth]`
- `GET /api/payments/transactions` : Historique des transactions `[Auth]`

### 💰 Coffres d'Épargne & Tontines (`/api/savings`)
- `POST /api/savings` : Créer un coffre personnel ou collectif `[Auth]`
- `GET /api/savings` : Liste de ses coffres et tontines `[Auth]`
- `GET /api/savings/:id` : Détail et historique des versements `[Auth]`
- `POST /api/savings/:id/contribute` : Effectuer un versement dans un coffre `[Auth]`
- `POST /api/savings/:id/invite` : Inviter un membre dans un coffre collectif `[Auth]`

### 🛡️ Dashboard Administrateur (`/api/admin`)
- `GET /api/admin/dashboard` : Métriques globales & KPIs financiers `[Admin]`
- `GET /api/admin/users` : Liste complète des utilisateurs & soldes `[Admin]`
- `PUT /api/admin/users/:id/status` : Modifier le statut d'un utilisateur `[Admin]`
- `GET /api/admin/disputes` : Liste des litiges `[Admin]`
- `POST /api/admin/disputes/:id/resolve` : Arbitrer un litige (Rembourser ou Libérer) `[Admin]`

### 🔔 Notifications (`/api/notifications`)
- `GET /api/notifications` : Liste des notifications reçues `[Auth]`
- `PUT /api/notifications/:id/read` : Marquer une notification comme lue `[Auth]`
- `PUT /api/notifications/read-all` : Tout marquer comme lu `[Auth]`

---

## 3. Lancer les Tests Automatisés E2E

Une fois le serveur démarré :
```bash
npm test
```
Ce script exécute en boucle fermée : l'authentification, le parcours d'achat, le blocage des fonds en séquestre, la validation du code OTP de remise en main propre, la création de coffre d'épargne et la consultation du tableau de bord d'administration.

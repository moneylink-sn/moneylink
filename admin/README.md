# MoneyLink — Dashboard Administrateur (React + Vite)

Tableau de bord d'administration et de supervision financière de **MoneyLink** permettant la gestion des utilisateurs, commerçants, flux de séquestre (escrow), arbitrage des litiges avec remboursement en 1-clic et surveillance des coffres d'épargne.

---

## 1. Installation & Démarrage

```bash
# 1. Se placer dans le dossier admin
cd admin

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement Vite
npm run dev
```

Le dashboard sera accessible sur **`http://localhost:3000`**.

---

## 2. Identifiants Administrateur de Démonstration

* **Identifiant** : `admin@moneylink.sn` (ou `+221770000001`)
* **Mot de passe** : `Password123!`

---

## 3. Modules Inclus

1. **Dashboard & KPIs** : Volume total des transactions, fonds sous séquestre, nombre d'utilisateurs et de commerçants.
2. **Utilisateurs** : Liste complète, filtres par rôle (Client/Marchand/Admin), recherche et suspension de compte.
3. **Commerçants** : Annuaire des boutiques et badges de vérification.
4. **Commandes Séquestre** : Suivi du cycle de vie des commandes (`PENDING_PAYMENT` à `CONFIRMED`).
5. **Litiges & Arbitrages** : Modale d'arbitrage en 1-clic pour rembourser l'acheteur ou libérer le commerçant.
6. **Coffres & Tontines** : Surveillance des montants collectés et progression des cagnottes.
7. **Journal d'Audit & Sécurité** : Historique immuable des actions sensibles.

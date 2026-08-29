# MoneyLink — Module Base de Données

Ce dossier contient les schémas relationnels, les index de performance, les triggers d'horodatage et les jeux de données de démonstration de la plateforme **MoneyLink**.

## Structure

```
database/
├── schema.sql              # Schéma complet PostgreSQL (UUID, Contraintes, Clés étrangères, Triggers)
├── sqlite_schema.sql       # Schéma équivalent SQLite (Option développement local léger)
├── init.js                 # Script d'assistance d'initialisation & migrations non-destructives
├── migrations/             # Migrations incrémentales sécurisées (CREATE IF NOT EXISTS)
│   └── 001_create_analytics_events.sql
└── seeds/
    ├── seed.sql            # Données de test PostgreSQL (Utilisateurs, Marchands, Commandes, Coffres)
    └── sqlite_seed.sql     # Données de test SQLite
```

## Comptes de Test par Défaut (Seeds)

Tous les comptes de démonstration utilisent le mot de passe : `Password123!`

| Rôle | Nom | Téléphone | Email | Solde Disponible |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Moustapha Gueye | `+221770000001` | `admin@moneylink.sn` | 5 000 000 FCFA |
| **COMMERÇANT** | Amadou Diop (*Diop Sports*) | `+221770000002` | `amadou@diopsports.sn` | 280 000 FCFA |
| **COMMERÇANT** | Fatou Ndiaye (*Dakar Tech*) | `+221770000003` | `fatou@dakartech.sn` | 450 000 FCFA |
| **CLIENT** | Moussa Fall | `+221770000004` | `moussa@gmail.com` | 150 000 FCFA |
| **CLIENT** | Awa Sow | `+221770000005` | `awa@gmail.com` | 85 000 FCFA |

## Commandes d'Exécution

### 1. Avec PostgreSQL (Recommandé)

```bash
# 1. Créer la base de données (si pas encore créée)
createdb -U postgres moneylink_db

# 2. Exécuter le schéma complet
psql -U postgres -d moneylink_db -f database/schema.sql

# 3. Ou appliquer les migrations incrémentales non destructives
npm run db:migrate

# 4. Charger les données de test (seeds)
psql -U postgres -d moneylink_db -f database/seeds/seed.sql
```

### 2. Avec SQLite (Développement local autonome)

```bash
# Créer et peupler la base SQLite
sqlite3 database/moneylink.db < database/sqlite_schema.sql
sqlite3 database/moneylink.db < database/seeds/sqlite_seed.sql
```

# MoneyLink — Architecture Technique & Spécifications

Plateforme de paiement sécurisé, séquestre (escrow), gestion de commandes et coffres d'épargne pour le Sénégal et la sous-région.

## 1. Principes Fondamentaux

- **Séquestre / Escrow Garanti** : Les fonds de l'acheteur sont bloqués de manière sécurisée dès la commande, et ne sont débloqués au vendeur qu'après confirmation explicite ou validation du code OTP de remise en main propre.
- **Zéro Clé Secrète Utilisateur** : Aucun mot de passe bancaire, code secret ou PIN Wave / Orange Money n'est collecté ou conservé.
- **Idempotence & Intégrité Comptable** : Chaque paiement porte une clé d'idempotence unique et s'appuie sur une comptabilité en partie double (`available_balance` vs `locked_balance`).
- **Architecture de Paiement Découplée (Driver Pattern)** : Un adaptateur `MockPaymentDriver` permet de simuler fidèlement les flux Wave / Orange Money en phase de développement, avant raccordement des API partenaires officielles.

## 2. Piles Technologiques Retenues

- **Backend** : Node.js (v20+) + Express + TypeScript, JWT, Zod, Helmet, Bcrypt
- **Base de Données** : PostgreSQL 15+ (Transactions ACID, verrous pessimistes)
- **Application Mobile** : Flutter (Dart) — UI moderne mobile-first, thème dark/light
- **Administration** : React 18 + Vite + Tailwind CSS / Dashboard moderne
- **Notifications** : Firebase Cloud Messaging + SMS/WhatsApp Webhooks

## 3. Découpage Modulaire

```
moneylink/
├── mobile/          # Application Mobile Flutter
├── backend/         # API REST Node.js / Express
├── admin/           # Dashboard Web Administrateur React
├── database/        # Schémas SQL, migrations & seeds
└── documentation/   # Spécifications & guides
```

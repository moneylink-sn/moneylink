# MoneyLink — Application Mobile (Flutter)

Application mobile moderne **MoneyLink** développée en Flutter (Dart), dédiée au marché sénégalais pour les paiements sécurisés avec séquestre (escrow), la gestion des commandes, la livraison par code secret OTP et les coffres d'épargne (personnels et tontines).

---

## 1. Structure de l'Application

```
mobile/
├── lib/
│   ├── core/
│   │   ├── constants/app_constants.dart    # Charte graphique & endpoints
│   │   ├── network/api_client.dart         # Gestion HTTP & JWT
│   │   ├── theme/app_theme.dart            # Thème FinTech moderne
│   │   └── utils/formatters.dart           # Formatage FCFA, dates, téléphones
│   ├── models/                             # Modèles de données typés
│   ├── providers/                          # Gestion d'état (AuthProvider, OrderProvider, SavingsProvider, PaymentProvider)
│   ├── screens/
│   │   ├── auth/                           # Splash, Connexion, Inscription
│   │   ├── home/                           # Accueil, solde double, actions rapides
│   │   ├── payment/                        # Paiement sécurisé, sélection méthode
│   │   ├── orders/                         # Suivi séquestre, code secret OTP, confirmation, litige
│   │   ├── savings/                        # Coffres personnels, tontines collectives, jauges
│   │   ├── notifications/                  # Historique des alertes
│   │   └── profile/                        # Paramètres, solde, déconnexion
│   └── main.dart                           # Point d'entrée Flutter
├── web/                                    # Support Web / PWA preview
└── pubspec.yaml
```

---

## 2. Commandes pour Lancer l'Application

```bash
# 1. Se placer dans le dossier mobile
cd mobile

# 2. Récupérer les dépendances Flutter
flutter pub get

# 3. Lancer l'application :
# Sur Chrome (Web Preview) :
flutter run -d chrome

# Sur émulateur Android / iOS :
flutter run
```

---

## 3. Identifiants de Démonstration Rapides (Seeds)

* **Client Particulier** : `+221770000004` / Mot de passe : `Password123!`
* **Commerçant Vendeur** : `+221770000002` / Mot de passe : `Password123!`

# MoneyLink — Parcours Utilisateurs & Flux Métiers

## 1. Flux Séquestre (Escrow) : Achat Sécurisé

1. **Création Commande** : L'acheteur sélectionne un produit d'un commerçant et valide son panier.
2. **Paiement & Séquestre** : L'acheteur paye via Wave / Orange Money / Solde MoneyLink. Le montant est bloqué en séquestre (`locked_balance`).
3. **Génération Code OTP** : Un code unique à 6 chiffres (ex: `849201`) est généré pour l'acheteur.
4. **Préparation & Expédition** : Le vendeur reçoit la notification, prépare et expédie le colis (Statut: `SHIPPED`).
5. **Livraison & Remise du Code** :
   - À la réception du colis, l'acheteur communique son code au vendeur.
   - Le vendeur saisit le code dans l'application MoneyLink.
   - L'API vérifie le hash du code : les fonds sont instantanément crédités sur le solde disponible du vendeur (`available_balance`).
   - L'acheteur peut alternativement confirmer la réception en un clic depuis son application.
6. **En cas de litige** : L'acheteur peut ouvrir un litige avec photos justificatives. Les fonds restent gelés jusqu'à arbitrage par l'administrateur.

## 2. Flux des Coffres d'Épargne (MoneyLink Coffre)

### A. Coffre Personnel
- Objectif individuel (ex: "Achat Laptop", "Fêtes / Tabaski").
- Versements réguliers ou libres.
- Option de verrouillage jusqu'à l'échéance.

### B. Coffre Collectif (Tontine / Projet de Groupe)
- Créé par un organisateur avec un montant cible et une date butoir.
- Invitation de membres par téléphone.
- Visibilité en temps réel de la progression globale et des contributions individuelles.
- Alertes de rappel automatiques 48h avant l'échéance.

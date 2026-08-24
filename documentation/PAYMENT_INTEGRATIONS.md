# Guide d'Intégration des Paiements Wave & Orange Money (Sénégal)

Ce document détaille la configuration technique, la sécurité cryptographique et le déploiement des connecteurs de paiement pour **MoneyLink**.

---

## 1. Connecteur Wave Sénégal

### A. Obtention des Accès
1. Créer un compte marchand sur [Wave Business Sénégal](https://www.wave.com).
2. Accéder à l'espace Développeur et générer :
   - `WAVE_API_KEY` (Clé secrète de production commençant par `wave_sn_prod_...`)
   - `WAVE_WEBHOOK_SECRET` (Clé de signature secrète pour les webhooks)

### B. Configuration de l'URL de Webhook
Dans la console Wave, renseigner l'URL de notification :
```
https://api.moneylink.sn/api/webhooks/wave
```

### C. Format de la Signature Cryptographique
Wave signe chaque requête avec le header `Wave-Signature` :
```http
Wave-Signature: t=1724500000,v1=9f83cf...
```
MoneyLink valide cette signature en calculant :
```javascript
HMAC_SHA256(timestamp + "." + rawBody, WAVE_WEBHOOK_SECRET)
```

---

## 2. Connecteur Orange Money Sénégal (Orange Developer)

### A. Obtention des Accès
1. S'inscrire sur le portail [Orange Developer](https://developer.orange.com).
2. Souscrire à l'API **Orange Money Web Payment (Sénégal)**.
3. Récupérer :
   - `ORANGE_MONEY_CLIENT_ID`
   - `ORANGE_MONEY_CLIENT_SECRET`
   - `ORANGE_MONEY_MERCHANT_KEY`

### B. Configuration de l'URL de Notification
```
https://api.moneylink.sn/api/webhooks/orange-money
```

---

## 3. Matrice des Statuts de Paiement & Séquestre

| Événement Webhook | Statut Commande | Action Séquestre MoneyLink |
| :--- | :--- | :--- |
| `checkout.session.completed` (Wave) | `PAYMENT_CONFIRMED` | Fonds verrouillés en séquestre + Génération code OTP |
| `SUCCESSFUL` (Orange Money) | `PAYMENT_CONFIRMED` | Fonds verrouillés en séquestre + Génération code OTP |
| `checkout.session.failed` / `EXPIRED` | `CANCELLED` | Commande annulée sans débit |
| `refund.succeeded` | `REFUNDED` | Clôture de litige avec retour de fonds |

---

## 4. Variables d'Environnement (.env)

```env
# Wave Sénégal
WAVE_API_KEY=wave_sn_prod_xxxxxxxxxxxx
WAVE_WEBHOOK_SECRET=wave_webhook_secret_xxxxxxxx
WAVE_API_URL=https://api.wave.com/v1

# Orange Money Sénégal
ORANGE_MONEY_CLIENT_ID=xxxxxxxxxxxx
ORANGE_MONEY_CLIENT_SECRET=xxxxxxxxxxxx
ORANGE_MONEY_MERCHANT_KEY=om_sn_merchant_key
ORANGE_MONEY_WEBHOOK_SECRET=om_webhook_secret_xxxxxxxx
ORANGE_MONEY_API_URL=https://api.orange.com/orange-money-webpay/dev/v1
```

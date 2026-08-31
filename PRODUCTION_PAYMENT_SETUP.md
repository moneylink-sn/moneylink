# 💳 MoneyLink — Guide Officiel de Configuration des Passerelles de Paiement en Production
## Marché Sénégal & Zone UEMOA (Wave Sénégal & Orange Money Sénégal)

> **AVERTISSEMENT CRITIQUE DE SÉCURITÉ & CONFORMITÉ FINTECH :**
> En l'absence de clés d'API et de contrats marchands réels validés auprès de **Wave Digital Finance Sénégal** et de **Sonatel / Orange Money Sénégal**, MoneyLink fonctionne en **mode Sandbox / Simulation déterministe**.
> **Aucun flux financier réel ne transite tant que les étapes d'agrément commercial et de configuration ci-dessous n'ont pas été menées à terme.**

---

## Sommaire
1. [Architecture de Paiement & Séquestre (Escrow)](#1-architecture-de-paiement--séquestre-escrow)
2. [Wave Sénégal — Intégration Production](#2-wave-sénégal--intégration-production)
3. [Orange Money Sénégal — Intégration Production](#3-orange-money-sénégal--intégration-production)
4. [Idempotence, Timeouts & Réconciliation](#4-idempotence-timeouts--réconciliation)
5. [Sécurisation & Signature des Webhooks](#5-sécurisation--signature-des-webhooks)
6. [Gestion des Litiges, Annulations & Remboursements](#6-gestion-des-litiges-annulations--remboursements)
7. [Checklist de Mise en Service](#7-checklist-de-mise-en-service)

---

## 1. Architecture de Paiement & Séquestre (Escrow)

MoneyLink agit en **tiers de confiance**. Le flux de paiement se décompose en 4 phases :

```
[Acheteur] ──(Paiement Mobile Money)──> [Passerelle Wave / OM]
                                                 │
                                                 ▼ (Webhook HMAC signé)
                                        [MoneyLink Backend]
                                                 │
                                       (Fonds Séquestrés / Locked)
                                                 ▼
[Vendeur Expédie] ──(Code OTP validé)──> [Déblocage Solde Disponible]
```

---

## 2. Wave Sénégal — Intégration Production

### A. Credentials Requis
| Variable d'Environnement | Description | Exemple / Format |
|---|---|---|
| `WAVE_API_KEY` | Clé secrète d'API Wave Business Production | `wave_sn_prod_sk_xxxxxxxxxxxx` |
| `WAVE_WEBHOOK_SECRET` | Secret de signature HMAC partagé | `wave_sn_whsec_xxxxxxxxxxxx` |
| `WAVE_API_URL` | URL de base de l'API Wave | `https://api.wave.com/v1` |

### B. Endpoints & URLs
- **Production API** : `https://api.wave.com/v1/checkout/sessions`
- **Sandbox API** : `https://api.wave.com/v1/checkout/sessions` (avec clé de test)
- **URL Webhook MoneyLink** : `https://api.moneylink.sn/api/webhooks/wave`

### C. Procédure d'Enrôlement Wave Business Sénégal
1. Créer un compte **Wave Business** auprès de Wave Sénégal (Dakar).
2. Fournir les pièces juridiques de l'entreprise (NINEA, Registre de Commerce, Pièce d'identité des représentants légaux).
3. Signer le contrat d'agrégation / passerelle de paiement e-commerce.
4. Accéder au portail Wave Merchant Portal $\rightarrow$ section **Développeurs**.
5. Générer la clé d'API de production (`WAVE_API_KEY`).
6. Configurer l'URL de Webhook : `https://api.moneylink.sn/api/webhooks/wave`.
7. Récupérer le secret de signature du webhook (`WAVE_WEBHOOK_SECRET`).

### D. Format de Signature & Validation Wave
Wave transmet un en-tête HTTP :
`Wave-Signature: t=1614835800,v1=5257186dbcdf...`

Algorithme de vérification implémenté (`WaveDriver.js`) :
```javascript
const payloadToSign = `${timestamp}.${typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)}`;
const expectedSignature = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');
const isValid = crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8'));
```

### E. Événements Webhooks Pris en Charge
- `checkout.session.completed` : Déclenche le verrouillage automatique des fonds en séquestre via `EscrowService.lockFundsForOrder`.

---

## 3. Orange Money Sénégal — Intégration Production

### A. Credentials Requis
| Variable d'Environnement | Description | Exemple / Format |
|---|---|---|
| `ORANGE_MONEY_CLIENT_ID` | Client ID Orange Developer | `xxxxxxxxxxxxxxxxxxxxxxxx` |
| `ORANGE_MONEY_CLIENT_SECRET` | Client Secret OAuth2 Orange | `xxxxxxxxxxxxxxxxxxxxxxxx` |
| `ORANGE_MONEY_MERCHANT_KEY` | Code Marchand Sonatel / OM Sénégal | `om_sn_merchant_12345` |
| `ORANGE_MONEY_WEBHOOK_SECRET` | Clé secrète de validation signature | `om_webhook_sec_xxxx` |
| `ORANGE_MONEY_API_URL` | URL Passerelle WebPayment | `https://api.orange.com/orange-money-webpay/sn/v1` |

### B. Endpoints & URLs
- **Production API** : `https://api.orange.com/orange-money-webpay/sn/v1/webpayment`
- **Sandbox API** : `https://api.orange.com/orange-money-webpay/dev/v1/webpayment`
- **URL Webhook MoneyLink** : `https://api.moneylink.sn/api/webhooks/orange-money`

### C. Procédure d'Enrôlement Orange Developer / Sonatel
1. Créer un compte sur le portail [Orange Developer](https://developer.orange.com).
2. Souscrire à l'API **Orange Money Web Payment (Sénégal)**.
3. Remplir le formulaire de passage en production et conventionner avec **Sonatel Orange Money Sénégal**.
4. Récupérer les identifiants OAuth2 Production (`Authorization: Bearer <token>`).
5. Configurer les URL de retour :
   - Succès : `https://moneylink.sn/payment/om-return`
   - Annulation : `https://moneylink.sn/payment/om-cancel`
   - Notification IPN / Webhook : `https://api.moneylink.sn/api/webhooks/orange-money`

### D. Format de Signature & Validation Orange Money
Orange Money transmet l'en-tête `x-om-signature`.
Validation via HMAC-SHA256 avec comparaison `timingSafeEqual`.

---

## 4. Idempotence, Timeouts & Réconciliation

### Idempotence
- Chaque transaction est identifiée de manière unique par :
  1. `order_id` (UUID interne MoneyLink)
  2. `order_number` (ex: `ML-2026-84920`)
  3. `client_reference` ou `txnid` (Référence opérateur)
- Si un webhook identique est reçu plusieurs fois, le contrôleur vérifie l'état actuel de la commande :
  ```javascript
  if (order && order.status === 'PENDING_PAYMENT') {
    await EscrowService.lockFundsForOrder(...);
  }
  ```
  Les requêtes doublons retournent immédiatement `HTTP 200 OK` sans double débit ni double séquestre.

### Timeouts & Résilience
- Appel aux APIs de paiement limité à **5000 ms** (AbortSignal.timeout).
- En cas de timeout réseau lors de la redirection initiale, l'acheteur peut relancer sa session sans dupliquer la commande.

### Réconciliation
- Un cron de vérification nocturne interroge le statut des commandes restées `PENDING_PAYMENT` depuis plus de 30 minutes afin de rattraper d'éventuelles pertes de paquets IPN.

---

## 5. Sécurisation & Signature des Webhooks

1. **Rejet strict en production** :
   Si `NODE_ENV === 'production'`, tout webhook sans header de signature valide est rejeté immédiatement avec `HTTP 401 Unauthorized`.
2. **Protection contre les attaques temporelles** :
   Utilisation exclusive de `crypto.timingSafeEqual` pour éviter les attaques par canal auxiliaire (timing attacks).
3. **Payload brut (Raw Body)** :
   Le parsing JSON préserve l'intégrité de la chaîne d'octets pour la signature.

---

## 6. Gestion des Litiges, Annulations & Remboursements

| Cas Métier | Action MoneyLink | Action Passerelle |
|---|---|---|
| **Annulation avant paiement** | Commande marquée `CANCELLED` | Aucune charge |
| **Livraison conforme** | Code OTP validé $\rightarrow$ Fonds crédités sur le solde disponible du vendeur | Fonds conservés sur le compte bancaire/marchand séquestre |
| **Litige avec remboursement acheteur** | Arbitrage admin $\rightarrow$ `EscrowService.refundOrderToBuyer` | Recréditation du wallet MoneyLink ou remboursement Wave/OM |
| **Litige avec déblocage vendeur** | Arbitrage admin $\rightarrow$ `EscrowService._executeEscrowRelease` | Solde commerçant crédité |

---

## 7. Checklist de Mise en Service

- [ ] Contrat Marchand Wave Sénégal signé
- [ ] Contrat Marchand Orange Money Sonatel signé
- [ ] Variables d'environnement de production injectées (`WAVE_API_KEY`, `ORANGE_MONEY_CLIENT_ID`, etc.)
- [ ] Certificat SSL / HTTPS actif sur `api.moneylink.sn`
- [ ] URLs de webhooks configurées sur les portails partenaires
- [ ] Test transactionnel réel de 100 FCFA effectué et vérifié de bout en bout

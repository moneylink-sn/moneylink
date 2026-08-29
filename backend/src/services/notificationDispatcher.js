/**
 * MoneyLink — NotificationDispatcher (Moteur Multi-Canal Push, SMS, WhatsApp & In-App)
 * Supporte la notification des commerçants et clients même sans application installée
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, pool } from '../config/db.js';

export const NotificationChannels = {
  IN_APP: 'IN_APP',
  PUSH: 'PUSH',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  EMAIL: 'EMAIL'
};

export const NotificationTemplates = {
  // 1. Paiement Sécurisé Réussi
  PAYMENT_ESCROW_LOCKED: (orderNumber, amount, otpCode) => ({
    title: 'Paiement Sécurisé Garanti 🔒',
    inApp: `Votre commande #${orderNumber} de ${amount.toLocaleString('fr-FR')} FCFA est sécurisée en séquestre. Votre code secret de réception est : ${otpCode}`,
    sms: `[MoneyLink] Paiement de ${amount.toLocaleString('fr-FR')} FCFA sécurisé pour la commande #${orderNumber}. Votre code de réception est: ${otpCode}. Ne le donnez qu'à la livraison!`,
    whatsapp: `🔒 *MoneyLink Sécurité*\nVotre paiement de *${amount.toLocaleString('fr-FR')} FCFA* (Commande #${orderNumber}) est garanti en séquestre.\n\n🔑 *Code Secret de Réception:* \`${otpCode}\`\n\n_Communiquez ce code au vendeur uniquement après inspection de votre colis._`
  }),

  // 2. Notification Marchand Inscrit
  MERCHANT_NEW_ORDER: (orderNumber, amount, buyerName) => ({
    title: 'Nouvelle Vente Séquestrée ! 📦',
    inApp: `Commande #${orderNumber} (${amount.toLocaleString('fr-FR')} FCFA) payée par ${buyerName}. Les fonds sont garantis. Vous pouvez expédier.`,
    sms: `[MoneyLink] Nouvelle commande #${orderNumber} de ${amount.toLocaleString('fr-FR')} FCFA par ${buyerName}. Les fonds sont bloqués en séquestre. Expédiez le colis.`,
    whatsapp: `📦 *Nouvelle Vente MoneyLink*\nLe client *${buyerName}* a payé *${amount.toLocaleString('fr-FR')} FCFA* pour la commande #${orderNumber}.\n\n✅ Les fonds sont garantis par MoneyLink.\nDemandez le code secret au client lors de la remise.`
  }),

  // 3. Notification Marchand Non Inscrit (Invitation externe)
  MERCHANT_UNREGISTERED_INVITE: (phone, amount, orderNumber, link) => ({
    title: 'Vous avez reçu un paiement séquestré 💰',
    sms: `[MoneyLink] Un client souhaite vous acheter pour ${amount.toLocaleString('fr-FR')} FCFA (Réf: ${orderNumber}). L'argent est bloqué sous séquestre. Créez votre compte gratuit pour encaisser: ${link}`,
    whatsapp: `💰 *Bonjour !*\nUn client a déposé *${amount.toLocaleString('fr-FR')} FCFA* en séquestre sécurisé pour une commande chez vous (Réf: #${orderNumber}).\n\nPour accepter la commande et encaisser les fonds sur votre compte Wave ou Orange Money :\n👉 ${link}`
  }),

  // 4. Colis Expédié
  ORDER_SHIPPED: (orderNumber) => ({
    title: 'Colis Expédié 🚚',
    inApp: `Votre commande #${orderNumber} est en route ! Préparez votre code de réception.`,
    sms: `[MoneyLink] Votre commande #${orderNumber} a été expédiée. Préparez votre code OTP pour la réception.`,
    whatsapp: `🚚 *Votre commande #${orderNumber} est en cours de livraison !*\nN'oubliez pas de vérifier le colis avant de fournir votre code secret.`
  }),

  // 5. Réception Validée & Déblocage des Fonds
  ESCROW_RELEASED: (orderNumber, netAmount) => ({
    title: 'Paiement Débloqué ! 💰',
    inApp: `La commande #${orderNumber} a été confirmée. ${netAmount.toLocaleString('fr-FR')} FCFA ont été crédités sur votre solde disponible.`,
    sms: `[MoneyLink] Félicitations ! Votre compte a été crédité de ${netAmount.toLocaleString('fr-FR')} FCFA pour la commande #${orderNumber}.`,
    whatsapp: `💰 *Paiement Reçu !*\nVotre solde MoneyLink a été crédité de *${netAmount.toLocaleString('fr-FR')} FCFA* pour la commande #${orderNumber}.`
  }),

  // 6. Litige Ouvert
  DISPUTE_OPENED: (orderNumber) => ({
    title: 'Litige Ouvert sur Commande ⚠️',
    inApp: `Un litige a été ouvert pour la commande #${orderNumber}. Les fonds restent gelés sous arbitrage.`,
    sms: `[MoneyLink] Réclamation ouverte sur la commande #${orderNumber}. Les fonds sont protégés sous séquestre.`,
    whatsapp: `⚠️ *Information Litige*\nUne réclamation a été déposée pour la commande #${orderNumber}. Notre équipe examine le dossier.`
  }),

  // 7. Remboursement Acheteur
  BUYER_REFUNDED: (orderNumber, amount) => ({
    title: 'Remboursement Effectué 🔄',
    inApp: `Remboursement de ${amount.toLocaleString('fr-FR')} FCFA effectué sur votre solde pour la commande #${orderNumber}.`,
    sms: `[MoneyLink] Votre remboursement de ${amount.toLocaleString('fr-FR')} FCFA pour la commande #${orderNumber} a été versé sur votre portefeuille.`,
    whatsapp: `🔄 *Remboursement Validé*\nLe montant de *${amount.toLocaleString('fr-FR')} FCFA* a été reversé sur votre compte MoneyLink.`
  }),

  // 8. Rappel Échéance Coffre d'Épargne 48h
  SAVINGS_DEADLINE_48H: (goalTitle, currentAmount, targetAmount) => ({
    title: 'Rappel Échéance Coffre (J-2) ⏰',
    inApp: `Votre coffre "${goalTitle}" arrive à échéance dans 2 jours ! Progression: ${currentAmount.toLocaleString('fr-FR')} / ${targetAmount.toLocaleString('fr-FR')} FCFA.`,
    sms: `[MoneyLink Coffre] Rappel : Votre projet "${goalTitle}" se termine dans 48h. Collecté: ${currentAmount.toLocaleString('fr-FR')} / ${targetAmount.toLocaleString('fr-FR')} FCFA.`,
    whatsapp: `⏰ *Rappel Échéance Tontine / Coffre*\nVotre projet *"${goalTitle}"* arrive à échéance dans *2 jours*.\n\n📊 Progression : *${currentAmount.toLocaleString('fr-FR')} / ${targetAmount.toLocaleString('fr-FR')} FCFA*`
  })
};

export class NotificationDispatcher {
  /**
   * Dispatche une notification multi-canale
   */
  static async dispatch({
    userId,
    phone,
    templateKey,
    params = [],
    channels = [NotificationChannels.IN_APP, NotificationChannels.PUSH, NotificationChannels.SMS, NotificationChannels.WHATSAPP]
  }) {
    const templateBuilder = NotificationTemplates[templateKey];
    if (!templateBuilder) {
      console.warn(`Template de notification inconnu : ${templateKey}`);
      return null;
    }

    const content = templateBuilder(...params);
    const notificationId = uuidv4();
    const dispatchedLogs = [];

    // 1. Canal In-App & Push (si l'utilisateur est inscrit)
    if (userId && (channels.includes(NotificationChannels.IN_APP) || channels.includes(NotificationChannels.PUSH))) {
      const inAppNotif = {
        id: notificationId,
        user_id: userId,
        title: content.title,
        message: content.inApp || content.sms,
        type: templateKey,
        payload: { templateKey, params },
        is_read: false,
        channel: 'PUSH',
        created_at: new Date().toISOString()
      };

      if (pool) {
        try {
          query(`
            INSERT INTO notifications (id, user_id, title, message, type, payload, is_read, channel, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, false, 'PUSH', NOW())
          `, [
            notificationId,
            userId,
            inAppNotif.title,
            inAppNotif.message,
            inAppNotif.type,
            JSON.stringify(inAppNotif.payload)
          ]).catch(() => {});
        } catch {
          // fallback silent
        }
      }

      memoryStore.notifications.unshift(inAppNotif);
      dispatchedLogs.push({ channel: 'IN_APP', status: 'DELIVERED', recipient: userId });
      dispatchedLogs.push({ channel: 'PUSH_FCM', status: 'SENT', recipient: userId });
    }

    // 2. Canal SMS (Passerelle SMS Sénégal)
    if (phone && channels.includes(NotificationChannels.SMS)) {
      const smsMessage = content.sms;
      // Simulation appel API Twilio / Infobip / Orange SMS
      console.log(`📱 [GATEWAY SMS SÉNÉGAL] Vers ${phone} : "${smsMessage}"`);
      dispatchedLogs.push({ channel: 'SMS', status: 'SENT', recipient: phone, message: smsMessage });
    }

    // 3. Canal WhatsApp Business
    if (phone && channels.includes(NotificationChannels.WHATSAPP)) {
      const waMessage = content.whatsapp || content.sms;
      // Simulation appel API Meta WhatsApp Cloud
      console.log(`💬 [GATEWAY WHATSAPP BUSINESS] Vers ${phone} : \n${waMessage}`);
      dispatchedLogs.push({ channel: 'WHATSAPP', status: 'SENT', recipient: phone, message: waMessage });
    }

    return {
      notificationId,
      templateKey,
      dispatchedLogs
    };
  }
}

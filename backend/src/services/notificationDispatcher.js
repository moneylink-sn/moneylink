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
    whatsapp: `⏰ *Rappel Échéance Tontine / Coffre*\nVotre projet *"${goalTitle}"* arrive à échéance dans *2 jours*.\n\n📊 Progression : *${currentAmount.toLocaleString('fr-FR')} / ${targetAmount.toLocaleString('fr-FR')} FCFA*`,
    email: {
      subject: `Rappel d'échéance : ${goalTitle}`,
      text: `Votre coffre d'épargne "${goalTitle}" se termine dans 48h. Total collecté : ${currentAmount} / ${targetAmount} FCFA.`
    }
  }),

  // 9. Paiement Reçu Direct
  PAYMENT_RECEIVED: (amount, senderName, reference) => ({
    title: 'Paiement Reçu 💰',
    inApp: `Vous avez reçu un paiement de ${amount.toLocaleString('fr-FR')} FCFA de la part de ${senderName}. Réf: ${reference}`,
    sms: `[MoneyLink] Paiement reçu : ${amount.toLocaleString('fr-FR')} FCFA de ${senderName}. Réf: ${reference}`,
    whatsapp: `💰 *Paiement Reçu sur MoneyLink*\nMontant : *${amount.toLocaleString('fr-FR')} FCFA*\nDe : *${senderName}*\nRéférence : \`${reference}\``,
    email: {
      subject: `Paiement reçu : ${amount} FCFA`,
      text: `Vous avez reçu ${amount} FCFA de ${senderName}. Référence transaction : ${reference}.`
    }
  }),

  // 10. Paiement Envoyé
  PAYMENT_SENT: (amount, recipientName, reference) => ({
    title: 'Paiement Envoyé ✅',
    inApp: `Votre paiement de ${amount.toLocaleString('fr-FR')} FCFA à ${recipientName} a été exécuté. Réf: ${reference}`,
    sms: `[MoneyLink] Paiement de ${amount.toLocaleString('fr-FR')} FCFA envoyé à ${recipientName}. Réf: ${reference}`,
    whatsapp: `✅ *Paiement Envoyé*\nMontant : *${amount.toLocaleString('fr-FR')} FCFA*\nDestinataire : *${recipientName}*\nRéférence : \`${reference}\``,
    email: {
      subject: `Paiement envoyé : ${amount} FCFA`,
      text: `Votre virement de ${amount} FCFA vers ${recipientName} a bien été effectué. Référence : ${reference}.`
    }
  }),

  // 11. Facture Créée
  INVOICE_CREATED: (invoiceNumber, clientName, totalAmount, shareUrl) => ({
    title: 'Nouvelle Facture Créée 📄',
    inApp: `Facture #${invoiceNumber} générée pour ${clientName} d'un montant de ${totalAmount.toLocaleString('fr-FR')} FCFA.`,
    sms: `[MoneyLink Facturation] Facture #${invoiceNumber} de ${totalAmount.toLocaleString('fr-FR')} FCFA prête. Consulter : ${shareUrl || 'app'}`,
    whatsapp: `📄 *Facture MoneyLink #${invoiceNumber}*\nClient : *${clientName}*\nTotal : *${totalAmount.toLocaleString('fr-FR')} FCFA*\n\nLien de consultation :\n👉 ${shareUrl || 'Disponible dans votre espace'}`,
    email: {
      subject: `Facture #${invoiceNumber} générée`,
      text: `Votre facture #${invoiceNumber} de ${totalAmount} FCFA pour ${clientName} est disponible.`
    }
  }),

  // 12. Facture Payée
  INVOICE_PAID: (invoiceNumber, amount, paidBy) => ({
    title: 'Facture Payée 🎉',
    inApp: `La facture #${invoiceNumber} de ${amount.toLocaleString('fr-FR')} FCFA a été réglée par ${paidBy}.`,
    sms: `[MoneyLink] Facture #${invoiceNumber} (${amount.toLocaleString('fr-FR')} FCFA) réglée avec succès par ${paidBy}.`,
    whatsapp: `🎉 *Facture #${invoiceNumber} Réglée !*\nLe montant de *${amount.toLocaleString('fr-FR')} FCFA* a été payé par *${paidBy}*.`,
    email: {
      subject: `Règlement reçu pour la facture #${invoiceNumber}`,
      text: `La facture #${invoiceNumber} de ${amount} FCFA a été intégralement payée par ${paidBy}.`
    }
  }),

  // 13. Facture Annulée
  INVOICE_CANCELLED: (invoiceNumber, reason) => ({
    title: 'Facture Annulée 🚫',
    inApp: `La facture #${invoiceNumber} a été annulée. Motif : ${reason || 'Non spécifié'}`,
    sms: `[MoneyLink] La facture #${invoiceNumber} a été annulée (${reason || 'Annulation commerçant'}).`,
    whatsapp: `🚫 *Facture #${invoiceNumber} Annulée*\nMotif : ${reason || 'Annulation commerçant'}.`,
    email: {
      subject: `Annulation de la facture #${invoiceNumber}`,
      text: `La facture #${invoiceNumber} a été annulée. Motif : ${reason || 'Non spécifié'}.`
    }
  }),

  // 14. Alerte MoneyLink Shield
  SHIELD_ALERT: (title, message, riskLevel) => ({
    title: `🛡️ Alerte Shield : ${title}`,
    inApp: `[Niveau ${riskLevel}] ${message}`,
    sms: `[MoneyLink Shield] Alerte de sécurité (${riskLevel}) : ${message}`,
    whatsapp: `🛡️ *MoneyLink Shield - Alerte Sécurité*\nNiveau : *${riskLevel}*\n\n${message}`,
    email: {
      subject: `[Alerte Sécurité MoneyLink Shield] ${title}`,
      text: `Alerte de sécurité de niveau ${riskLevel} détectée sur votre compte : ${message}`
    }
  }),

  // 15. Activité Inhabituelle
  UNUSUAL_ACTIVITY: (description, ipAddress, location) => ({
    title: 'Activité Inhabituelle Détectée ⚠️',
    inApp: `Connexion ou tentative inhabituelle : ${description} (IP: ${ipAddress || 'inconnue'}, Lieu: ${location || 'Sénégal'})`,
    sms: `[MoneyLink Sécurité] Activité inhabituelle détectée (${ipAddress || 'IP'}). Si ce n'est pas vous, sécurisez votre compte.`,
    whatsapp: `⚠️ *Alerte Activité Inhabituelle*\nUne action suspecte a été relevée sur votre compte.\nIP : \`${ipAddress || 'N/A'}\`\nSi vous n'êtes pas à l'origine de cette action, modifiez votre mot de passe immédiatement.`,
    email: {
      subject: `Activité inhabituelle détectée sur votre compte MoneyLink`,
      text: `Une activité inhabituelle (${description}) a été détectée depuis l'IP ${ipAddress}. Veuillez vérifier vos accès.`
    }
  }),

  // 16. Objectif Business Atteint
  BUSINESS_TARGET_REACHED: (monthName, revenueAchieved, targetRevenue) => ({
    title: '🎯 Objectif Business Atteint !',
    inApp: `Félicitations ! Votre objectif pour ${monthName} de ${targetRevenue.toLocaleString('fr-FR')} FCFA a été dépassé (${revenueAchieved.toLocaleString('fr-FR')} FCFA réalisés).`,
    sms: `[MoneyLink Business] Bravo ! Objectif de chiffre d'affaires pour ${monthName} atteint avec ${revenueAchieved.toLocaleString('fr-FR')} FCFA.`,
    whatsapp: `🎯 *Félicitations ! Objectif Atteint*\nVotre chiffre d'affaires pour *${monthName}* atteint *${revenueAchieved.toLocaleString('fr-FR')} FCFA* (Objectif : ${targetRevenue.toLocaleString('fr-FR')} FCFA).`,
    email: {
      subject: `🎯 Félicitations ! Votre objectif Business ${monthName} est atteint`,
      text: `Vous avez réalisé ${revenueAchieved} FCFA pour un objectif initial de ${targetRevenue} FCFA. Consultez votre tableau de bord commercial.`
    }
  }),

  // Alias compatibles
  INVOICE_CANCELED: (invoiceNumber, reason) => NotificationTemplates.INVOICE_CANCELLED(invoiceNumber, reason),
  BUSINESS_GOAL_REACHED: (monthName, revenueAchieved, targetRevenue) => NotificationTemplates.BUSINESS_TARGET_REACHED(monthName, revenueAchieved, targetRevenue)
};

export class NotificationDispatcher {
  /**
   * Dispatche une notification multi-canale
   */
  static async dispatch({
    userId,
    phone,
    email,
    templateKey,
    params = [],
    channels = [NotificationChannels.IN_APP, NotificationChannels.PUSH, NotificationChannels.SMS, NotificationChannels.WHATSAPP, NotificationChannels.EMAIL]
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
      // Journalisation sécurisée sans token/code sensible dans logs publics
      console.log(`📱 [GATEWAY SMS SÉNÉGAL] Vers ${phone.slice(0, 7)}*** : "${smsMessage.slice(0, 40)}..."`);
      dispatchedLogs.push({ channel: 'SMS', status: 'SENT', recipient: phone, message: smsMessage });
    }

    // 3. Canal WhatsApp Business
    if (phone && channels.includes(NotificationChannels.WHATSAPP)) {
      const waMessage = content.whatsapp || content.sms;
      console.log(`💬 [GATEWAY WHATSAPP BUSINESS] Vers ${phone.slice(0, 7)}***`);
      dispatchedLogs.push({ channel: 'WHATSAPP', status: 'SENT', recipient: phone, message: waMessage });
    }

    // 4. Canal Email Transactionnel
    if (email && channels.includes(NotificationChannels.EMAIL)) {
      const emailContent = content.email || {
        subject: content.title,
        text: content.inApp || content.sms
      };
      console.log(`📧 [TRANSACTIONAL EMAIL] Vers ${email.slice(0, 3)}***@*** : "${emailContent.subject}"`);
      dispatchedLogs.push({ channel: 'EMAIL', status: 'SENT', recipient: email, subject: emailContent.subject });
    }

    return {
      notificationId,
      templateKey,
      dispatchedLogs
    };
  }
}

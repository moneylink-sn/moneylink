/**
 * MoneyLink — ContactController
 * Traitement sécurisé des formulaires de contact et tickets d'assistance
 * Stockage persistant et accusé de réception
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, pool } from '../config/db.js';

export class ContactController {
  /**
   * Envoi d'un message de contact / demande d'assistance
   */
  static async submit(req, res) {
    try {
      const { name, email, phone, category, subject, message, honeypot } = req.body;

      // Détection anti-spam honeypot
      if (honeypot && honeypot.trim().length > 0) {
        return res.status(200).json({
          success: true,
          message: 'Votre message a été transmis à l’équipe MoneyLink.',
          data: { ticket_number: 'TK-' + Math.floor(100000 + Math.random() * 900000) }
        });
      }

      const id = uuidv4();
      const ticketNumber = 'TK-' + Math.floor(100000 + Math.random() * 900000);
      const contactMsg = {
        id,
        ticket_number: ticketNumber,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        category: category || 'SUPPORT',
        subject: subject.trim(),
        message: message.trim(),
        status: 'OPEN',
        created_at: new Date().toISOString()
      };

      if (pool) {
        try {
          await query(`
            INSERT INTO contact_messages (id, ticket_number, name, email, phone, category, subject, message, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
          `, [
            contactMsg.id,
            contactMsg.ticket_number,
            contactMsg.name,
            contactMsg.email,
            contactMsg.phone,
            contactMsg.category,
            contactMsg.subject,
            contactMsg.message,
            contactMsg.status,
            contactMsg.created_at
          ]);
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
          if (!memoryStore.contact_messages) memoryStore.contact_messages = [];
          memoryStore.contact_messages.push(contactMsg);
        }
      } else {
        if (!memoryStore.contact_messages) memoryStore.contact_messages = [];
        memoryStore.contact_messages.push(contactMsg);
      }

      return res.status(201).json({
        success: true,
        message: `Merci pour votre message ! Notre équipe vous répondra dans les plus brefs délais. Réf. Ticket : ${ticketNumber}`,
        data: {
          ticket_number: ticketNumber,
          category: contactMsg.category,
          created_at: contactMsg.created_at
        }
      });
    } catch (err) {
      console.error('[Contact Error]:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Une erreur est survenue lors de l’envoi de votre message. Veuillez réessayer.'
      });
    }
  }
}

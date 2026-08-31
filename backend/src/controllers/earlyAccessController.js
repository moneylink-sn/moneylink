/**
 * MoneyLink — EarlyAccessController
 * Gestion des inscriptions Early Access / Lancement contrôlé au Sénégal
 * Stockage sécurisé PostgreSQL avec repli mémoire
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, pool } from '../config/db.js';

export class EarlyAccessController {
  /**
   * Enregistre une nouvelle demande Early Access
   */
  static async register(req, res) {
    try {
      const { first_name, last_name, phone, email, profile_type, city, notes, honeypot } = req.body;

      // Détection anti-spam honeypot
      if (honeypot && honeypot.trim().length > 0) {
        return res.status(200).json({
          success: true,
          message: 'Merci pour votre inscription à l’Early Access MoneyLink !'
        });
      }

      const id = uuidv4();
      const lead = {
        id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        profile_type: profile_type || 'PARTICULIER',
        city: city.trim(),
        notes: notes ? notes.trim() : null,
        status: 'REGISTERED',
        created_at: new Date().toISOString()
      };

      if (pool) {
        try {
          await query(`
            INSERT INTO early_access_leads (id, first_name, last_name, phone, email, profile_type, city, notes, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
          `, [
            lead.id,
            lead.first_name,
            lead.last_name,
            lead.phone,
            lead.email,
            lead.profile_type,
            lead.city,
            lead.notes,
            lead.status,
            lead.created_at
          ]);
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
          memoryStore.early_access_leads.push(lead);
        }
      } else {
        if (!memoryStore.early_access_leads) memoryStore.early_access_leads = [];
        memoryStore.early_access_leads.push(lead);
      }

      return res.status(201).json({
        success: true,
        message: 'Bienvenue dans la communauté MoneyLink ! Votre demande d’accès anticipé a été enregistrée avec succès.',
        data: {
          id: lead.id,
          first_name: lead.first_name,
          profile_type: lead.profile_type,
          created_at: lead.created_at
        }
      });
    } catch (err) {
      console.error('[Early Access Error]:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Une erreur est survenue lors de l’enregistrement. Veuillez réessayer.'
      });
    }
  }

  /**
   * Retourne le nombre d'inscrits en Early Access (sans exposer de données personnelles)
   */
  static async getStats(req, res) {
    try {
      let count = 0;
      if (pool) {
        try {
          const countRes = await query('SELECT COUNT(*) AS total FROM early_access_leads;');
          count = parseInt(countRes?.rows?.[0]?.total || '0', 10);
        } catch {
          count = (memoryStore.early_access_leads || []).length;
        }
      } else {
        count = (memoryStore.early_access_leads || []).length;
      }

      return res.status(200).json({
        success: true,
        data: {
          total_registered: count,
          launch_phase: 'PHASE 1 — ACCÈS CONTRÔLÉ (ALPHA/BÊTA)',
          market: 'Sénégal 🇸🇳'
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

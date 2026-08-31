/**
 * MoneyLink V2 — Service MoneyLink Shield (Système Intelligent de Sécurité & Scoring Anti-Fraude)
 * Analyse des comportements inhabituels, scoring de risque (0-100) et alertes préventives.
 * Règle d'or : Ne jamais bloquer définitivement une transaction sans confirmation explicite de l'utilisateur.
 */

import { query, pool, memoryStore } from '../../config/db.js';
import crypto from 'crypto';

export const DEFAULT_SHIELD_CONFIG = {
  defaultAvgAmount: 25000,
  unusualAmountMin: 50000,
  unusualAmountMultiplier: 3,
  highAbsoluteAmount: 250000,
  moderateAbsoluteAmount: 100000,
  velocityWindowMinutes: 10,
  velocityCountThreshold: 3,
  highRiskScoreThreshold: 70,
  mediumRiskScoreThreshold: 31,
  weightUnusualAmountMax: 40,
  weightHighAbsolute: 30,
  weightModerateAbsolute: 15,
  weightVelocity: 30,
  weightNewRecipient: 15
};

let currentShieldConfig = { ...DEFAULT_SHIELD_CONFIG };

export class ShieldService {
  /**
   * Récupère la configuration actuelle des règles et seuils du moteur
   */
  static getConfig() {
    return { ...currentShieldConfig };
  }

  /**
   * Met à jour dynamiquement les seuils et pondérations sans redémarrage
   */
  static setConfig(newConfig) {
    currentShieldConfig = { ...currentShieldConfig, ...(newConfig || {}) };
    return { ...currentShieldConfig };
  }

  /**
   * Réinitialise les règles et seuils aux valeurs par défaut
   */
  static resetConfig() {
    currentShieldConfig = { ...DEFAULT_SHIELD_CONFIG };
    return { ...currentShieldConfig };
  }

  /**
   * Analyse en temps réel le risque d'une transaction avant ou pendant son exécution
   */
  static async analyzeTransaction({
    userId,
    amount,
    recipientId = null,
    paymentMethod = 'WAVE',
    ipAddress = '127.0.0.1',
    transactionType = 'PAYMENT'
  }) {
    const cfg = currentShieldConfig;
    const numAmount = parseFloat(amount || 0);
    const now = new Date();
    const velocityWindowAgo = new Date(now.getTime() - cfg.velocityWindowMinutes * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    let recentTxs = [];
    let velocityTxs = [];
    let isKnownRecipient = false;

    if (pool) {
      try {
        const historyRes = await query(
          'SELECT * FROM transactions WHERE sender_id = $1 AND created_at >= $2 ORDER BY created_at DESC',
          [userId, thirtyDaysAgo.toISOString()]
        );
        recentTxs = historyRes.rows || [];

        if (recipientId) {
          const recipCheck = await query(
            'SELECT COUNT(*) as total FROM transactions WHERE sender_id = $1 AND receiver_id = $2',
            [userId, recipientId]
          );
          isKnownRecipient = parseInt(recipCheck.rows[0]?.total || '0', 10) > 0;
        }
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour ShieldService.analyzeTransaction :', err.message);
      }
    }

    if (!recentTxs.length && memoryStore.transactions) {
      recentTxs = memoryStore.transactions.filter(
        t => t.sender_id === userId && new Date(t.created_at || now) >= thirtyDaysAgo
      );
      if (recipientId) {
        isKnownRecipient = memoryStore.transactions.some(
          t => t.sender_id === userId && t.receiver_id === recipientId
        );
      }
    }

    velocityTxs = recentTxs.filter(t => new Date(t.created_at || now) >= velocityWindowAgo);

    // 1. Calcul du montant moyen historique de l'utilisateur
    let totalSpent = 0;
    let avgAmount = cfg.defaultAvgAmount;
    if (recentTxs.length > 0) {
      totalSpent = recentTxs.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      avgAmount = totalSpent / recentTxs.length;
    }

    // 2. Moteur de scoring de risque explicable (0 à 100)
    let riskScore = 0;
    const reasons = [];
    const warnings = [];
    const factors = [];

    // Règle A : Montant inhabituel par rapport à l'historique
    if (numAmount > cfg.unusualAmountMin && numAmount > avgAmount * cfg.unusualAmountMultiplier) {
      const scoreAdd = Math.min(cfg.weightUnusualAmountMax, Math.round((numAmount / avgAmount) * 10));
      riskScore += scoreAdd;
      reasons.push('UNUSUAL_AMOUNT');
      factors.push({
        code: 'UNUSUAL_AMOUNT',
        weight: scoreAdd,
        label: 'Montant inhabituel',
        detail: `Montant de ${numAmount.toLocaleString('fr-FR')} FCFA supérieur à la moyenne habituelle (${Math.round(avgAmount).toLocaleString('fr-FR')} FCFA).`
      });
      warnings.push(`Montant de ${numAmount.toLocaleString('fr-FR')} FCFA supérieur à la moyenne habituelle (${Math.round(avgAmount).toLocaleString('fr-FR')} FCFA).`);
    }

    // Règle B : Montant très élevé absolu (> 250 000 FCFA)
    if (numAmount >= cfg.highAbsoluteAmount) {
      riskScore += cfg.weightHighAbsolute;
      reasons.push('HIGH_ABSOLUTE_AMOUNT');
      factors.push({
        code: 'HIGH_ABSOLUTE_AMOUNT',
        weight: cfg.weightHighAbsolute,
        label: 'Plafond élevé',
        detail: `Transaction à montant élevé (>= ${cfg.highAbsoluteAmount.toLocaleString('fr-FR')} FCFA) nécessitant une vigilance particulière.`
      });
      warnings.push('Transaction à montant élevé nécessitant une attention particulière.');
    } else if (numAmount >= cfg.moderateAbsoluteAmount) {
      riskScore += cfg.weightModerateAbsolute;
      reasons.push('MODERATE_ABSOLUTE_AMOUNT');
      factors.push({
        code: 'MODERATE_ABSOLUTE_AMOUNT',
        weight: cfg.weightModerateAbsolute,
        label: 'Montant significatif',
        detail: `Transaction supérieure à ${cfg.moderateAbsoluteAmount.toLocaleString('fr-FR')} FCFA.`
      });
    }

    // Règle C : Vélocité anormale (> 3 transactions en 10 minutes)
    if (velocityTxs.length >= cfg.velocityCountThreshold) {
      riskScore += cfg.weightVelocity;
      reasons.push('HIGH_VELOCITY');
      factors.push({
        code: 'HIGH_VELOCITY',
        weight: cfg.weightVelocity,
        label: 'Fréquence inhabituelle',
        detail: `${velocityTxs.length} transactions initiées dans les ${cfg.velocityWindowMinutes} dernières minutes.`
      });
      warnings.push(`${velocityTxs.length} transactions initiées dans les ${cfg.velocityWindowMinutes} dernières minutes.`);
    }

    // Règle D : Nouveau bénéficiaire / marchand jamais sollicité
    if (recipientId && !isKnownRecipient) {
      riskScore += cfg.weightNewRecipient;
      reasons.push('NEW_RECIPIENT');
      factors.push({
        code: 'NEW_RECIPIENT',
        weight: cfg.weightNewRecipient,
        label: 'Nouveau bénéficiaire',
        detail: 'Premier transfert ou paiement vers ce bénéficiaire.'
      });
      warnings.push('Premier transfert vers ce bénéficiaire.');
    }

    // Règle E : Plafond et normalisation du score
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Détermination du niveau
    let riskLevel = 'LOW';
    let requiresConfirmation = false;

    if (riskScore >= cfg.highRiskScoreThreshold) {
      riskLevel = 'HIGH';
      requiresConfirmation = true;
    } else if (riskScore >= cfg.mediumRiskScoreThreshold) {
      riskLevel = 'MEDIUM';
      requiresConfirmation = false;
    } else {
      riskLevel = 'LOW';
      requiresConfirmation = false;
    }

    // Synthèse explicative des facteurs contributeurs
    const factorLabels = factors.map(f => f.label.toLowerCase());
    const explanationSummary = factorLabels.length > 0
      ? `Risque ${riskLevel === 'HIGH' ? 'élevé' : (riskLevel === 'MEDIUM' ? 'moyen' : 'faible')} — ${factorLabels.join(' + ')}`
      : 'Risque faible — comportement conforme aux habitudes';

    // Journalisation de l'événement de sécurité
    const eventId = `sec_ev_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const alertId = `sec_al_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const nowIso = now.toISOString();

    const secEvent = {
      id: eventId,
      user_id: userId,
      event_type: reasons.length > 0 ? reasons.join(';') : 'TRANSACTION_NORMAL',
      severity: riskLevel,
      risk_score: riskScore,
      details: {
        amount: numAmount,
        avg_amount: Math.round(avgAmount),
        warnings,
        payment_method: paymentMethod,
        recipient_id: recipientId
      },
      ip_address: ipAddress,
      status: riskLevel === 'HIGH' ? 'FLAGGED' : 'LOGGED',
      created_at: nowIso
    };

    let secAlert = null;
    if (riskLevel !== 'LOW') {
      secAlert = {
        id: alertId,
        user_id: userId,
        transaction_id: null,
        title: riskLevel === 'HIGH' ? '⚠️ Transaction inhabituelle détectée' : '🛡️ Alerte informative MoneyLink Shield',
        message: warnings.join(' ') || `Une opération de ${numAmount.toLocaleString('fr-FR')} FCFA présente un niveau de vigilance ${riskLevel}.`,
        risk_score: riskScore,
        risk_level: riskLevel,
        is_acknowledged: false,
        action_taken: 'PENDING',
        created_at: nowIso,
        updated_at: nowIso
      };
    }

    if (pool) {
      try {
        await query(
          'INSERT INTO security_events (id, user_id, event_type, severity, risk_score, details, ip_address, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [secEvent.id, secEvent.user_id, secEvent.event_type, secEvent.severity, secEvent.risk_score, JSON.stringify(secEvent.details), secEvent.ip_address, secEvent.status, secEvent.created_at]
        );
        if (secAlert) {
          await query(
            'INSERT INTO security_alerts (id, user_id, transaction_id, title, message, risk_score, risk_level, is_acknowledged, action_taken, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [secAlert.id, secAlert.user_id, secAlert.transaction_id, secAlert.title, secAlert.message, secAlert.risk_score, secAlert.risk_level, secAlert.is_acknowledged, secAlert.action_taken, secAlert.created_at, secAlert.updated_at]
          );
        }
      } catch (dbErr) {
        console.warn('⚠️ Fallback memoryStore pour security_events/alerts :', dbErr.message);
      }
    }

    if (memoryStore.security_events) memoryStore.security_events.push(secEvent);
    if (secAlert && memoryStore.security_alerts) memoryStore.security_alerts.push(secAlert);

    return {
      riskScore,
      riskLevel,
      requiresConfirmation,
      reasons,
      factors,
      explanationSummary,
      warnings,
      eventId,
      alertId: secAlert ? alertId : null,
      recommendation: riskLevel === 'HIGH'
        ? 'Vérification supplémentaire requise : confirmation explicite demandée avant exécution.'
        : (riskLevel === 'MEDIUM' ? 'Avertissement : vérifiez les détails de l\'opération.' : 'Transaction normale et sécurisée.')
    };
  }

  /**
   * Récupère les alertes de sécurité d'un utilisateur
   */
  static async getAlerts(userId, unacknowledgedOnly = false) {
    if (pool) {
      try {
        let sql = 'SELECT * FROM security_alerts WHERE user_id = $1';
        const params = [userId];
        if (unacknowledgedOnly) {
          sql += ' AND is_acknowledged = FALSE';
        }
        sql += ' ORDER BY created_at DESC LIMIT 50';

        const res = await query(sql, params);
        if (res.rows) return res.rows;
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour getAlerts :', err.message);
      }
    }

    if (memoryStore.security_alerts) {
      return memoryStore.security_alerts
        .filter(a => a.user_id === userId && (!unacknowledgedOnly || !a.is_acknowledged))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return [];
  }

  /**
   * Récupère les événements de sécurité (journal d'audit) d'un utilisateur
   */
  static async getEvents(userId, limit = 50) {
    if (pool) {
      try {
        const res = await query(
          'SELECT * FROM security_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
          [userId, limit]
        );
        if (res.rows) return res.rows;
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour getEvents :', err.message);
      }
    }

    if (memoryStore.security_events) {
      return memoryStore.security_events
        .filter(e => e.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    }

    return [];
  }

  /**
   * Traite la confirmation explicite ou l'annulation d'une opération à risque élevé
   */
  static async confirmOperation(userId, alertId, decision = 'CONFIRMED') {
    const validDecisions = ['CONFIRMED', 'CANCELLED', 'DISMISSED'];
    if (!validDecisions.includes(decision)) {
      throw new Error(`Décision invalide : ${decision}. Valeurs autorisées : ${validDecisions.join(', ')}`);
    }

    const nowIso = new Date().toISOString();

    if (pool) {
      try {
        const res = await query(
          'UPDATE security_alerts SET is_acknowledged = TRUE, action_taken = $1, updated_at = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
          [decision, nowIso, alertId, userId]
        );
        if (res.rows && res.rows.length > 0) return res.rows[0];
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour confirmOperation :', err.message);
      }
    }

    if (memoryStore.security_alerts) {
      const alert = memoryStore.security_alerts.find(a => a.id === alertId && a.user_id === userId);
      if (alert) {
        alert.is_acknowledged = true;
        alert.action_taken = decision;
        alert.updated_at = nowIso;
        return alert;
      }
    }

    throw new Error('Alerte introuvable ou accès non autorisé.');
  }
}

export default ShieldService;

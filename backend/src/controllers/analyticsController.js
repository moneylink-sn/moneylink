/**
 * MoneyLink — AnalyticsController (Contrôleur des Statistiques Administrateur & Tracking)
 */

import { AnalyticsService } from '../services/analyticsService.js';

export class AnalyticsController {
  /**
   * Enregistre un événement de navigation, visiteur ou interaction
   * Accessible publiquement ou authentifié
   */
  static async trackEvent(req, res, next) {
    try {
      const { event_type, session_id, platform, metadata } = req.body;
      const userId = req.user?.id || req.body.user_id || null;

      if (!event_type) {
        return res.status(400).json({
          success: false,
          error: 'Le paramètre event_type est requis (ex: PAGE_VIEW, APP_OPEN).'
        });
      }

      const event = await AnalyticsService.recordEvent({
        event_type,
        user_id: userId,
        session_id,
        platform: platform || 'WEB_LANDING',
        metadata
      });

      return res.status(201).json({
        success: true,
        message: 'Événement analytics enregistré avec succès.',
        data: event
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retourne l'ensemble des KPIs, statistiques et séries temporelles pour l'administrateur
   * Protégé par JWT & rôle ADMIN
   */
  static async getAdminStatistics(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const statistics = await AnalyticsService.getAdminStatistics({ period });

      return res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (err) {
      next(err);
    }
  }
}

/**
 * MoneyLink — AnalyticsController (Contrôleur d'Ingestion & Endpoints d'Analyse Super Admin)
 */

import { AnalyticsService } from '../services/analyticsService.js';

export class AnalyticsController {
  /**
   * Enregistre un événement de tracking (public / anonyme / connecté)
   * Supporte événement unique ou tableau d'événements
   */
  static async trackEvent(req, res, next) {
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
      const country = req.headers['cf-ipcountry'] || req.headers['x-country'] || null;
      const city = req.headers['cf-ipcity'] || req.headers['x-city'] || null;
      const userId = req.user?.id || req.body.user_id || null;

      const payload = req.body;

      if (Array.isArray(payload.events)) {
        // Enregistrement par lot (Batch tracking)
        const recorded = await Promise.all(
          payload.events.map(ev =>
            AnalyticsService.recordEvent({
              ...ev,
              user_id: userId || ev.user_id,
              user_agent: userAgent,
              ip_address: ip,
              country: country || ev.country,
              city: city || ev.city
            })
          )
        );

        return res.status(201).json({
          success: true,
          count: recorded.filter(Boolean).length,
          message: 'Événements enregistrés avec succès.'
        });
      }

      if (!payload.event_type) {
        return res.status(400).json({
          success: false,
          error: 'Le paramètre event_type est requis (ex: PAGE_VIEW, PRODUCT_VIEW, ADD_TO_CART).'
        });
      }

      const event = await AnalyticsService.recordEvent({
        ...payload,
        user_id: userId,
        user_agent: userAgent,
        ip_address: ip,
        country: country || payload.country,
        city: city || payload.city
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
   * Heartbeat léger pour le comptage des visiteurs actifs en direct
   */
  static async trackHeartbeat(req, res, next) {
    try {
      const { visitor_id, session_id, page_url } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';

      await AnalyticsService.recordEvent({
        event_type: 'HEARTBEAT',
        visitor_id,
        session_id,
        page_url: page_url || '/',
        user_agent: userAgent,
        ip_address: ip
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/analytics/overview
   */
  static async getOverview(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const data = await AnalyticsService.getOverviewStats({ period });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/analytics/visitors
   */
  static async getVisitors(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const data = await AnalyticsService.getVisitorsStats({ period });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/analytics/evolution
   */
  static async getEvolution(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const data = await AnalyticsService.getEvolutionTimeline({ period });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/analytics/devices
   */
  static async getDevices(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const data = await AnalyticsService.getDevicesStats({ period });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/analytics/sources
   */
  static async getSources(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const data = await AnalyticsService.getSourcesStats({ period });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/analytics/products
   */
  static async getProducts(req, res, next) {
    try {
      const { period = '30d', limit = 10 } = req.query;
      const data = await AnalyticsService.getProductsRanking({ period, limit: parseInt(limit, 10) || 10 });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/analytics/conversion
   */
  static async getConversion(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const data = await AnalyticsService.getConversionFunnel({ period });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/analytics/realtime
   */
  static async getRealtime(req, res, next) {
    try {
      const { limit = 30 } = req.query;
      const data = await AnalyticsService.getRealtimeEvents({ limit: parseInt(limit, 10) || 30 });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/analytics/pages
   */
  static async getPages(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const data = await AnalyticsService.getPagesStats({ period });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/analytics/geography
   */
  static async getGeography(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const data = await AnalyticsService.getGeographyStats({ period });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/statistics (Master Bundle complet)
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

/**
 * MoneyLink V2 — Contrôleur MoneyLink Business
 */

import { BusinessService } from '../services/business/businessService.js';

export const BusinessController = {
  /**
   * Récupère le tableau de bord marchand consolidé
   * GET /api/business/dashboard
   */
  async getDashboard(req, res, next) {
    try {
      const userId = req.user.id;
      const dashboard = await BusinessService.getDashboard(userId);

      return res.status(200).json({
        success: true,
        data: dashboard
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Récupère le profil business et les paramètres
   * GET /api/business/profile
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { merchant, businessProfile } = await BusinessService.getOrCreateProfile(userId);

      return res.status(200).json({
        success: true,
        data: {
          merchant,
          businessProfile
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Met à jour le profil business et objectifs
   * PUT /api/business/profile
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updated = await BusinessService.updateProfile(userId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Profil business mis à jour avec succès.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }
};

export default BusinessController;

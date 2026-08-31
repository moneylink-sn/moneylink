/**
 * MoneyLink V2 — Contrôleur MoneyLink IA
 */

import { AiService } from '../services/ai/aiService.js';

export const AiController = {
  /**
   * Traite une question posée à l'assistant financier
   * POST /api/ai/chat
   */
  async chat(req, res, next) {
    try {
      const userId = req.user.id;
      const { message, language = 'fr' } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Le message est obligatoire.'
        });
      }

      const result = await AiService.askQuestion(userId, message, language);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Récupère la synthèse financière et les conseils budgétaires
   * GET /api/ai/insights
   */
  async getInsights(req, res, next) {
    try {
      const userId = req.user.id;
      const language = req.query.lang || 'fr';

      const insights = await AiService.getInsights(userId, language);

      return res.status(200).json({
        success: true,
        data: insights
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Récupère l'historique des conversations
   * GET /api/ai/conversations
   */
  async getConversations(req, res, next) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit || '50', 10);

      const history = await AiService.getConversations(userId, limit);

      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (err) {
      next(err);
    }
  }
};

export default AiController;

/**
 * MoneyLink V2 — Routes MoneyLink IA (/api/ai)
 */

import { Router } from 'express';
import { AiController } from '../controllers/aiController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Toutes les routes de l'assistant nécessitent d'être connecté
router.use(authenticateJWT);

router.post('/chat', AiController.chat);
router.get('/insights', AiController.getInsights);
router.get('/conversations', AiController.getConversations);

export default router;

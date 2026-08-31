/**
 * MoneyLink V2 — Routes MoneyLink Shield (/api/security)
 */

import { Router } from 'express';
import { SecurityController } from '../controllers/securityController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

// Toutes les routes de sécurité nécessitent d'être connecté
router.use(authenticateJWT);

router.post('/analyze', SecurityController.analyze);
router.get('/alerts', SecurityController.getAlerts);
router.get('/events', SecurityController.getEvents);
router.post('/confirm', SecurityController.confirm);

export default router;

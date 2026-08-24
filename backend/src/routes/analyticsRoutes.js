/**
 * MoneyLink — Routes Analytics & Tracking (/api/analytics)
 */

import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';

const router = Router();

// Route publique / semi-anonyme pour traquer les visites, ouvertures d'application et interactions
router.post('/events', AnalyticsController.trackEvent);

export default router;

/**
 * MoneyLink — Routes Analytics & Tracking (/api/analytics)
 */

import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';

const router = Router();

// Ingestion d'événements de tracking (public / anonyme / connecté)
router.post('/events', AnalyticsController.trackEvent);
router.post('/track', AnalyticsController.trackEvent);
router.post('/heartbeat', AnalyticsController.trackHeartbeat);

export default router;

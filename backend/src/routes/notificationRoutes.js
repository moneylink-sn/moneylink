/**
 * MoneyLink — Routes Notifications (/api/notifications)
 */

import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', NotificationController.getNotifications);
router.put('/:id/read', NotificationController.markAsRead);
router.put('/read-all', NotificationController.markAllAsRead);

// Déclencheurs réservés aux administrateurs & Workers
router.post('/test-dispatch', requireRole('ADMIN'), NotificationController.testDispatch);
router.post('/jobs/savings-reminders', requireRole('ADMIN'), NotificationController.triggerSavingsReminderJob);

export default router;

/**
 * MoneyLink — Routes Notifications (/api/notifications)
 */

import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', NotificationController.getNotifications);
router.put('/:id/read', NotificationController.markAsRead);
router.put('/read-all', NotificationController.markAllAsRead);

// Déclencheurs de test & Jobs
router.post('/test-dispatch', NotificationController.testDispatch);
router.post('/jobs/savings-reminders', NotificationController.triggerSavingsReminderJob);

export default router;

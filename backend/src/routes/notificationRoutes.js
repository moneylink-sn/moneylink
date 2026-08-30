/**
 * MoneyLink — Routes Notifications (/api/notifications)
 */

import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireRole, requireSuperAdmin } from '../middleware/roles.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', NotificationController.getNotifications);
router.put('/:id/read', NotificationController.markAsRead);
router.put('/read-all', NotificationController.markAllAsRead);

// Déclencheurs strictement réservés au Super Administrateur (Codé Samb)
router.post('/test-dispatch', requireSuperAdmin, NotificationController.testDispatch);
router.post('/jobs/savings-reminders', requireSuperAdmin, NotificationController.triggerSavingsReminderJob);

export default router;

/**
 * MoneyLink — Routes Webhooks Partenaires (/api/webhooks)
 */

import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController.js';

const router = Router();

// Routes publiques appelées par les serveurs Wave et Orange Money
router.post('/wave', WebhookController.handleWaveWebhook);
router.post('/orange-money', WebhookController.handleOrangeMoneyWebhook);

export default router;

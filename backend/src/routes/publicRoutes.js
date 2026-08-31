/**
 * MoneyLink — Routes Publiques & Transparence (/api/public)
 */

import { Router } from 'express';
import { PublicController } from '../controllers/publicController.js';

const router = Router();

router.get('/payment-methods', PublicController.getPaymentMethodsStatus);
router.get('/ecosystem-stats', PublicController.getEcosystemStats);

export default router;

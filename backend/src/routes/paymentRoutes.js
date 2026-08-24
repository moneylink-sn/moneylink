/**
 * MoneyLink — Routes Paiements & Portefeuille (/api/payments)
 */

import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { paymentSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJWT);

router.post('/checkout', validate(paymentSchema), PaymentController.checkout);
router.post('/topup', PaymentController.topUp);
router.get('/transactions', PaymentController.getTransactions);
router.get('/wallet', PaymentController.getWallet);

export default router;

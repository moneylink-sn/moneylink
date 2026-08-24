/**
 * MoneyLink — Routes Commandes & Séquestre (/api/orders)
 */

import { Router } from 'express';
import { OrderController } from '../controllers/orderController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { orderSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJWT);

router.post('/', validate(orderSchema), OrderController.createOrder);
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);
router.put('/:id/ship', OrderController.markAsShipped);
router.post('/:id/validate-code', OrderController.validateDeliveryCode);
router.post('/:id/confirm', OrderController.confirmReceipt);
router.post('/:id/dispute', OrderController.openDispute);

export default router;

/**
 * MoneyLink — Routes Commandes & Séquestre (/api/orders)
 */

import { Router } from 'express';
import { OrderController } from '../controllers/orderController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { orderSchema, validateDeliveryCodeSchema, disputeSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateJWT);

router.post('/', validate(orderSchema), OrderController.createOrder);
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);

// Expédition (supporte PUT et POST)
router.put('/:id/ship', OrderController.markAsShipped);
router.post('/:id/ship', OrderController.markAsShipped);

// Validation du code OTP de livraison (supporte validate-code et validate-delivery-code)
router.post('/:id/validate-code', validate(validateDeliveryCodeSchema), OrderController.validateDeliveryCode);
router.post('/:id/validate-delivery-code', validate(validateDeliveryCodeSchema), OrderController.validateDeliveryCode);

// Confirmation directe 1-clic par l'acheteur
router.post('/:id/confirm', OrderController.confirmReceipt);

// Déclaration de litige
router.post('/:id/dispute', validate(disputeSchema), OrderController.openDispute);

export default router;

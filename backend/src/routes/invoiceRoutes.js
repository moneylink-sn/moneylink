/**
 * MoneyLink V2 — Routes Factures & Reçus (/api/invoices et /api/receipts)
 */

import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

export const invoiceRouter = Router();

// Routes publiques de consultation sécurisée via token ou identifiant reçu
invoiceRouter.get('/public/:token', InvoiceController.getPublicByToken);
invoiceRouter.get('/receipts/:id', InvoiceController.getReceipt);

// Routes protégées par authentification pour les factures
invoiceRouter.use(authenticateJWT);
invoiceRouter.post('/', requireRole('MERCHANT', 'ADMIN'), InvoiceController.create);
invoiceRouter.get('/', InvoiceController.list);
invoiceRouter.get('/:id', InvoiceController.getById);
invoiceRouter.put('/:id', requireRole('MERCHANT', 'ADMIN'), InvoiceController.update);
invoiceRouter.post('/:id/cancel', requireRole('MERCHANT', 'ADMIN'), InvoiceController.cancel);
invoiceRouter.post('/:id/send', requireRole('MERCHANT', 'ADMIN'), InvoiceController.send);
invoiceRouter.post('/:id/pay', InvoiceController.pay);

// Sous-routeur dédié aux reçus numériques (/api/receipts)
export const receiptRouter = Router();
receiptRouter.get('/public/:token', InvoiceController.getReceipt);
receiptRouter.get('/:id', InvoiceController.getReceipt);

export default invoiceRouter;


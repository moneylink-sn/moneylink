/**
 * MoneyLink V2 — Contrôleur Factures & Reçus
 */

import { InvoiceService } from '../services/invoices/invoiceService.js';

export const InvoiceController = {
  /**
   * Crée une nouvelle facture
   * POST /api/invoices
   */
  async create(req, res, next) {
    try {
      const merchantUserId = req.user.id;
      const invoice = await InvoiceService.createInvoice(merchantUserId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Facture créée avec succès.',
        data: invoice
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Liste les factures de l'utilisateur connecté
   * GET /api/invoices
   */
  async list(req, res, next) {
    try {
      const userId = req.user.id;
      const role = req.user.role || 'MERCHANT';

      const invoices = await InvoiceService.listInvoices(userId, role);

      return res.status(200).json({
        success: true,
        data: invoices
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Récupère le détail d'une facture par son ID
   * GET /api/invoices/:id
   */
  async getById(req, res, next) {
    try {
      const userId = req.user.id;
      const invoiceId = req.params.id;
      const role = req.user.role || 'CLIENT';

      const invoice = await InvoiceService.getInvoiceById(userId, invoiceId, role);

      return res.status(200).json({
        success: true,
        data: invoice
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Modifie une facture
   * PUT /api/invoices/:id
   */
  async update(req, res, next) {
    try {
      const merchantUserId = req.user.id;
      const invoiceId = req.params.id;
      const updated = await InvoiceService.updateInvoice(merchantUserId, invoiceId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Facture mise à jour avec succès.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Annule une facture
   * POST /api/invoices/:id/cancel
   */
  async cancel(req, res, next) {
    try {
      const merchantUserId = req.user.id;
      const invoiceId = req.params.id;
      const result = await InvoiceService.cancelInvoice(merchantUserId, invoiceId, req.body?.reason);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Marque une facture comme envoyée et génère les liens WhatsApp
   * POST /api/invoices/:id/send
   */
  async send(req, res, next) {
    try {
      const merchantUserId = req.user.id;
      const invoiceId = req.params.id;

      const result = await InvoiceService.sendInvoice(merchantUserId, invoiceId);

      return res.status(200).json({
        success: true,
        message: 'Facture envoyée avec succès.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Règle une facture et émet le reçu numérique officiel
   * POST /api/invoices/:id/pay
   */
  async pay(req, res, next) {
    try {
      const userId = req.user?.id || null;
      const invoiceId = req.params.id;
      const { payment_method = 'WAVE' } = req.body;

      const result = await InvoiceService.payInvoice(userId, invoiceId, payment_method);

      return res.status(200).json({
        success: true,
        message: 'Facture réglée avec succès.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Consultation publique sécurisée par token de partage
   * GET /api/invoices/public/:token
   */
  async getPublicByToken(req, res, next) {
    try {
      const token = req.params.token;
      const invoice = await InvoiceService.getInvoiceByShareToken(token);

      return res.status(200).json({
        success: true,
        data: invoice
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Récupère un reçu par son identifiant
   * GET /api/receipts/:id
   */
  async getReceipt(req, res, next) {
    try {
      const receiptId = req.params.id;
      const receipt = await InvoiceService.getReceiptById(receiptId);

      return res.status(200).json({
        success: true,
        data: receipt
      });
    } catch (err) {
      next(err);
    }
  }
};

export default InvoiceController;

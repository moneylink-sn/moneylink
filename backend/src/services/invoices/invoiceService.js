/**
 * MoneyLink V2 — Service Factures & Reçus Numériques (Invoices & Digital Receipts)
 * Création, numérotation séquentielle automatique (ML-YYYY-XXXXXX), gestion des statuts,
 * paiement sécurisé, émission de reçu officiel (REC-YYYY-XXXXXX) et partage WhatsApp/SMS.
 */

import { query, pool, memoryStore } from '../../config/db.js';
import crypto from 'crypto';

export class InvoiceService {
  /**
   * Génère un numéro de facture séquentiel unique (ex: ML-2026-000001)
   */
  static async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    let count = 1;

    if (pool) {
      try {
        const res = await query(
          "SELECT COUNT(*) as total FROM invoices WHERE invoice_number LIKE $1",
          [`ML-${year}-%`]
        );
        count = parseInt(res.rows[0]?.total || '0', 10) + 1;
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour generateInvoiceNumber :', err.message);
      }
    }

    if (memoryStore.invoices) {
      const memCount = memoryStore.invoices.filter(i => (i.invoice_number || '').startsWith(`ML-${year}-`)).length;
      if (memCount >= count) count = memCount + 1;
    }

    return `ML-${year}-${String(count).padStart(6, '0')}`;
  }

  /**
   * Génère un numéro de reçu séquentiel unique (ex: REC-2026-000001)
   */
  static async generateReceiptNumber() {
    const year = new Date().getFullYear();
    let count = 1;

    if (pool) {
      try {
        const res = await query(
          "SELECT COUNT(*) as total FROM receipts WHERE receipt_number LIKE $1",
          [`REC-${year}-%`]
        );
        count = parseInt(res.rows[0]?.total || '0', 10) + 1;
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour generateReceiptNumber :', err.message);
      }
    }

    if (memoryStore.receipts) {
      const memCount = memoryStore.receipts.filter(r => (r.receipt_number || '').startsWith(`REC-${year}-`)).length;
      if (memCount >= count) count = memCount + 1;
    }

    return `REC-${year}-${String(count).padStart(6, '0')}`;
  }

  /**
   * Crée une nouvelle facture avec ses lignes d'articles
   */
  static async createInvoice(merchantUserId, data) {
    let merchant = null;
    if (pool) {
      try {
        const mRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [merchantUserId]);
        merchant = mRes.rows[0];
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour merchant createInvoice :', err.message);
      }
    }
    if (!merchant && memoryStore.merchants) {
      merchant = memoryStore.merchants.find(m => m.user_id === merchantUserId);
    }

    if (!merchant) {
      throw new Error('Seul un compte marchand peut émettre des factures.');
    }

    const {
      client_name,
      client_phone,
      client_email = null,
      client_address = '',
      items = [],
      discount_amount = 0,
      due_date = null,
      notes = ''
    } = data;

    if (!client_name || !client_phone) {
      throw new Error('Le nom et le numéro de téléphone du client sont obligatoires.');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('La facture doit comporter au moins une ligne de produit ou service.');
    }

    // Calcul des totaux
    let subtotal = 0;
    const validatedItems = items.map(itm => {
      const qty = parseInt(itm.quantity || 1, 10);
      const unitPrice = parseFloat(itm.unit_price || 0);
      const totalPrice = qty * unitPrice;
      subtotal += totalPrice;
      return {
        id: `ii_${crypto.randomUUID ? crypto.randomUUID() : (Date.now() + Math.random())}`,
        product_id: itm.product_id || null,
        description: itm.description || 'Article / Prestation',
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalPrice
      };
    });

    const discount = parseFloat(discount_amount || 0);
    const totalAmount = Math.max(0, subtotal - discount);

    const invoiceId = `inv_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const invoiceNumber = await this.generateInvoiceNumber();
    const shareToken = `tok_inv_${crypto.randomBytes(12).toString('hex')}`;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];

    const invoiceRecord = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      merchant_id: merchant.id,
      client_id: null,
      client_name,
      client_phone,
      client_email,
      client_address,
      subtotal,
      discount_amount: discount,
      total_amount: totalAmount,
      paid_amount: 0,
      currency: 'XOF',
      status: 'BROUILLON',
      issue_date: todayDate,
      due_date: due_date || null,
      notes,
      share_token: shareToken,
      created_at: nowIso,
      updated_at: nowIso
    };

    if (pool) {
      try {
        await query(`
          INSERT INTO invoices (
            id, invoice_number, merchant_id, client_id, client_name, client_phone, client_email,
            client_address, subtotal, discount_amount, total_amount, paid_amount, currency,
            status, issue_date, due_date, notes, share_token, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        `, [
          invoiceRecord.id, invoiceRecord.invoice_number, invoiceRecord.merchant_id, invoiceRecord.client_id,
          invoiceRecord.client_name, invoiceRecord.client_phone, invoiceRecord.client_email, invoiceRecord.client_address,
          invoiceRecord.subtotal, invoiceRecord.discount_amount, invoiceRecord.total_amount, invoiceRecord.paid_amount,
          invoiceRecord.currency, invoiceRecord.status, invoiceRecord.issue_date, invoiceRecord.due_date,
          invoiceRecord.notes, invoiceRecord.share_token, invoiceRecord.created_at, invoiceRecord.updated_at
        ]);

        for (const item of validatedItems) {
          await query(`
            INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, unit_price, total_price, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [item.id, invoiceId, item.product_id, item.description, item.quantity, item.unit_price, item.total_price, nowIso]);
        }
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour createInvoice :', err.message);
      }
    }

    if (memoryStore.invoices) memoryStore.invoices.push(invoiceRecord);
    if (memoryStore.invoice_items) {
      validatedItems.forEach(itm => memoryStore.invoice_items.push({ ...itm, invoice_id: invoiceId }));
    }

    return {
      ...invoiceRecord,
      items: validatedItems,
      merchant: {
        businessName: merchant.business_name,
        phone: merchant.whatsapp_phone || merchant.phone
      }
    };
  }

  /**
   * Récupère la liste des factures d'un utilisateur (en tant que marchand ou client)
   */
  static async listInvoices(userId, role = 'MERCHANT') {
    let merchantId = null;
    if (role === 'MERCHANT') {
      if (pool) {
        try {
          const mRes = await query('SELECT id FROM merchants WHERE user_id = $1 LIMIT 1', [userId]);
          merchantId = mRes.rows[0]?.id;
        } catch (err) {
          console.warn('⚠️ Fallback memoryStore pour merchantId listInvoices :', err.message);
        }
      }
      if (!merchantId && memoryStore.merchants) {
        merchantId = memoryStore.merchants.find(m => m.user_id === userId)?.id;
      }
    }

    let invoices = [];
    if (pool) {
      try {
        let sql = '';
        let params = [];
        if (role === 'MERCHANT' && merchantId) {
          sql = 'SELECT * FROM invoices WHERE merchant_id = $1 ORDER BY created_at DESC';
          params = [merchantId];
        } else {
          sql = 'SELECT * FROM invoices WHERE client_id = $1 OR client_phone = (SELECT phone FROM users WHERE id = $1 LIMIT 1) ORDER BY created_at DESC';
          params = [userId];
        }
        const res = await query(sql, params);
        invoices = res.rows || [];
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour listInvoices :', err.message);
      }
    }

    if (!invoices.length && memoryStore.invoices) {
      if (role === 'MERCHANT' && merchantId) {
        invoices = memoryStore.invoices.filter(i => i.merchant_id === merchantId);
      } else {
        const userPhone = memoryStore.users?.find(u => u.id === userId)?.phone;
        invoices = memoryStore.invoices.filter(i => i.client_id === userId || (userPhone && i.client_phone === userPhone));
      }
    }

    return invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  /**
   * Récupère les détails complets d'une facture par son identifiant avec protection IDOR
   */
  static async getInvoiceById(userId, invoiceId, role = 'CLIENT') {
    let invoice = null;
    let items = [];
    let receipt = null;
    let merchant = null;

    if (pool) {
      try {
        const invRes = await query('SELECT * FROM invoices WHERE id = $1 LIMIT 1', [invoiceId]);
        invoice = invRes.rows[0] || null;

        if (invoice) {
          const itemRes = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
          items = itemRes.rows || [];

          const recRes = await query('SELECT * FROM receipts WHERE invoice_id = $1 LIMIT 1', [invoiceId]);
          receipt = recRes.rows[0] || null;

          const mRes = await query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [invoice.merchant_id]);
          merchant = mRes.rows[0] || null;
        }
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour getInvoiceById :', err.message);
      }
    }

    if (!invoice && memoryStore.invoices) {
      invoice = memoryStore.invoices.find(i => i.id === invoiceId) || null;
      if (invoice) {
        items = memoryStore.invoice_items?.filter(it => it.invoice_id === invoiceId) || [];
        receipt = memoryStore.receipts?.find(r => r.invoice_id === invoiceId) || null;
        merchant = memoryStore.merchants?.find(m => m.id === invoice.merchant_id) || null;
      }
    }

    if (!invoice) {
      throw new Error('Facture introuvable.');
    }

    // Vérification de sécurité IDOR : Seul le marchand créateur, le client destinataire ou un admin peut consulter
    if (role !== 'ADMIN') {
      const isMerchantOwner = merchant?.user_id === userId;
      const isClientOwner = invoice.client_id === userId;
      let userPhone = null;
      if (pool) {
        try {
          const uRes = await query('SELECT phone FROM users WHERE id = $1', [userId]);
          userPhone = uRes.rows[0]?.phone;
        } catch (err) {
          console.warn('⚠️ Fallback memoryStore pour userPhone getInvoiceById :', err.message);
        }
      }
      if (!userPhone && memoryStore.users) {
        userPhone = memoryStore.users.find(u => u.id === userId)?.phone;
      }
      const isPhoneOwner = userPhone && userPhone === invoice.client_phone;

      if (!isMerchantOwner && !isClientOwner && !isPhoneOwner) {
        throw new Error('Accès non autorisé à cette facture.');
      }
    }

    return {
      ...invoice,
      items,
      receipt,
      merchant: merchant ? {
        id: merchant.id,
        businessName: merchant.business_name,
        businessType: merchant.business_type,
        address: merchant.address,
        city: merchant.city,
        phone: merchant.phone,
        whatsappPhone: merchant.whatsapp_phone,
        logoUrl: merchant.logo_url
      } : null
    };
  }

  /**
   * Consultation publique sécurisée via share_token
   */
  static async getInvoiceByShareToken(token) {
    let invoice = null;
    let items = [];
    let receipt = null;
    let merchant = null;

    if (pool) {
      try {
        const res = await query('SELECT * FROM invoices WHERE share_token = $1 LIMIT 1', [token]);
        invoice = res.rows[0] || null;
        if (invoice) {
          const itemRes = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoice.id]);
          items = itemRes.rows || [];
          const recRes = await query('SELECT * FROM receipts WHERE invoice_id = $1 LIMIT 1', [invoice.id]);
          receipt = recRes.rows[0] || null;
          const mRes = await query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [invoice.merchant_id]);
          merchant = mRes.rows[0] || null;
        }
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour getInvoiceByShareToken :', err.message);
      }
    }

    if (!invoice && memoryStore.invoices) {
      invoice = memoryStore.invoices.find(i => i.share_token === token) || null;
      if (invoice) {
        items = memoryStore.invoice_items?.filter(it => it.invoice_id === invoice.id) || [];
        receipt = memoryStore.receipts?.find(r => r.invoice_id === invoice.id) || null;
        merchant = memoryStore.merchants?.find(m => m.id === invoice.merchant_id) || null;
      }
    }

    if (!invoice) {
      throw new Error('Lien de facture invalide ou expiré.');
    }

    return {
      ...invoice,
      items,
      receipt,
      merchant: merchant ? {
        businessName: merchant.business_name,
        businessType: merchant.business_type,
        address: merchant.address,
        city: merchant.city,
        phone: merchant.phone,
        whatsappPhone: merchant.whatsapp_phone,
        logoUrl: merchant.logo_url
      } : null
    };
  }

  /**
   * Marque une facture comme envoyée et génère les liens de partage
   */
  static async sendInvoice(merchantUserId, invoiceId) {
    const invoiceData = await this.getInvoiceById(merchantUserId, invoiceId, 'MERCHANT');
    const nowIso = new Date().toISOString();

    if (pool) {
      try {
        await query(
          "UPDATE invoices SET status = 'ENVOYÉE', updated_at = $1 WHERE id = $2",
          [nowIso, invoiceId]
        );
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour sendInvoice :', err.message);
      }
    }
    if (memoryStore.invoices) {
      const inv = memoryStore.invoices.find(i => i.id === invoiceId);
      if (inv) {
        inv.status = 'ENVOYÉE';
        inv.updated_at = nowIso;
      }
    }

    const appBaseUrl = process.env.PUBLIC_APP_URL || 'https://moneylink.sn';
    const secureShareUrl = `${appBaseUrl}/invoices/view?token=${invoiceData.share_token}`;
    
    // Texte préformaté pour partage direct sur WhatsApp
    const whatsappText = encodeURIComponent(
      `🧾 *Facture MoneyLink N° ${invoiceData.invoice_number}*\n` +
      `Bonjour ${invoiceData.client_name},\n` +
      `Votre commerçant *${invoiceData.merchant?.businessName || 'Boutique'}* vous a émis une facture de *${parseFloat(invoiceData.total_amount).toLocaleString('fr-FR')} FCFA*.\n\n` +
      `🔗 Consultez et réglez en toute sécurité ici : ${secureShareUrl}\n\n` +
      `🔒 Paiement protégé par MoneyLink Séquestre (Wave / Orange Money).`
    );

    const cleanPhone = (invoiceData.client_phone || '').replace(/[\s+-]/g, '');
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${whatsappText}`;

    return {
      success: true,
      invoiceId,
      status: 'ENVOYÉE',
      shareUrl: secureShareUrl,
      whatsappLink
    };
  }

  /**
   * Modifie une facture existante (si elle n'est pas déjà payée ou annulée)
   */
  static async updateInvoice(merchantUserId, invoiceId, data) {
    const existing = await this.getInvoiceById(merchantUserId, invoiceId, 'MERCHANT');
    if (existing.status === 'PAYÉE') {
      throw new Error('Une facture déjà payée ne peut plus être modifiée.');
    }
    if (existing.status === 'ANNULÉE') {
      throw new Error('Une facture annulée ne peut pas être modifiée.');
    }

    const {
      client_name = existing.client_name,
      client_phone = existing.client_phone,
      client_email = existing.client_email,
      client_address = existing.client_address,
      items,
      discount_amount,
      due_date = existing.due_date,
      notes = existing.notes
    } = data;

    let subtotal = existing.subtotal;
    let validatedItems = existing.items;

    if (Array.isArray(items) && items.length > 0) {
      subtotal = 0;
      validatedItems = items.map(itm => {
        const qty = parseInt(itm.quantity || 1, 10);
        const unitPrice = parseFloat(itm.unit_price || 0);
        const totalPrice = qty * unitPrice;
        subtotal += totalPrice;
        return {
          id: itm.id || `ii_${crypto.randomUUID ? crypto.randomUUID() : (Date.now() + Math.random())}`,
          product_id: itm.product_id || null,
          description: itm.description || 'Article / Prestation',
          quantity: qty,
          unit_price: unitPrice,
          total_price: totalPrice
        };
      });
    }

    const discount = discount_amount !== undefined ? parseFloat(discount_amount || 0) : parseFloat(existing.discount_amount || 0);
    const totalAmount = Math.max(0, subtotal - discount);
    const nowIso = new Date().toISOString();

    if (pool) {
      try {
        await query(`
          UPDATE invoices SET
            client_name = $1, client_phone = $2, client_email = $3, client_address = $4,
            subtotal = $5, discount_amount = $6, total_amount = $7, due_date = $8,
            notes = $9, updated_at = $10
          WHERE id = $11
        `, [client_name, client_phone, client_email, client_address, subtotal, discount, totalAmount, due_date, notes, nowIso, invoiceId]);

        if (Array.isArray(items) && items.length > 0) {
          await query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
          for (const item of validatedItems) {
            await query(`
              INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, unit_price, total_price, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [item.id, invoiceId, item.product_id, item.description, item.quantity, item.unit_price, item.total_price, nowIso]);
          }
        }
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour updateInvoice :', err.message);
      }
    }

    if (memoryStore.invoices) {
      const inv = memoryStore.invoices.find(i => i.id === invoiceId);
      if (inv) {
        inv.client_name = client_name;
        inv.client_phone = client_phone;
        inv.client_email = client_email;
        inv.client_address = client_address;
        inv.subtotal = subtotal;
        inv.discount_amount = discount;
        inv.total_amount = totalAmount;
        inv.due_date = due_date;
        inv.notes = notes;
        inv.updated_at = nowIso;
      }
    }

    if (Array.isArray(items) && items.length > 0 && memoryStore.invoice_items) {
      memoryStore.invoice_items = memoryStore.invoice_items.filter(it => it.invoice_id !== invoiceId);
      validatedItems.forEach(itm => memoryStore.invoice_items.push({ ...itm, invoice_id: invoiceId }));
    }

    return {
      ...existing,
      client_name,
      client_phone,
      client_email,
      client_address,
      subtotal,
      discount_amount: discount,
      total_amount: totalAmount,
      due_date,
      notes,
      items: validatedItems,
      updated_at: nowIso
    };
  }

  /**
   * Annule une facture (si elle n'est pas déjà payée)
   */
  static async cancelInvoice(merchantUserId, invoiceId, reason = '') {
    const existing = await this.getInvoiceById(merchantUserId, invoiceId, 'MERCHANT');
    if (existing.status === 'PAYÉE') {
      throw new Error('Une facture déjà payée ne peut pas être annulée.');
    }
    if (existing.status === 'ANNULÉE') {
      return { success: true, message: 'La facture est déjà annulée.', invoiceId };
    }

    const nowIso = new Date().toISOString();

    if (pool) {
      try {
        await query("UPDATE invoices SET status = 'ANNULÉE', updated_at = $1 WHERE id = $2", [nowIso, invoiceId]);
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour cancelInvoice :', err.message);
      }
    }

    if (memoryStore.invoices) {
      const inv = memoryStore.invoices.find(i => i.id === invoiceId);
      if (inv) {
        inv.status = 'ANNULÉE';
        inv.updated_at = nowIso;
      }
    }

    return {
      success: true,
      message: 'Facture annulée avec succès.',
      invoiceId,
      status: 'ANNULÉE'
    };
  }

  /**
   * Règle une facture et génère automatiquement le reçu officiel numérique (REC-YYYY-XXXXXX)
   */
  static async payInvoice(userId, invoiceId, paymentMethod = 'WAVE') {
    let invoice = null;
    let merchant = null;

    if (pool) {
      try {
        const invRes = await query('SELECT * FROM invoices WHERE id = $1 LIMIT 1', [invoiceId]);
        invoice = invRes.rows[0];
        if (invoice) {
          const mRes = await query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [invoice.merchant_id]);
          merchant = mRes.rows[0];
        }
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour payInvoice :', err.message);
      }
    }

    if (!invoice && memoryStore.invoices) {
      invoice = memoryStore.invoices.find(i => i.id === invoiceId);
      if (invoice) {
        merchant = memoryStore.merchants?.find(m => m.id === invoice.merchant_id);
      }
    }

    if (!invoice) throw new Error('Facture introuvable.');
    if (invoice.status === 'PAYÉE') throw new Error('Cette facture a déjà été intégralement réglée.');
    if (invoice.status === 'ANNULÉE') throw new Error('Cette facture a été annulée.');

    const totalAmount = parseFloat(invoice.total_amount || 0);
    const nowIso = new Date().toISOString();
    const receiptNumber = await this.generateReceiptNumber();
    const receiptId = `rec_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const txRef = `${paymentMethod.toUpperCase()}-PAY-${Date.now()}`;
    const shareToken = `tok_rec_${crypto.randomBytes(12).toString('hex')}`;

    const receiptRecord = {
      id: receiptId,
      receipt_number: receiptNumber,
      invoice_id: invoice.id,
      order_id: null,
      merchant_id: invoice.merchant_id,
      client_id: userId || invoice.client_id,
      client_name: invoice.client_name,
      client_phone: invoice.client_phone,
      amount: totalAmount,
      currency: 'XOF',
      payment_method: paymentMethod,
      transaction_reference: txRef,
      status: 'COMPLETED',
      paid_at: nowIso,
      share_token: shareToken,
      metadata: {
        invoice_number: invoice.invoice_number,
        merchant_name: merchant?.business_name || 'Commerçant MoneyLink',
        payment_channel: paymentMethod
      },
      created_at: nowIso
    };

    if (pool) {
      try {
        await query(`
          UPDATE invoices SET
            status = 'PAYÉE',
            paid_amount = total_amount,
            updated_at = $1
          WHERE id = $2
        `, [nowIso, invoiceId]);

        await query(`
          INSERT INTO receipts (
            id, receipt_number, invoice_id, order_id, merchant_id, client_id, client_name,
            client_phone, amount, currency, payment_method, transaction_reference, status,
            paid_at, share_token, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          receiptRecord.id, receiptRecord.receipt_number, receiptRecord.invoice_id, receiptRecord.order_id,
          receiptRecord.merchant_id, receiptRecord.client_id, receiptRecord.client_name, receiptRecord.client_phone,
          receiptRecord.amount, receiptRecord.currency, receiptRecord.payment_method, receiptRecord.transaction_reference,
          receiptRecord.status, receiptRecord.paid_at, receiptRecord.share_token, JSON.stringify(receiptRecord.metadata),
          receiptRecord.created_at
        ]);

        // Crédit du portefeuille du marchand
        if (merchant) {
          await query(`
            UPDATE wallets SET
              available_balance = available_balance + $1,
              updated_at = $2
            WHERE user_id = $3
          `, [totalAmount, nowIso, merchant.user_id]);
        }
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour payInvoice execution :', err.message);
      }
    }

    if (memoryStore.invoices) {
      const inv = memoryStore.invoices.find(i => i.id === invoiceId);
      if (inv) {
        inv.status = 'PAYÉE';
        inv.paid_amount = totalAmount;
        inv.updated_at = nowIso;
      }
    }
    if (memoryStore.receipts) {
      memoryStore.receipts.push(receiptRecord);
    }
    if (merchant && memoryStore.wallets) {
      const mw = memoryStore.wallets.find(w => w.user_id === merchant.user_id);
      if (mw) {
        mw.available_balance = parseFloat(mw.available_balance || 0) + totalAmount;
      }
    }

    return {
      success: true,
      message: 'Paiement de la facture validé avec succès.',
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: 'PAYÉE',
        paid_amount: totalAmount
      },
      receipt: receiptRecord
    };
  }

  /**
   * Récupère un reçu par son identifiant, numéro ou share_token
   */
  static async getReceiptById(identifier) {
    let receipt = null;
    let merchant = null;

    if (pool) {
      try {
        const rRes = await query(
          'SELECT * FROM receipts WHERE id = $1 OR receipt_number = $1 OR share_token = $1 LIMIT 1',
          [identifier]
        );
        receipt = rRes.rows[0];
        if (receipt) {
          const mRes = await query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [receipt.merchant_id]);
          merchant = mRes.rows[0];
        }
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour getReceiptById :', err.message);
      }
    }

    if (!receipt && memoryStore.receipts) {
      receipt = memoryStore.receipts.find(
        r => r.id === identifier || r.receipt_number === identifier || r.share_token === identifier
      );
      if (receipt) {
        merchant = memoryStore.merchants?.find(m => m.id === receipt.merchant_id);
      }
    }

    if (!receipt) throw new Error('Reçu introuvable.');

    return {
      ...receipt,
      merchant: merchant ? {
        businessName: merchant.business_name,
        address: merchant.address,
        city: merchant.city,
        phone: merchant.phone,
        whatsappPhone: merchant.whatsapp_phone,
        logoUrl: merchant.logo_url
      } : null
    };
  }
}

export default InvoiceService;

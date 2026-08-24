/**
 * MoneyLink — OrderController (Commandes & Cycle Escrow)
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore } from '../config/db.js';
import { EscrowService } from '../services/escrowService.js';
import { notificationService } from '../services/notificationService.js';

export class OrderController {
  /**
   * Création d'une nouvelle commande par un acheteur
   */
  static async createOrder(req, res, next) {
    try {
      const buyerId = req.user.id;
      const { merchant_id, items, delivery_address, delivery_phone, delivery_notes } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Le panier de commande est vide.' });
      }

      const merchant = memoryStore.merchants.find(m => m.id === merchant_id);
      if (!merchant) {
        return res.status(404).json({ success: false, error: 'Commerçant introuvable.' });
      }

      // Calcul total et validation des produits
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const product = memoryStore.products.find(p => p.id === item.product_id && p.merchant_id === merchant_id);
        if (!product) {
          return res.status(400).json({ success: false, error: `Produit ID ${item.product_id} non trouvé chez ce marchand.` });
        }

        const quantity = parseInt(item.quantity, 10) || 1;
        const lineTotal = product.price * quantity;
        totalAmount += lineTotal;

        orderItems.push({
          id: uuidv4(),
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit_price: product.price,
          total_price: lineTotal
        });
      }

      const orderId = uuidv4();
      const orderNumber = `ML-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder = {
        id: orderId,
        order_number: orderNumber,
        buyer_id: buyerId,
        merchant_id,
        total_amount: totalAmount,
        escrow_amount: 0.00,
        service_fee: 0.00,
        status: 'PENDING_PAYMENT',
        delivery_address: delivery_address || 'Dakar',
        delivery_phone: delivery_phone || req.user.phone,
        delivery_notes: delivery_notes || '',
        items: orderItems,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      memoryStore.orders.push(newOrder);

      return res.status(201).json({
        success: true,
        message: 'Commande initiée. Prête pour le règlement sécurisé.',
        data: newOrder
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Récupère la liste des commandes de l'utilisateur (Acheteur ou Vendeur)
   */
  static async getOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      let orders = [];

      if (userRole === 'MERCHANT') {
        const merchant = memoryStore.merchants.find(m => m.user_id === userId);
        if (merchant) {
          orders = memoryStore.orders.filter(o => o.merchant_id === merchant.id);
        }
      } else {
        orders = memoryStore.orders.filter(o => o.buyer_id === userId);
      }

      // Enrichissement avec les informations marchand / acheteur
      const enrichedOrders = orders.map(order => {
        const merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);
        const buyer = memoryStore.users.find(u => u.id === order.buyer_id);
        return {
          ...order,
          merchant_name: merchant?.business_name || 'Commerçant',
          buyer_name: buyer ? `${buyer.first_name} ${buyer.last_name}` : 'Client'
        };
      });

      return res.status(200).json({
        success: true,
        data: enrichedOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Détail d'une commande
   */
  static async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const order = memoryStore.orders.find(o => o.id === id || o.order_number === id);

      if (!order) {
        return res.status(404).json({ success: false, error: 'Commande introuvable.' });
      }

      const merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);
      const buyer = memoryStore.users.find(u => u.id === order.buyer_id);
      const dispute = memoryStore.disputes.find(d => d.order_id === order.id);

      return res.status(200).json({
        success: true,
        data: {
          ...order,
          merchant,
          buyer: {
            id: buyer?.id,
            first_name: buyer?.first_name,
            last_name: buyer?.last_name,
            phone: buyer?.phone
          },
          dispute
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Le commerçant marque la commande comme expédiée
   */
  static async markAsShipped(req, res, next) {
    try {
      const { id } = req.params;
      const order = memoryStore.orders.find(o => o.id === id);

      if (!order) return res.status(404).json({ success: false, error: 'Commande introuvable.' });

      order.status = 'SHIPPED';
      order.shipped_at = new Date().toISOString();

      notificationService.sendNotification({
        userId: order.buyer_id,
        title: 'Colis Expédié 🚚',
        message: `Votre commande #${order.order_number} est en cours de livraison. Préparez votre code de réception lors de la remise.`,
        type: 'ORDER_STATUS',
        payload: { orderId: order.id }
      });

      return res.status(200).json({
        success: true,
        message: 'Statut mis à jour : Colis expédié.',
        data: order
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Validation de la livraison via le Code Secret OTP (Remis par l'acheteur au vendeur)
   */
  static async validateDeliveryCode(req, res, next) {
    try {
      const { id } = req.params;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ success: false, error: 'Veuillez saisir le code de réception à 6 chiffres.' });
      }

      const result = await EscrowService.releaseFundsWithCode({
        orderId: id,
        inputCode: code,
        validatedByUserId: req.user.id
      });

      return res.status(200).json({
        success: true,
        message: 'Code validé avec succès ! Les fonds ont été débloqués sur votre solde.',
        data: result
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Confirmation directe 1-clic par l'acheteur
   */
  static async confirmReceipt(req, res, next) {
    try {
      const { id } = req.params;
      const result = await EscrowService.releaseFundsByBuyer({
        orderId: id,
        buyerId: req.user.id
      });

      return res.status(200).json({
        success: true,
        message: 'Réception confirmée avec succès. Transaction clôturée.',
        data: result
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Ouverture d'un litige par l'acheteur
   */
  static async openDispute(req, res, next) {
    try {
      const { id } = req.params;
      const { reason, description, evidence_urls } = req.body;

      const order = memoryStore.orders.find(o => o.id === id);
      if (!order) return res.status(404).json({ success: false, error: 'Commande introuvable.' });

      if (order.buyer_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Seul l’acheteur peut ouvrir un litige sur cette commande.' });
      }

      order.status = 'DISPUTED';

      const disputeId = uuidv4();
      const newDispute = {
        id: disputeId,
        order_id: order.id,
        opened_by: req.user.id,
        reason: reason || 'DAMAGED',
        description: description || 'Problème lors de la réception',
        evidence_urls: evidence_urls || [],
        status: 'OPENED',
        resolution_notes: '',
        created_at: new Date().toISOString()
      };

      memoryStore.disputes.push(newDispute);

      notificationService.sendNotification({
        userId: order.buyer_id,
        title: 'Litige Ouvert ⚠️',
        message: `Votre réclamation sur la commande #${order.order_number} a été transmise à notre service client. Les fonds restent sécurisés.`,
        type: 'DISPUTE',
        payload: { disputeId, orderId: order.id }
      });

      return res.status(201).json({
        success: true,
        message: 'Litige enregistré avec succès. Les fonds sont gelés.',
        data: newDispute
      });
    } catch (err) {
      next(err);
    }
  }
}

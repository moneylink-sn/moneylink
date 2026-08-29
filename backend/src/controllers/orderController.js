/**
 * MoneyLink — OrderController (Commandes & Cycle Escrow)
 * Prise en charge PostgreSQL avec transactions ACID et fallback mémoire
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, withTransaction, pool } from '../config/db.js';
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

      let merchant = null;
      let availableProducts = [];

      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [merchant_id]);
          if (mRes?.rows?.length > 0) merchant = mRes.rows[0];

          const pRes = await query('SELECT * FROM products WHERE merchant_id = $1', [merchant_id]);
          if (pRes?.rows?.length > 0) availableProducts = pRes.rows;
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!merchant) {
        merchant = memoryStore.merchants.find(m => m.id === merchant_id);
      }
      if (!merchant) {
        return res.status(404).json({ success: false, error: 'Commerçant introuvable.' });
      }

      if (availableProducts.length === 0) {
        availableProducts = memoryStore.products.filter(p => p.merchant_id === merchant_id);
      }

      // Calcul total et validation des produits
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const product = availableProducts.find(p => p.id === item.product_id);
        if (!product) {
          return res.status(400).json({ success: false, error: `Produit ID ${item.product_id} non trouvé chez ce marchand.` });
        }

        const quantity = parseInt(item.quantity, 10) || 1;
        const lineTotal = parseFloat(product.price) * quantity;
        totalAmount += lineTotal;

        orderItems.push({
          id: uuidv4(),
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit_price: parseFloat(product.price),
          total_price: lineTotal
        });
      }

      const orderId = uuidv4();
      const orderNumber = `ML-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowIso = new Date().toISOString();

      let createdOrder = {
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
        created_at: nowIso,
        updated_at: nowIso
      };

      if (pool) {
        try {
          await withTransaction(async (client) => {
            if (client) {
              const orderSql = `
                INSERT INTO orders (
                  id, order_number, buyer_id, merchant_id, total_amount, escrow_amount,
                  service_fee, status, delivery_address, delivery_phone, delivery_notes,
                  created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, 0.00, 0.00, 'PENDING_PAYMENT', $6, $7, $8, NOW(), NOW())
                RETURNING *;
              `;
              const ordRes = await client.query(orderSql, [
                orderId,
                orderNumber,
                buyerId,
                merchant_id,
                totalAmount,
                delivery_address || 'Dakar',
                delivery_phone || req.user.phone,
                delivery_notes || ''
              ]);
              if (ordRes.rows.length > 0) {
                createdOrder = { ...ordRes.rows[0], items: orderItems };
              }

              for (const itm of orderItems) {
                await client.query(`
                  INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price)
                  VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [itm.id, orderId, itm.product_id, itm.product_name, itm.quantity, itm.unit_price, itm.total_price]);
              }
            }
          });
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // Miroir memoryStore
      if (!memoryStore.orders.some(o => o.id === createdOrder.id)) {
        memoryStore.orders.push(createdOrder);
      }

      return res.status(201).json({
        success: true,
        message: 'Commande initiée. Prête pour le règlement sécurisé.',
        data: createdOrder
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

      if (pool) {
        try {
          let sql = '';
          let params = [];

          if (userRole === 'MERCHANT') {
            sql = `
              SELECT o.*, m.business_name AS merchant_name, (u.first_name || ' ' || u.last_name) AS buyer_name
              FROM orders o
              JOIN merchants m ON o.merchant_id = m.id
              JOIN users u ON o.buyer_id = u.id
              WHERE m.user_id = $1
              ORDER BY o.created_at DESC;
            `;
            params = [userId];
          } else {
            sql = `
              SELECT o.*, m.business_name AS merchant_name, (u.first_name || ' ' || u.last_name) AS buyer_name
              FROM orders o
              JOIN merchants m ON o.merchant_id = m.id
              JOIN users u ON o.buyer_id = u.id
              WHERE o.buyer_id = $1
              ORDER BY o.created_at DESC;
            `;
            params = [userId];
          }

          const resDb = await query(sql, params);
          if (resDb?.rows) {
            orders = resDb.rows;
            // Récupération des items pour chaque commande
            for (const ord of orders) {
              const itemsRes = await query('SELECT * FROM order_items WHERE order_id = $1', [ord.id]);
              ord.items = itemsRes?.rows || [];
            }
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // Fallback memoryStore si non trouvé en base
      if (orders.length === 0) {
        let memOrders = [];
        if (userRole === 'MERCHANT') {
          const merchant = memoryStore.merchants.find(m => m.user_id === userId);
          if (merchant) {
            memOrders = memoryStore.orders.filter(o => o.merchant_id === merchant.id);
          }
        } else {
          memOrders = memoryStore.orders.filter(o => o.buyer_id === userId);
        }

        orders = memOrders.map(order => {
          const merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);
          const buyer = memoryStore.users.find(u => u.id === order.buyer_id);
          return {
            ...order,
            merchant_name: merchant?.business_name || 'Commerçant',
            buyer_name: buyer ? `${buyer.first_name} ${buyer.last_name}` : 'Client'
          };
        });
      }

      return res.status(200).json({
        success: true,
        data: orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
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
      let order = null;

      if (pool) {
        try {
          const ordRes = await query(`
            SELECT o.*,
                   m.business_name AS merchant_name, m.city AS merchant_city, m.phone AS merchant_phone, m.logo_url AS merchant_logo,
                   u.id AS buyer_user_id, u.first_name AS buyer_first_name, u.last_name AS buyer_last_name, u.phone AS buyer_phone
            FROM orders o
            JOIN merchants m ON o.merchant_id = m.id
            JOIN users u ON o.buyer_id = u.id
            WHERE o.id = $1 OR o.order_number = $1
            LIMIT 1;
          `, [id]);

          if (ordRes?.rows?.length > 0) {
            const raw = ordRes.rows[0];
            const itemsRes = await query('SELECT * FROM order_items WHERE order_id = $1', [raw.id]);
            const disputeRes = await query('SELECT * FROM disputes WHERE order_id = $1 LIMIT 1', [raw.id]);

            order = {
              ...raw,
              items: itemsRes?.rows || [],
              merchant: {
                id: raw.merchant_id,
                business_name: raw.merchant_name,
                city: raw.merchant_city,
                phone: raw.merchant_phone,
                logo_url: raw.merchant_logo
              },
              buyer: {
                id: raw.buyer_user_id,
                first_name: raw.buyer_first_name,
                last_name: raw.buyer_last_name,
                phone: raw.buyer_phone
              },
              dispute: disputeRes?.rows?.[0] || null
            };
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!order) {
        const memOrder = memoryStore.orders.find(o => o.id === id || o.order_number === id);
        if (!memOrder) {
          return res.status(404).json({ success: false, error: 'Commande introuvable.' });
        }

        const merchant = memoryStore.merchants.find(m => m.id === memOrder.merchant_id);
        const buyer = memoryStore.users.find(u => u.id === memOrder.buyer_id);
        const dispute = memoryStore.disputes.find(d => d.order_id === memOrder.id);

        order = {
          ...memOrder,
          merchant,
          buyer: {
            id: buyer?.id,
            first_name: buyer?.first_name,
            last_name: buyer?.last_name,
            phone: buyer?.phone
          },
          dispute
        };
      }

      // Contrôle d'accès : Seuls l'acheteur, le vendeur concerné ou un administrateur peuvent consulter la commande
      if (req.user.role !== 'ADMIN' && order.buyer_id !== req.user.id) {
        let isMerchantOwner = false;
        if (pool) {
          try {
            const mCheck = await query('SELECT 1 FROM merchants WHERE id = $1 AND user_id = $2 LIMIT 1', [order.merchant_id, req.user.id]);
            isMerchantOwner = mCheck?.rows?.length > 0;
          } catch {
            // fallback
          }
        }
        if (!isMerchantOwner) {
          isMerchantOwner = memoryStore.merchants.some(m => m.id === order.merchant_id && m.user_id === req.user.id);
        }
        if (!isMerchantOwner) {
          return res.status(403).json({ success: false, error: 'Accès non autorisé à cette commande.' });
        }
      }

      return res.status(200).json({
        success: true,
        data: order
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
      let existingOrder = null;

      if (pool) {
        try {
          const ordRes = await query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [id]);
          if (ordRes?.rows?.length > 0) existingOrder = ordRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!existingOrder) existingOrder = memoryStore.orders.find(o => o.id === id);
      if (!existingOrder) return res.status(404).json({ success: false, error: 'Commande introuvable.' });

      // Contrôle d'accès : Seul le marchand, l'acheteur ou un administrateur peuvent modifier le statut
      if (req.user.role !== 'ADMIN' && existingOrder.buyer_id !== req.user.id) {
        let isMerchantOwner = false;
        if (pool) {
          try {
            const mCheck = await query('SELECT 1 FROM merchants WHERE id = $1 AND user_id = $2 LIMIT 1', [existingOrder.merchant_id, req.user.id]);
            isMerchantOwner = mCheck?.rows?.length > 0;
          } catch {
            // fallback
          }
        }
        if (!isMerchantOwner) {
          isMerchantOwner = memoryStore.merchants.some(m => m.id === existingOrder.merchant_id && m.user_id === req.user.id);
        }
        if (!isMerchantOwner) {
          return res.status(403).json({ success: false, error: 'Accès non autorisé pour modifier cette commande.' });
        }
      }

      let order = null;
      if (pool) {
        try {
          const updRes = await query(`
            UPDATE orders
            SET status = 'SHIPPED',
                shipped_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *;
          `, [id]);
          if (updRes?.rows?.length > 0) order = updRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const memOrder = memoryStore.orders.find(o => o.id === id);
      if (memOrder) {
        memOrder.status = 'SHIPPED';
        memOrder.shipped_at = new Date().toISOString();
        if (!order) order = memOrder;
      }

      if (!order) return res.status(404).json({ success: false, error: 'Commande introuvable.' });

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

      let targetOrder = null;
      if (pool) {
        try {
          const ordRes = await query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [id]);
          if (ordRes?.rows?.length > 0) targetOrder = ordRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }
      if (!targetOrder) targetOrder = memoryStore.orders.find(o => o.id === id);
      if (!targetOrder) return res.status(404).json({ success: false, error: 'Commande introuvable.' });

      // Contrôle d'accès : Seul le marchand, l'acheteur ou un administrateur peuvent valider le code
      if (req.user.role !== 'ADMIN' && targetOrder.buyer_id !== req.user.id) {
        let isMerchantOwner = false;
        if (pool) {
          try {
            const mCheck = await query('SELECT 1 FROM merchants WHERE id = $1 AND user_id = $2 LIMIT 1', [targetOrder.merchant_id, req.user.id]);
            isMerchantOwner = mCheck?.rows?.length > 0;
          } catch {
            // fallback
          }
        }
        if (!isMerchantOwner) {
          isMerchantOwner = memoryStore.merchants.some(m => m.id === targetOrder.merchant_id && m.user_id === req.user.id);
        }
        if (!isMerchantOwner) {
          return res.status(403).json({ success: false, error: 'Accès non autorisé pour valider cette commande.' });
        }
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

      let order = null;
      if (pool) {
        try {
          const ordRes = await query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [id]);
          if (ordRes?.rows?.length > 0) order = ordRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!order) order = memoryStore.orders.find(o => o.id === id);
      if (!order) return res.status(404).json({ success: false, error: 'Commande introuvable.' });

      if (order.buyer_id !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Seul l’acheteur peut ouvrir un litige sur cette commande.' });
      }

      const disputeId = uuidv4();
      const nowIso = new Date().toISOString();
      let createdDispute = null;

      if (pool) {
        try {
          await withTransaction(async (client) => {
            if (client) {
              await client.query(`
                UPDATE orders
                SET status = 'DISPUTED',
                    updated_at = NOW()
                WHERE id = $1;
              `, [id]);

              const dRes = await client.query(`
                INSERT INTO disputes (
                  id, order_id, opened_by, reason, description, evidence_urls, status, resolution_notes, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, 'OPENED', '', NOW(), NOW())
                RETURNING *;
              `, [
                disputeId,
                order.id,
                req.user.id,
                reason || 'DAMAGED',
                description || 'Problème lors de la réception',
                JSON.stringify(evidence_urls || [])
              ]);
              createdDispute = dRes.rows[0];
            }
          });
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // Miroir memoryStore
      const memOrder = memoryStore.orders.find(o => o.id === id);
      if (memOrder) memOrder.status = 'DISPUTED';

      if (!createdDispute) {
        createdDispute = {
          id: disputeId,
          order_id: order.id,
          opened_by: req.user.id,
          reason: reason || 'DAMAGED',
          description: description || 'Problème lors de la réception',
          evidence_urls: evidence_urls || [],
          status: 'OPENED',
          resolution_notes: '',
          created_at: nowIso
        };
        memoryStore.disputes.push(createdDispute);
      }

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
        data: createdDispute
      });
    } catch (err) {
      next(err);
    }
  }
}

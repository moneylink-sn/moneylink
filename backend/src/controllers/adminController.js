/**
 * MoneyLink — AdminController (Espace Administrateur, KPIs & Arbitrage Litiges)
 * Prise en charge PostgreSQL avec fallback mémoire
 */

import { memoryStore, query, pool, ensureCatalogCleanAndDeduplicated } from '../config/db.js';
import { EscrowService } from '../services/escrowService.js';

export class AdminController {
  /**
   * Vue d'ensemble & KPIs de la plateforme
   */
  static async getDashboardStats(req, res, next) {
    try {
      let stats = null;

      if (pool) {
        try {
          const [
            uRes, mRes, oRes, dRes, sRes,
            volRes, escRes, savRes,
            recOrdRes, recTxnRes, pendDispRes
          ] = await Promise.all([
            query('SELECT COUNT(*) as total FROM users'),
            query('SELECT COUNT(*) as total FROM merchants'),
            query('SELECT COUNT(*) as total FROM orders'),
            query('SELECT COUNT(*) as total FROM disputes'),
            query('SELECT COUNT(*) as total FROM savings_goals'),
            query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'SUCCESS' AND type IN ('ESCROW_LOCK', 'DEPOSIT')"),
            query("SELECT COALESCE(SUM(escrow_amount), 0) as total FROM orders WHERE status IN ('PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'DISPUTED')"),
            query('SELECT COALESCE(SUM(current_amount), 0) as total FROM savings_goals'),
            query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5'),
            query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5'),
            query("SELECT * FROM disputes WHERE status IN ('OPENED', 'IN_INVESTIGATION') ORDER BY created_at DESC")
          ]);

          stats = {
            metrics: {
              usersCount: parseInt(uRes.rows[0]?.total || '0', 10),
              merchantsCount: parseInt(mRes.rows[0]?.total || '0', 10),
              ordersCount: parseInt(oRes.rows[0]?.total || '0', 10),
              disputesCount: parseInt(dRes.rows[0]?.total || '0', 10),
              savingsGoalsCount: parseInt(sRes.rows[0]?.total || '0', 10),
              totalTransactionVolumeFCFA: parseFloat(volRes.rows[0]?.total || 0),
              totalEscrowLockedFCFA: parseFloat(escRes.rows[0]?.total || 0),
              totalSavingsCollectedFCFA: parseFloat(savRes.rows[0]?.total || 0)
            },
            recentOrders: recOrdRes.rows || [],
            recentTransactions: recTxnRes.rows || [],
            pendingDisputes: pendDispRes.rows || []
          };
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!stats) {
        const usersCount = memoryStore.users.length;
        const merchantsCount = memoryStore.merchants.length;
        const ordersCount = memoryStore.orders.length;
        const disputesCount = memoryStore.disputes.length;
        const savingsGoalsCount = memoryStore.savings_goals.length;

        const totalTransactionVolume = memoryStore.transactions
          .filter(t => t.status === 'SUCCESS' && (t.type === 'ESCROW_LOCK' || t.type === 'DEPOSIT'))
          .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const totalEscrowLocked = memoryStore.orders
          .filter(o => o.status === 'PAYMENT_CONFIRMED' || o.status === 'PROCESSING' || o.status === 'SHIPPED' || o.status === 'DELIVERED' || o.status === 'DISPUTED')
          .reduce((sum, o) => sum + (parseFloat(o.escrow_amount) || 0), 0);

        const totalSavingsCollected = memoryStore.savings_goals
          .reduce((sum, s) => sum + (parseFloat(s.current_amount) || 0), 0);

        stats = {
          metrics: {
            usersCount,
            merchantsCount,
            ordersCount,
            disputesCount,
            savingsGoalsCount,
            totalTransactionVolumeFCFA: totalTransactionVolume,
            totalEscrowLockedFCFA: totalEscrowLocked,
            totalSavingsCollectedFCFA: totalSavingsCollected
          },
          recentOrders: memoryStore.orders.slice(-5).reverse(),
          recentTransactions: memoryStore.transactions.slice(-5).reverse(),
          pendingDisputes: memoryStore.disputes.filter(d => d.status === 'OPENED' || d.status === 'IN_INVESTIGATION')
        };
      }

      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Liste de tous les utilisateurs
   */
  static async listUsers(req, res, next) {
    try {
      if (pool) {
        try {
          const uRes = await query(`
            SELECT
              u.id, u.first_name, u.last_name, u.phone, u.email, u.role, u.status, u.avatar_url,
              u.subscription_status, u.created_at,
              COALESCE(w.available_balance, 0) AS available_balance,
              COALESCE(w.locked_balance, 0) AS locked_balance,
              m.business_name AS merchant_name
            FROM users u
            LEFT JOIN wallets w ON u.id = w.user_id
            LEFT JOIN merchants m ON u.id = m.user_id
            ORDER BY u.created_at DESC;
          `);
          if (uRes?.rows) {
            return res.status(200).json({ success: true, data: uRes.rows });
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const users = memoryStore.users.map(u => {
        const wallet = memoryStore.wallets.find(w => w.user_id === u.id);
        const merchant = memoryStore.merchants.find(m => m.user_id === u.id);
        return {
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          phone: u.phone,
          email: u.email,
          role: u.role,
          status: u.status,
          avatar_url: u.avatar_url,
          available_balance: wallet?.available_balance || 0,
          locked_balance: wallet?.locked_balance || 0,
          merchant_name: merchant?.business_name,
          created_at: u.created_at
        };
      });

      return res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mise à jour du statut d'un utilisateur (ex: SUSPENDED, ACTIVE)
   */
  static async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      let updatedUser = null;

      if (pool) {
        try {
          const uRes = await query(`
            UPDATE users
            SET status = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING id, phone, email, first_name, last_name, role, status, avatar_url,
                      subscription_status, subscription_start_date, subscription_end_date,
                      subscription_price, is_trial, created_at, updated_at;
          `, [status, id]);
          if (uRes?.rows?.length > 0) updatedUser = uRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const memUser = memoryStore.users.find(u => u.id === id);
      if (memUser) {
        memUser.status = status;
        if (!updatedUser) {
          const { password_hash, ...safeMemUser } = memUser;
          updatedUser = safeMemUser;
        }
      }

      if (!updatedUser) {
        return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
      }

      return res.status(200).json({ success: true, message: 'Statut utilisateur mis à jour.', data: updatedUser });
    } catch (err) {
      next(err);
    }
  }


  /**
   * Liste des litiges
   */
  static async listDisputes(req, res, next) {
    try {
      if (pool) {
        try {
          const dRes = await query(`
            SELECT
              d.*,
              o.order_number, o.total_amount, o.status AS order_status, o.merchant_id,
              (u.first_name || ' ' || u.last_name) AS buyer_name,
              COALESCE(m.business_name, 'Commerçant') AS merchant_name
            FROM disputes d
            JOIN orders o ON d.order_id = o.id
            JOIN users u ON d.opened_by = u.id
            LEFT JOIN merchants m ON o.merchant_id = m.id
            ORDER BY d.created_at DESC;
          `);
          if (dRes?.rows) {
            return res.status(200).json({ success: true, data: dRes.rows });
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const disputes = memoryStore.disputes.map(d => {
        const order = memoryStore.orders.find(o => o.id === d.order_id);
        const buyer = memoryStore.users.find(u => u.id === d.opened_by);
        const merchant = order ? memoryStore.merchants.find(m => m.id === order.merchant_id) : null;
        return {
          ...d,
          order,
          buyer_name: buyer ? `${buyer.first_name} ${buyer.last_name}` : 'Client',
          merchant_name: merchant?.business_name || 'Commerçant'
        };
      });

      return res.status(200).json({ success: true, data: disputes });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Résolution d'un litige par l'administrateur
   */
  static async resolveDispute(req, res, next) {
    try {
      const { id } = req.params;
      const { resolution, notes } = req.body; // resolution = 'REFUND_BUYER' | 'RELEASE_MERCHANT'

      if (!['REFUND_BUYER', 'RELEASE_MERCHANT'].includes(resolution)) {
        return res.status(400).json({ success: false, error: 'Type de résolution invalide (REFUND_BUYER ou RELEASE_MERCHANT attendu).' });
      }

      let dispute = null;
      let order = null;

      if (pool) {
        try {
          const dRes = await query('SELECT * FROM disputes WHERE id = $1 LIMIT 1', [id]);
          if (dRes?.rows?.length > 0) dispute = dRes.rows[0];
          if (dispute) {
            const oRes = await query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [dispute.order_id]);
            if (oRes?.rows?.length > 0) order = oRes.rows[0];
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!dispute) dispute = memoryStore.disputes.find(d => d.id === id);
      if (!dispute) return res.status(404).json({ success: false, error: 'Litige introuvable.' });

      if (!order) order = memoryStore.orders.find(o => o.id === dispute.order_id);
      if (!order) return res.status(404).json({ success: false, error: 'Commande liée introuvable.' });

      const newStatus = resolution === 'REFUND_BUYER' ? 'REFUNDED_BUYER' : 'RELEASED_MERCHANT';

      if (pool) {
        try {
          const updD = await query(`
            UPDATE disputes
            SET status = $1,
                resolution_notes = $2,
                resolved_by = $3,
                resolved_at = NOW(),
                updated_at = NOW()
            WHERE id = $4
            RETURNING *;
          `, [newStatus, notes || '', req.user.id, id]);
          if (updD?.rows?.length > 0) dispute = updD.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // Miroir memoryStore
      const memDispute = memoryStore.disputes.find(d => d.id === id);
      if (memDispute) {
        memDispute.resolution_notes = notes || '';
        memDispute.resolved_by = req.user.id;
        memDispute.resolved_at = new Date().toISOString();
        memDispute.status = newStatus;
        if (!dispute) dispute = memDispute;
      }

      if (resolution === 'REFUND_BUYER') {
        await EscrowService.refundOrderToBuyer({
          orderId: order.id,
          adminNotes: notes,
          resolvedByUserId: req.user.id
        });
      } else if (resolution === 'RELEASE_MERCHANT') {
        await EscrowService._executeEscrowRelease(order, 'ADMIN_DISPUTE_RESOLUTION');
      }

      return res.status(200).json({
        success: true,
        message: 'Litige résolu avec succès.',
        data: dispute
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Liste des livreurs enregistrés
   */
  static async listDeliveryPersons(req, res, next) {
    try {
      if (pool) {
        try {
          const dpRes = await query('SELECT * FROM delivery_persons ORDER BY created_at DESC');
          if (dpRes?.rows) {
            return res.status(200).json({
              success: true,
              data: dpRes.rows
            });
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const deliveryPersons = memoryStore.delivery_persons || [];
      return res.status(200).json({
        success: true,
        data: deliveryPersons
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Liste complète de tous les produits (avec filtrage par statut de modération)
   */
  static async listProducts(req, res, next) {
    try {
      const { status, search } = req.query;

      if (pool) {
        try {
          let sql = `
            SELECT p.*,
                   m.business_name AS merchant_name,
                   m.city AS merchant_city,
                   m.phone AS merchant_phone
            FROM products p
            JOIN merchants m ON p.merchant_id = m.id
            WHERE 1=1
          `;
          const params = [];
          let pIdx = 1;

          if (status && status !== 'all') {
            sql += ` AND p.status = $${pIdx++}`;
            params.push(status);
          }
          if (search) {
            sql += ` AND (LOWER(p.name) LIKE LOWER($${pIdx}) OR LOWER(COALESCE(p.description, '')) LIKE LOWER($${pIdx}) OR LOWER(m.business_name) LIKE LOWER($${pIdx}))`;
            params.push(`%${search.trim()}%`);
            pIdx++;
          }

          sql += ' ORDER BY p.created_at DESC';

          const pRes = await query(sql, params);
          if (pRes?.rows) {
            return res.status(200).json({
              success: true,
              count: pRes.rows.length,
              data: pRes.rows
            });
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      let products = (memoryStore.products || []).map(p => {
        const m = (memoryStore.merchants || []).find(merchant => merchant.id === p.merchant_id);
        return {
          ...p,
          merchant_name: m?.business_name || 'Commerçant',
          merchant_city: m?.city || 'Dakar',
          merchant_phone: m?.phone || ''
        };
      });

      if (status && status !== 'all') {
        products = products.filter(p => p.status === status);
      }
      if (search) {
        const q = search.toLowerCase();
        products = products.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)) || p.merchant_name.toLowerCase().includes(q));
      }

      return res.status(200).json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Modération du statut d'un produit par l'administrateur (APPROVED, REJECTED, PENDING, INACTIVE)
   */
  static async updateProductStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, is_active } = req.body;

      if (!status && is_active === undefined) {
        return res.status(400).json({ success: false, error: 'Statut ou état is_active requis.' });
      }

      let updatedProduct = null;

      if (pool) {
        try {
          const current = await query('SELECT * FROM products WHERE id = $1 LIMIT 1', [id]);
          if (current?.rows?.length > 0) {
            const newStatus = status || current.rows[0].status || 'APPROVED';
            const newActive = is_active !== undefined ? Boolean(is_active) : (newStatus === 'APPROVED');

            const updRes = await query(`
              UPDATE products
              SET status = $1,
                  is_active = $2,
                  updated_at = NOW()
              WHERE id = $3
              RETURNING *;
            `, [newStatus, newActive, id]);
            if (updRes?.rows?.length > 0) updatedProduct = updRes.rows[0];
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const memProduct = (memoryStore.products || []).find(p => p.id === id);
      if (memProduct) {
        if (status) memProduct.status = status;
        if (is_active !== undefined) memProduct.is_active = Boolean(is_active);
        memProduct.updated_at = new Date().toISOString();
        if (!updatedProduct) updatedProduct = memProduct;
      }

      if (!updatedProduct) {
        return res.status(404).json({ success: false, error: 'Produit introuvable.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Statut du produit mis à jour par l’administrateur.',
        data: updatedProduct
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Suppression / Désactivation d'un produit par l'administrateur
   */
  static async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;

      if (pool) {
        try {
          await query(`
            UPDATE products
            SET is_active = false,
                status = 'INACTIVE',
                updated_at = NOW()
            WHERE id = $1;
          `, [id]);
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const memIdx = (memoryStore.products || []).findIndex(p => p.id === id);
      if (memIdx !== -1) {
        memoryStore.products[memIdx].is_active = false;
        memoryStore.products[memIdx].status = 'INACTIVE';
        memoryStore.products[memIdx].updated_at = new Date().toISOString();
      }

      return res.status(200).json({
        success: true,
        message: 'Produit désactivé par l’administrateur.'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Assainissement & Déduplication du catalogue de produits (Super Admin)
   */
  static async cleanCatalogDuplicates(req, res, next) {
    try {
      let stats = null;
      if (pool) {
        try {
          const client = await pool.connect();
          try {
            stats = await ensureCatalogCleanAndDeduplicated(client);
          } finally {
            client.release();
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!stats) {
        stats = await ensureCatalogCleanAndDeduplicated(null);
      }

      return res.status(200).json({
        success: true,
        message: 'Assainissement et déduplication du catalogue exécutés avec succès.',
        data: stats
      });
    } catch (err) {
      next(err);
    }
  }
}

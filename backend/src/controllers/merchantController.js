/**
 * MoneyLink — MerchantController (Espace & Catalogue Commerçant)
 * Prise en charge PostgreSQL avec fallback mémoire
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, pool } from '../config/db.js';

export class MerchantController {
  /**
   * Liste des commerçants actifs
   */
  static async listMerchants(req, res, next) {
    try {
      let merchants = [];

      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE status = \'ACTIVE\' ORDER BY created_at DESC');
          if (mRes?.rows) merchants = mRes.rows;
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (merchants.length === 0) {
        merchants = memoryStore.merchants.filter(m => m.status === 'ACTIVE');
      }

      return res.status(200).json({
        success: true,
        data: merchants
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Détail d'un commerçant avec son catalogue de produits
   */
  static async getMerchantDetails(req, res, next) {
    try {
      const { id } = req.params;
      let merchant = null;
      let products = [];

      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE id = $1 OR user_id = $1 LIMIT 1', [id]);
          if (mRes?.rows?.length > 0) {
            merchant = mRes.rows[0];
            const pRes = await query('SELECT * FROM products WHERE merchant_id = $1 AND is_active = true ORDER BY created_at DESC', [merchant.id]);
            products = pRes?.rows || [];
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!merchant) {
        merchant = memoryStore.merchants.find(m => m.id === id || m.user_id === id);
        if (merchant) {
          products = memoryStore.products.filter(p => p.merchant_id === merchant.id && p.is_active);
        }
      }

      if (!merchant) {
        return res.status(404).json({
          success: false,
          error: 'Commerçant introuvable.'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          merchant,
          products
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Ajout d'un nouveau produit par le commerçant
   */
  static async createProduct(req, res, next) {
    try {
      let merchant = null;
      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [req.user.id]);
          if (mRes?.rows?.length > 0) merchant = mRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!merchant) {
        merchant = memoryStore.merchants.find(m => m.user_id === req.user.id);
      }

      if (!merchant) {
        return res.status(403).json({
          success: false,
          error: 'Vous devez posséder un profil commerçant actif pour ajouter des produits.'
        });
      }

      const { name, description, price, stock, image_url, category } = req.body;
      const productId = uuidv4();
      const productPrice = parseFloat(price);
      const productStock = parseInt(stock, 10) || 0;
      const nowIso = new Date().toISOString();

      let createdProduct = {
        id: productId,
        merchant_id: merchant.id,
        name: name.trim(),
        description: description || '',
        price: productPrice,
        stock: productStock,
        image_url: image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        category: category || 'Général',
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso
      };

      if (pool) {
        try {
          const pRes = await query(`
            INSERT INTO products (
              id, merchant_id, name, description, price, stock, image_url, category, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
            RETURNING *;
          `, [
            productId,
            merchant.id,
            name.trim(),
            description || '',
            productPrice,
            productStock,
            image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
            category || 'Général'
          ]);
          if (pRes?.rows?.length > 0) createdProduct = pRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // Miroir memoryStore
      if (!memoryStore.products.some(p => p.id === createdProduct.id)) {
        memoryStore.products.push(createdProduct);
      }

      return res.status(201).json({
        success: true,
        message: 'Produit ajouté avec succès au catalogue.',
        data: createdProduct
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Statistiques des ventes du commerçant
   */
  static async getMerchantStats(req, res, next) {
    try {
      let merchant = null;
      let wallet = null;
      let metrics = null;

      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [req.user.id]);
          if (mRes?.rows?.length > 0) {
            merchant = mRes.rows[0];
            const wRes = await query('SELECT * FROM wallets WHERE user_id = $1 LIMIT 1', [req.user.id]);
            wallet = wRes?.rows?.[0] || null;

            const statsRes = await query(`
              SELECT
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_orders,
                COUNT(CASE WHEN status IN ('PAYMENT_CONFIRMED', 'PROCESSING') THEN 1 END) as pending_shipment,
                COUNT(CASE WHEN status = 'DISPUTED' THEN 1 END) as in_dispute,
                COALESCE(SUM(CASE WHEN status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED') THEN total_amount ELSE 0 END), 0) as total_sales_volume
              FROM orders
              WHERE merchant_id = $1;
            `, [merchant.id]);

            const row = statsRes?.rows?.[0] || {};
            metrics = {
              totalOrders: parseInt(row.total_orders || '0', 10),
              confirmedOrders: parseInt(row.confirmed_orders || '0', 10),
              pendingShipment: parseInt(row.pending_shipment || '0', 10),
              inDispute: parseInt(row.in_dispute || '0', 10),
              totalSalesVolumeFCFA: parseFloat(row.total_sales_volume || 0)
            };
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!merchant) {
        merchant = memoryStore.merchants.find(m => m.user_id === req.user.id);
        if (merchant) {
          wallet = memoryStore.wallets.find(w => w.user_id === req.user.id);
          const orders = memoryStore.orders.filter(o => o.merchant_id === merchant.id);
          const totalSalesVolume = orders
            .filter(o => o.status === 'CONFIRMED' || o.status === 'SHIPPED' || o.status === 'DELIVERED')
            .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

          metrics = {
            totalOrders: orders.length,
            confirmedOrders: orders.filter(o => o.status === 'CONFIRMED').length,
            pendingShipment: orders.filter(o => o.status === 'PAYMENT_CONFIRMED' || o.status === 'PROCESSING').length,
            inDispute: orders.filter(o => o.status === 'DISPUTED').length,
            totalSalesVolumeFCFA: totalSalesVolume
          };
        }
      }

      if (!merchant) {
        return res.status(403).json({ success: false, error: 'Profil commerçant introuvable.' });
      }

      return res.status(200).json({
        success: true,
        data: {
          merchant,
          wallet,
          metrics
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

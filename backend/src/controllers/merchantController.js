/**
 * MoneyLink — MerchantController (Espace & Catalogue Commerçant)
 * Prise en charge PostgreSQL avec fallback mémoire & protections IDOR
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, pool } from '../config/db.js';

export class MerchantController {
  /**
   * Liste des commerçants actifs
   */
  static async listMerchants(req, res, next) {
    try {
      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE status = \'ACTIVE\' ORDER BY created_at DESC');
          if (mRes?.rows) {
            return res.status(200).json({
              success: true,
              data: mRes.rows
            });
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const merchants = memoryStore.merchants.filter(m => m.status === 'ACTIVE');

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

      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE id = $1 OR user_id = $1 LIMIT 1', [id]);
          if (mRes?.rows?.length > 0) {
            const merchant = mRes.rows[0];
            const pRes = await query('SELECT * FROM products WHERE merchant_id = $1 AND is_active = true ORDER BY created_at DESC', [merchant.id]);
            return res.status(200).json({
              success: true,
              data: {
                merchant,
                products: pRes?.rows || []
              }
            });
          } else {
            return res.status(404).json({
              success: false,
              error: 'Commerçant introuvable.'
            });
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      let merchant = memoryStore.merchants.find(m => m.id === id || m.user_id === id);
      if (!merchant) {
        return res.status(404).json({
          success: false,
          error: 'Commerçant introuvable.'
        });
      }

      const products = memoryStore.products.filter(p => p.merchant_id === merchant.id && p.is_active);

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
   * Catalogue public : Liste tous les produits actifs de tous les commerçants
   * Supporte filtres : ?search=..., ?category=..., ?merchant_id=...
   */
  static async listAllProducts(req, res, next) {
    try {
      const { search, category, merchant_id } = req.query;

      if (pool) {
        try {
          let sql = `
            SELECT p.*,
                   m.business_name AS merchant_name,
                   m.city AS merchant_city,
                   m.phone AS merchant_phone,
                   m.logo_url AS merchant_logo,
                   m.is_verified AS merchant_is_verified
            FROM products p
            JOIN merchants m ON p.merchant_id = m.id
            WHERE p.is_active = true AND m.status = 'ACTIVE'
          `;
          const params = [];
          let paramIdx = 1;

          if (merchant_id) {
            sql += ` AND p.merchant_id = $${paramIdx++}`;
            params.push(merchant_id);
          }
          if (category && category !== 'all' && category !== 'Tous') {
            sql += ` AND LOWER(p.category) = LOWER($${paramIdx++})`;
            params.push(category);
          }
          if (search) {
            sql += ` AND (LOWER(p.name) LIKE LOWER($${paramIdx}) OR LOWER(p.description) LIKE LOWER($${paramIdx}) OR LOWER(m.business_name) LIKE LOWER($${paramIdx}))`;
            params.push(`%${search.trim()}%`);
            paramIdx++;
          }

          sql += ' ORDER BY p.created_at DESC';

          const resDb = await query(sql, params);
          if (resDb?.rows) {
            return res.status(200).json({
              success: true,
              count: resDb.rows.length,
              data: resDb.rows
            });
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const activeMerchants = memoryStore.merchants.filter(m => m.status === 'ACTIVE');
      const activeMerchantIds = new Set(activeMerchants.map(m => m.id));

      let memProds = memoryStore.products.filter(p => p.is_active && activeMerchantIds.has(p.merchant_id));

      if (merchant_id) {
        memProds = memProds.filter(p => p.merchant_id === merchant_id);
      }
      if (category && category !== 'all' && category !== 'Tous') {
        memProds = memProds.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
      }
      if (search) {
        const q = search.toLowerCase();
        memProds = memProds.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
      }

      const products = memProds.map(p => {
        const m = activeMerchants.find(merchant => merchant.id === p.merchant_id);
        return {
          ...p,
          merchant_name: m?.business_name || 'Commerçant MoneyLink',
          merchant_city: m?.city || 'Dakar',
          merchant_phone: m?.phone || '',
          merchant_logo: m?.logo_url || '',
          merchant_is_verified: m?.is_verified ?? false
        };
      });

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
   * Détail d'un produit public par ID
   */
  static async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      if (pool) {
        try {
          const sql = `
            SELECT p.*,
                   m.business_name AS merchant_name,
                   m.city AS merchant_city,
                   m.phone AS merchant_phone,
                   m.logo_url AS merchant_logo,
                   m.is_verified AS merchant_is_verified
            FROM products p
            JOIN merchants m ON p.merchant_id = m.id
            WHERE p.id = $1 AND p.is_active = true AND m.status = 'ACTIVE'
            LIMIT 1;
          `;
          const resDb = await query(sql, [id]);
          if (resDb?.rows?.length > 0) {
            return res.status(200).json({
              success: true,
              data: resDb.rows[0]
            });
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const p = memoryStore.products.find(item => item.id === id && item.is_active);
      if (!p) {
        return res.status(404).json({ success: false, error: 'Produit introuvable ou indisponible.' });
      }

      const m = memoryStore.merchants.find(merchant => merchant.id === p.merchant_id && merchant.status === 'ACTIVE');
      if (!m) {
        return res.status(404).json({ success: false, error: 'Boutique introuvable ou indisponible.' });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...p,
          merchant_name: m.business_name || 'Commerçant MoneyLink',
          merchant_city: m.city || 'Dakar',
          merchant_phone: m.phone || '',
          merchant_logo: m.logo_url || '',
          merchant_is_verified: m.is_verified ?? false
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Espace Marchand : Récupère tous les produits du commerçant connecté (actifs et inactifs)
   */
  static async getMerchantMyProducts(req, res, next) {
    try {
      let merchant = null;
      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [req.user.id]);
          if (mRes?.rows?.length > 0) {
            merchant = mRes.rows[0];
            const pRes = await query('SELECT * FROM products WHERE merchant_id = $1 ORDER BY created_at DESC', [merchant.id]);
            return res.status(200).json({
              success: true,
              merchant,
              data: pRes?.rows || []
            });
          } else {
            return res.status(403).json({
              success: false,
              error: 'Profil commerçant introuvable.'
            });
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      merchant = memoryStore.merchants.find(m => m.user_id === req.user.id);
      if (!merchant) {
        return res.status(403).json({
          success: false,
          error: 'Profil commerçant introuvable.'
        });
      }

      const products = memoryStore.products.filter(p => p.merchant_id === merchant.id);

      return res.status(200).json({
        success: true,
        merchant,
        data: products
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
   * Modification d'un produit existant (avec protection IDOR)
   */
  static async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, price, stock, image_url, category, is_active } = req.body;

      // 1. Récupération du profil commerçant de l'utilisateur connecté
      let merchant = null;
      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [req.user.id]);
          if (mRes?.rows?.length > 0) merchant = mRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }
      if (!merchant) merchant = memoryStore.merchants.find(m => m.user_id === req.user.id);
      if (!merchant) {
        return res.status(403).json({ success: false, error: 'Profil commerçant introuvable.' });
      }

      // 2. Vérification d'existence du produit et contrôle IDOR
      let existingProduct = null;
      if (pool) {
        try {
          const pCheck = await query('SELECT * FROM products WHERE id = $1 LIMIT 1', [id]);
          if (pCheck?.rows?.length > 0) existingProduct = pCheck.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }
      if (!existingProduct) existingProduct = memoryStore.products.find(p => p.id === id);

      if (!existingProduct) {
        return res.status(404).json({ success: false, error: 'Produit introuvable.' });
      }

      if (existingProduct.merchant_id !== merchant.id) {
        return res.status(403).json({
          success: false,
          error: 'Accès interdit. Vous ne pouvez modifier que vos propres produits.'
        });
      }

      // 3. Application des modifications
      const updatedName = name !== undefined ? name.trim() : existingProduct.name;
      const updatedDesc = description !== undefined ? description : existingProduct.description;
      const updatedPrice = price !== undefined ? parseFloat(price) : parseFloat(existingProduct.price);
      const updatedStock = stock !== undefined ? parseInt(stock, 10) : parseInt(existingProduct.stock, 10);
      const updatedImage = image_url !== undefined ? image_url : existingProduct.image_url;
      const updatedCat = category !== undefined ? category : existingProduct.category;
      const updatedActive = is_active !== undefined ? Boolean(is_active) : existingProduct.is_active;

      let updatedProduct = null;
      if (pool) {
        try {
          const updRes = await query(`
            UPDATE products
            SET name = $1,
                description = $2,
                price = $3,
                stock = $4,
                image_url = $5,
                category = $6,
                is_active = $7,
                updated_at = NOW()
            WHERE id = $8 AND merchant_id = $9
            RETURNING *;
          `, [
            updatedName,
            updatedDesc,
            updatedPrice,
            updatedStock,
            updatedImage,
            updatedCat,
            updatedActive,
            id,
            merchant.id
          ]);
          if (updRes?.rows?.length > 0) updatedProduct = updRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // Miroir memoryStore
      const memProduct = memoryStore.products.find(p => p.id === id);
      if (memProduct) {
        memProduct.name = updatedName;
        memProduct.description = updatedDesc;
        memProduct.price = updatedPrice;
        memProduct.stock = updatedStock;
        memProduct.image_url = updatedImage;
        memProduct.category = updatedCat;
        memProduct.is_active = updatedActive;
        memProduct.updated_at = new Date().toISOString();
        if (!updatedProduct) updatedProduct = memProduct;
      }

      return res.status(200).json({
        success: true,
        message: 'Produit mis à jour avec succès.',
        data: updatedProduct
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mise à jour rapide du stock disponible (avec protection IDOR)
   */
  static async updateProductStock(req, res, next) {
    try {
      const { id } = req.params;
      const { stock } = req.body;

      if (stock === undefined || isNaN(parseInt(stock, 10)) || parseInt(stock, 10) < 0) {
        return res.status(400).json({ success: false, error: 'Quantité de stock invalide (doit être >= 0).' });
      }

      const newStock = parseInt(stock, 10);

      // Profil commerçant
      let merchant = null;
      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [req.user.id]);
          if (mRes?.rows?.length > 0) merchant = mRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }
      if (!merchant) merchant = memoryStore.merchants.find(m => m.user_id === req.user.id);
      if (!merchant) return res.status(403).json({ success: false, error: 'Profil commerçant introuvable.' });

      // IDOR check
      let existingProduct = null;
      if (pool) {
        try {
          const pCheck = await query('SELECT * FROM products WHERE id = $1 LIMIT 1', [id]);
          if (pCheck?.rows?.length > 0) existingProduct = pCheck.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }
      if (!existingProduct) existingProduct = memoryStore.products.find(p => p.id === id);

      if (!existingProduct) return res.status(404).json({ success: false, error: 'Produit introuvable.' });

      if (existingProduct.merchant_id !== merchant.id) {
        return res.status(403).json({ success: false, error: 'Accès non autorisé pour modifier le stock de ce produit.' });
      }

      let updatedProduct = null;
      if (pool) {
        try {
          const updRes = await query(`
            UPDATE products
            SET stock = $1,
                updated_at = NOW()
            WHERE id = $2 AND merchant_id = $3
            RETURNING *;
          `, [newStock, id, merchant.id]);
          if (updRes?.rows?.length > 0) updatedProduct = updRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const memProduct = memoryStore.products.find(p => p.id === id);
      if (memProduct) {
        memProduct.stock = newStock;
        memProduct.updated_at = new Date().toISOString();
        if (!updatedProduct) updatedProduct = memProduct;
      }

      return res.status(200).json({
        success: true,
        message: 'Stock mis à jour avec succès.',
        data: updatedProduct
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Suppression / Désactivation d'un produit (avec protection IDOR)
   */
  static async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;

      // Profil commerçant
      let merchant = null;
      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [req.user.id]);
          if (mRes?.rows?.length > 0) merchant = mRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }
      if (!merchant) merchant = memoryStore.merchants.find(m => m.user_id === req.user.id);
      if (!merchant) return res.status(403).json({ success: false, error: 'Profil commerçant introuvable.' });

      // IDOR check
      let existingProduct = null;
      if (pool) {
        try {
          const pCheck = await query('SELECT * FROM products WHERE id = $1 LIMIT 1', [id]);
          if (pCheck?.rows?.length > 0) existingProduct = pCheck.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }
      if (!existingProduct) existingProduct = memoryStore.products.find(p => p.id === id);

      if (!existingProduct) return res.status(404).json({ success: false, error: 'Produit introuvable.' });

      if (existingProduct.merchant_id !== merchant.id) {
        return res.status(403).json({ success: false, error: 'Accès non autorisé pour supprimer ce produit.' });
      }

      // Désactivation logique du produit pour préserver l'historique des commandes
      if (pool) {
        try {
          await query(`
            UPDATE products
            SET is_active = false,
                updated_at = NOW()
            WHERE id = $1 AND merchant_id = $2;
          `, [id, merchant.id]);
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const memIndex = memoryStore.products.findIndex(p => p.id === id);
      if (memIndex !== -1) {
        memoryStore.products[memIndex].is_active = false;
        memoryStore.products[memIndex].updated_at = new Date().toISOString();
      }

      return res.status(200).json({
        success: true,
        message: 'Produit retiré du catalogue avec succès.'
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

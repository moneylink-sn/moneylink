/**
 * MoneyLink — MerchantController (Espace & Catalogue Commerçant)
 * Prise en charge PostgreSQL avec fallback mémoire & protections IDOR strictes
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
            const pRes = await query('SELECT * FROM products WHERE merchant_id = $1 AND is_active = true AND (status = \'APPROVED\' OR status IS NULL) ORDER BY created_at DESC', [merchant.id]);
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

      const products = memoryStore.products.filter(p => p.merchant_id === merchant.id && p.is_active && (p.status === 'APPROVED' || !p.status));

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
   * Catalogue public : Liste tous les produits actifs et approuvés de tous les commerçants actifs
   * Supporte filtres : ?search=..., ?category=..., ?merchant_id=..., ?city=...
   */
  static async listAllProducts(req, res, next) {
    try {
      const { search, category, merchant_id, city } = req.query;

      if (pool) {
        try {
          let sql = `
            SELECT p.*,
                   m.business_name AS merchant_name,
                   COALESCE(p.city, m.city, 'Dakar') AS merchant_city,
                   m.phone AS merchant_phone,
                   m.whatsapp_phone AS merchant_whatsapp,
                   m.logo_url AS merchant_logo,
                   m.is_verified AS merchant_is_verified
            FROM products p
            JOIN merchants m ON (p.merchant_id = m.id OR p.merchant_id = m.user_id)
            WHERE p.is_active = true 
              AND (p.status = 'APPROVED' OR p.status IS NULL OR p.status = '') 
              AND UPPER(m.status) = 'ACTIVE'
              AND (p.stock > 0 OR p.stock IS NULL)
          `;
          const params = [];
          let paramIdx = 1;

          if (merchant_id) {
            sql += ` AND (p.merchant_id = $${paramIdx} OR m.id = $${paramIdx} OR m.user_id = $${paramIdx})`;
            params.push(merchant_id);
            paramIdx++;
          }
          if (category && category !== 'all' && category !== 'Tous') {
            sql += ` AND LOWER(p.category) = LOWER($${paramIdx++})`;
            params.push(category.trim());
          }
          if (city && city !== 'all' && city !== 'Toutes') {
            sql += ` AND (LOWER(p.city) = LOWER($${paramIdx}) OR LOWER(m.city) = LOWER($${paramIdx}))`;
            params.push(city.trim());
            paramIdx++;
          }
          if (search) {
            sql += ` AND (LOWER(p.name) LIKE LOWER($${paramIdx}) OR LOWER(COALESCE(p.description, '')) LIKE LOWER($${paramIdx}) OR LOWER(m.business_name) LIKE LOWER($${paramIdx}))`;
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

      const activeMerchants = (memoryStore.merchants || []).filter(m => m.status === 'ACTIVE');
      const activeMerchantIds = new Set(activeMerchants.map(m => m.id));
      const activeMerchantUserIds = new Set(activeMerchants.map(m => m.user_id));

      let memProds = (memoryStore.products || []).filter(p => 
        p.is_active && 
        (p.status === 'APPROVED' || !p.status || p.status === '') && 
        (activeMerchantIds.has(p.merchant_id) || activeMerchantUserIds.has(p.merchant_id)) &&
        (p.stock === undefined || p.stock === null || p.stock > 0)
      );

      if (merchant_id) {
        memProds = memProds.filter(p => p.merchant_id === merchant_id);
      }
      if (category && category !== 'all' && category !== 'Tous') {
        memProds = memProds.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase().trim());
      }
      if (city && city !== 'all' && city !== 'Toutes') {
        memProds = memProds.filter(p => (p.city && p.city.toLowerCase() === city.toLowerCase().trim()));
      }
      if (search) {
        const q = search.toLowerCase().trim();
        memProds = memProds.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
      }

      const products = memProds.map(p => {
        const m = activeMerchants.find(merchant => merchant.id === p.merchant_id || merchant.user_id === p.merchant_id);
        return {
          ...p,
          merchant_name: m?.business_name || 'Commerçant MoneyLink',
          merchant_city: p.city || m?.city || 'Dakar',
          merchant_phone: m?.phone || '',
          merchant_whatsapp: m?.whatsapp_phone || m?.phone || '',
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
                   COALESCE(p.city, m.city, 'Dakar') AS merchant_city,
                   m.phone AS merchant_phone,
                   m.whatsapp_phone AS merchant_whatsapp,
                   m.logo_url AS merchant_logo,
                   m.is_verified AS merchant_is_verified
            FROM products p
            JOIN merchants m ON (p.merchant_id = m.id OR p.merchant_id = m.user_id)
            WHERE p.id = $1 
              AND p.is_active = true 
              AND (p.status = 'APPROVED' OR p.status IS NULL OR p.status = '') 
              AND UPPER(m.status) = 'ACTIVE'
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

      const p = (memoryStore.products || []).find(item => item.id === id && item.is_active && (item.status === 'APPROVED' || !item.status || item.status === ''));
      if (!p) {
        return res.status(404).json({ success: false, error: 'Produit introuvable ou indisponible.' });
      }

      const m = (memoryStore.merchants || []).find(merchant => (merchant.id === p.merchant_id || merchant.user_id === p.merchant_id) && merchant.status === 'ACTIVE');
      if (!m) {
        return res.status(404).json({ success: false, error: 'Boutique introuvable ou indisponible.' });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...p,
          merchant_name: m.business_name || 'Commerçant MoneyLink',
          merchant_city: p.city || m.city || 'Dakar',
          merchant_phone: m.phone || '',
          merchant_whatsapp: m.whatsapp_phone || m.phone || '',
          merchant_logo: m.logo_url || '',
          merchant_is_verified: m.is_verified ?? false
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Profil Marchand du compte connecté (GET /api/merchants/profile ou /me)
   */
  static async getMerchantProfile(req, res, next) {
    try {
      const userId = req.user.id;
      let merchant = null;
      let user = null;
      let wallet = null;

      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [userId]);
          if (mRes?.rows?.length > 0) merchant = mRes.rows[0];

          const uRes = await query('SELECT id, first_name, last_name, phone, email, avatar_url, role, status FROM users WHERE id = $1 LIMIT 1', [userId]);
          if (uRes?.rows?.length > 0) user = uRes.rows[0];

          const wRes = await query('SELECT available_balance, locked_balance, currency FROM wallets WHERE user_id = $1 LIMIT 1', [userId]);
          if (wRes?.rows?.length > 0) wallet = wRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!merchant) merchant = memoryStore.merchants.find(m => m.user_id === userId);
      if (!user) {
        const u = memoryStore.users.find(u => u.id === userId);
        if (u) {
          user = {
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            phone: u.phone,
            email: u.email,
            avatar_url: u.avatar_url,
            role: u.role,
            status: u.status
          };
        }
      }
      if (!wallet) {
        const w = memoryStore.wallets.find(w => w.user_id === userId);
        if (w) wallet = { available_balance: w.available_balance, locked_balance: w.locked_balance, currency: w.currency };
      }

      if (!merchant) {
        return res.status(404).json({
          success: false,
          error: 'Profil commerçant introuvable.'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user,
          merchant,
          wallet
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mise à jour du Profil Marchand (PUT /api/merchants/profile)
   */
  static async updateMerchantProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        first_name,
        last_name,
        phone,
        whatsapp_phone,
        business_name,
        business_type,
        description,
        address,
        quartier,
        city,
        country,
        logo_url
      } = req.body;

      // 1. Récupération préalable
      let merchant = null;
      let user = null;

      if (pool) {
        try {
          const mRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [userId]);
          if (mRes?.rows?.length > 0) merchant = mRes.rows[0];

          const uRes = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
          if (uRes?.rows?.length > 0) user = uRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!merchant) merchant = memoryStore.merchants.find(m => m.user_id === userId);
      if (!user) user = memoryStore.users.find(u => u.id === userId);

      if (!merchant || !user) {
        return res.status(404).json({
          success: false,
          error: 'Profil commerçant introuvable.'
        });
      }

      // 2. Préparation des champs mis à jour
      const updatedFirstName = first_name !== undefined ? first_name.trim() : user.first_name;
      const updatedLastName = last_name !== undefined ? last_name.trim() : user.last_name;
      const updatedPhone = phone !== undefined ? phone.trim() : user.phone;
      const updatedWhatsapp = whatsapp_phone !== undefined ? whatsapp_phone.trim() : (merchant.whatsapp_phone || updatedPhone);

      const updatedBusinessName = business_name !== undefined ? business_name.trim() : merchant.business_name;
      const updatedBusinessType = business_type !== undefined ? business_type.trim() : merchant.business_type;
      const updatedDescription = description !== undefined ? description : merchant.description;
      const updatedAddress = address !== undefined ? address : merchant.address;
      const updatedQuartier = quartier !== undefined ? quartier.trim() : (merchant.quartier || '');
      const updatedCity = city !== undefined ? city.trim() : (merchant.city || 'Dakar');
      const updatedCountry = country !== undefined ? country.trim() : (merchant.country || 'Sénégal');
      const updatedLogoUrl = logo_url !== undefined ? logo_url.trim() : merchant.logo_url;

      let updatedUser = null;
      let updatedMerchant = null;

      // 3. Mise à jour PostgreSQL
      if (pool) {
        try {
          const uUpd = await query(`
            UPDATE users
            SET first_name = $1,
                last_name = $2,
                phone = $3,
                updated_at = NOW()
            WHERE id = $4
            RETURNING id, first_name, last_name, phone, email, avatar_url, role, status;
          `, [updatedFirstName, updatedLastName, updatedPhone, userId]);
          if (uUpd?.rows?.length > 0) updatedUser = uUpd.rows[0];

          const mUpd = await query(`
            UPDATE merchants
            SET business_name = $1,
                business_type = $2,
                description = $3,
                address = $4,
                quartier = $5,
                city = $6,
                country = $7,
                phone = $8,
                whatsapp_phone = $9,
                logo_url = $10,
                updated_at = NOW()
            WHERE id = $11
            RETURNING *;
          `, [
            updatedBusinessName,
            updatedBusinessType,
            updatedDescription,
            updatedAddress,
            updatedQuartier,
            updatedCity,
            updatedCountry,
            updatedPhone,
            updatedWhatsapp,
            updatedLogoUrl,
            merchant.id
          ]);
          if (mUpd?.rows?.length > 0) updatedMerchant = mUpd.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // 4. Miroir memoryStore
      const memUser = memoryStore.users.find(u => u.id === userId);
      if (memUser) {
        memUser.first_name = updatedFirstName;
        memUser.last_name = updatedLastName;
        memUser.phone = updatedPhone;
        memUser.updated_at = new Date().toISOString();
        if (!updatedUser) {
          const { password_hash, ...safeU } = memUser;
          updatedUser = safeU;
        }
      }

      const memMerchant = memoryStore.merchants.find(m => m.id === merchant.id);
      if (memMerchant) {
        memMerchant.business_name = updatedBusinessName;
        memMerchant.business_type = updatedBusinessType;
        memMerchant.description = updatedDescription;
        memMerchant.address = updatedAddress;
        memMerchant.quartier = updatedQuartier;
        memMerchant.city = updatedCity;
        memMerchant.country = updatedCountry;
        memMerchant.phone = updatedPhone;
        memMerchant.whatsapp_phone = updatedWhatsapp;
        memMerchant.logo_url = updatedLogoUrl;
        memMerchant.updated_at = new Date().toISOString();
        if (!updatedMerchant) updatedMerchant = memMerchant;
      }

      return res.status(200).json({
        success: true,
        message: 'Profil marchand mis à jour avec succès.',
        data: {
          user: updatedUser,
          merchant: updatedMerchant
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Espace Marchand : Récupère tous les produits du commerçant connecté (actifs, inactifs, approuvés, en attente)
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
   * Espace Marchand : Récupère un produit spécifique du commerçant (avec vérification IDOR)
   */
  static async getMerchantProductById(req, res, next) {
    try {
      const { id } = req.params;

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

      let product = null;
      if (pool) {
        try {
          const pRes = await query('SELECT * FROM products WHERE id = $1 LIMIT 1', [id]);
          if (pRes?.rows?.length > 0) product = pRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }
      if (!product) product = memoryStore.products.find(p => p.id === id);

      if (!product) {
        return res.status(404).json({ success: false, error: 'Produit introuvable.' });
      }

      if (product.merchant_id !== merchant.id) {
        return res.status(403).json({
          success: false,
          error: 'Accès interdit. Ce produit ne vous appartient pas.'
        });
      }

      return res.status(200).json({
        success: true,
        data: product
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Ajout d'un nouveau produit par le commerçant connecté
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

      const {
        name,
        description,
        price,
        stock,
        image_url,
        category,
        subcategory,
        city,
        quartier,
        location
      } = req.body;

      const trimmedName = name.trim();

      // Protection Anti-Doublon pour un même commerçant :
      // Vérifier si le commerçant a déjà un produit actif portant exactement le même nom
      if (pool) {
        try {
          const dupCheck = await query(
            'SELECT id FROM products WHERE merchant_id = $1 AND LOWER(TRIM(name)) = LOWER($2) AND is_active = true LIMIT 1',
            [merchant.id, trimmedName]
          );
          if (dupCheck?.rows?.length > 0) {
            return res.status(409).json({
              success: false,
              error: 'Vous possédez déjà un produit actif portant ce nom dans votre boutique. Modifiez plutôt sa fiche ou son stock.'
            });
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const memDup = memoryStore.products.find(
        p => p.merchant_id === merchant.id && p.name.trim().toLowerCase() === trimmedName.toLowerCase() && p.is_active
      );
      if (memDup) {
        return res.status(409).json({
          success: false,
          error: 'Vous possédez déjà un produit actif portant ce nom dans votre boutique. Modifiez plutôt sa fiche ou son stock.'
        });
      }

      const productId = uuidv4();
      const productPrice = parseFloat(price);
      const productStock = parseInt(stock, 10) || 0;
      const productCategory = category || 'Général';
      const productSubcategory = subcategory || '';
      const productCity = city || merchant.city || 'Dakar';
      const productQuartier = quartier || merchant.quartier || '';
      const productLocation = location || `${productQuartier ? productQuartier + ', ' : ''}${productCity}`;
      const productImageUrl = (image_url && typeof image_url === 'string' && image_url.trim().length > 0) ? image_url.trim() : null;
      const initialStatus = 'APPROVED'; // Prêt pour catalogue public

      const nowIso = new Date().toISOString();

      let createdProduct = {
        id: productId,
        merchant_id: merchant.id,
        name: trimmedName,
        description: description || '',
        price: productPrice,
        stock: productStock,
        image_url: productImageUrl,
        category: productCategory,
        subcategory: productSubcategory,
        city: productCity,
        quartier: productQuartier,
        location: productLocation,
        status: initialStatus,
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso
      };

      if (pool) {
        try {
          const pRes = await query(`
            INSERT INTO products (
              id, merchant_id, name, description, price, stock, image_url,
              category, subcategory, city, quartier, location, status, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW())
            RETURNING *;
          `, [
            productId,
            merchant.id,
            name.trim(),
            description || '',
            productPrice,
            productStock,
            productImageUrl,
            productCategory,
            productSubcategory,
            productCity,
            productQuartier,
            productLocation,
            initialStatus
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
   * Modification d'un produit existant (avec protection IDOR stricte)
   */
  static async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        price,
        stock,
        image_url,
        category,
        subcategory,
        city,
        quartier,
        location,
        status,
        is_active
      } = req.body;

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
      const updatedImage = image_url !== undefined ? (image_url && typeof image_url === 'string' && image_url.trim().length > 0 ? image_url.trim() : null) : existingProduct.image_url;
      const updatedCat = category !== undefined ? category : existingProduct.category;
      const updatedSubcat = subcategory !== undefined ? subcategory : existingProduct.subcategory;
      const updatedCity = city !== undefined ? city : (existingProduct.city || merchant.city || 'Dakar');
      const updatedQuartier = quartier !== undefined ? quartier : (existingProduct.quartier || '');
      const updatedLocation = location !== undefined ? location : (existingProduct.location || `${updatedQuartier ? updatedQuartier + ', ' : ''}${updatedCity}`);
      const updatedStatus = status !== undefined ? status : (existingProduct.status || 'APPROVED');
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
                subcategory = $7,
                city = $8,
                quartier = $9,
                location = $10,
                status = $11,
                is_active = $12,
                updated_at = NOW()
            WHERE id = $13 AND merchant_id = $14
            RETURNING *;
          `, [
            updatedName,
            updatedDesc,
            updatedPrice,
            updatedStock,
            updatedImage,
            updatedCat,
            updatedSubcat,
            updatedCity,
            updatedQuartier,
            updatedLocation,
            updatedStatus,
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
        memProduct.subcategory = updatedSubcat;
        memProduct.city = updatedCity;
        memProduct.quartier = updatedQuartier;
        memProduct.location = updatedLocation;
        memProduct.status = updatedStatus;
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
   * Activation / Désactivation du statut du produit (avec protection IDOR)
   */
  static async updateProductStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, is_active } = req.body;

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
        return res.status(403).json({ success: false, error: 'Accès non autorisé.' });
      }

      const newStatus = status !== undefined ? status : (existingProduct.status || 'APPROVED');
      const newActive = is_active !== undefined ? Boolean(is_active) : (newStatus !== 'INACTIVE');

      let updatedProduct = null;
      if (pool) {
        try {
          const updRes = await query(`
            UPDATE products
            SET status = $1,
                is_active = $2,
                updated_at = NOW()
            WHERE id = $3 AND merchant_id = $4
            RETURNING *;
          `, [newStatus, newActive, id, merchant.id]);
          if (updRes?.rows?.length > 0) updatedProduct = updRes.rows[0];
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      const memProduct = memoryStore.products.find(p => p.id === id);
      if (memProduct) {
        memProduct.status = newStatus;
        memProduct.is_active = newActive;
        memProduct.updated_at = new Date().toISOString();
        if (!updatedProduct) updatedProduct = memProduct;
      }

      return res.status(200).json({
        success: true,
        message: 'Statut du produit mis à jour avec succès.',
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
                status = 'INACTIVE',
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
        memoryStore.products[memIndex].status = 'INACTIVE';
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
   * Statistiques des ventes et stocks du commerçant
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

            const pStatsRes = await query(`
              SELECT
                COUNT(*) as total_products,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
                COUNT(CASE WHEN stock <= 3 AND is_active = true THEN 1 END) as low_stock_products
              FROM products
              WHERE merchant_id = $1;
            `, [merchant.id]);

            const row = statsRes?.rows?.[0] || {};
            const pRow = pStatsRes?.rows?.[0] || {};

            metrics = {
              totalOrders: parseInt(row.total_orders || '0', 10),
              confirmedOrders: parseInt(row.confirmed_orders || '0', 10),
              pendingShipment: parseInt(row.pending_shipment || '0', 10),
              inDispute: parseInt(row.in_dispute || '0', 10),
              totalSalesVolumeFCFA: parseFloat(row.total_sales_volume || 0),
              totalProducts: parseInt(pRow.total_products || '0', 10),
              activeProducts: parseInt(pRow.active_products || '0', 10),
              lowStockProducts: parseInt(pRow.low_stock_products || '0', 10)
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
          const products = memoryStore.products.filter(p => p.merchant_id === merchant.id);

          const totalSalesVolume = orders
            .filter(o => o.status === 'CONFIRMED' || o.status === 'SHIPPED' || o.status === 'DELIVERED')
            .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

          metrics = {
            totalOrders: orders.length,
            confirmedOrders: orders.filter(o => o.status === 'CONFIRMED').length,
            pendingShipment: orders.filter(o => o.status === 'PAYMENT_CONFIRMED' || o.status === 'PROCESSING').length,
            inDispute: orders.filter(o => o.status === 'DISPUTED').length,
            totalSalesVolumeFCFA: totalSalesVolume,
            totalProducts: products.length,
            activeProducts: products.filter(p => p.is_active).length,
            lowStockProducts: products.filter(p => p.is_active && p.stock <= 3).length
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

/**
 * MoneyLink — MerchantController (Espace & Catalogue Commerçant)
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore } from '../config/db.js';

export class MerchantController {
  /**
   * Liste des commerçants actifs
   */
  static async listMerchants(req, res, next) {
    try {
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
      const merchant = memoryStore.merchants.find(m => m.id === id || m.user_id === id);

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
   * Ajout d'un nouveau produit par le commerçant
   */
  static async createProduct(req, res, next) {
    try {
      const merchant = memoryStore.merchants.find(m => m.user_id === req.user.id);
      if (!merchant) {
        return res.status(403).json({
          success: false,
          error: 'Vous devez posséder un profil commerçant actif pour ajouter des produits.'
        });
      }

      const { name, description, price, stock, image_url, category } = req.body;
      const newProduct = {
        id: uuidv4(),
        merchant_id: merchant.id,
        name: name.trim(),
        description: description || '',
        price: parseFloat(price),
        stock: parseInt(stock, 10) || 0,
        image_url: image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        category: category || 'Général',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      memoryStore.products.push(newProduct);

      return res.status(201).json({
        success: true,
        message: 'Produit ajouté avec succès au catalogue.',
        data: newProduct
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
      const merchant = memoryStore.merchants.find(m => m.user_id === req.user.id);
      if (!merchant) {
        return res.status(403).json({ success: false, error: 'Profil commerçant introuvable.' });
      }

      const orders = memoryStore.orders.filter(o => o.merchant_id === merchant.id);
      const totalSalesVolume = orders
        .filter(o => o.status === 'CONFIRMED' || o.status === 'SHIPPED' || o.status === 'DELIVERED')
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

      const wallet = memoryStore.wallets.find(w => w.user_id === req.user.id);

      return res.status(200).json({
        success: true,
        data: {
          merchant,
          wallet,
          metrics: {
            totalOrders: orders.length,
            confirmedOrders: orders.filter(o => o.status === 'CONFIRMED').length,
            pendingShipment: orders.filter(o => o.status === 'PAYMENT_CONFIRMED' || o.status === 'PROCESSING').length,
            inDispute: orders.filter(o => o.status === 'DISPUTED').length,
            totalSalesVolumeFCFA: totalSalesVolume
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

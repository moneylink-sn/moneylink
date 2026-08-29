/**
 * MoneyLink — EscrowService (Moteur de Séquestre & Tiers de Confiance)
 * Gère le cycle de vie complet des fonds bloqués, validation OTP et libération
 * Supporte PostgreSQL avec transactions ACID et fallback mémoire
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, withTransaction, pool } from '../config/db.js';
import { notificationService } from './notificationService.js';

export class EscrowService {
  /**
   * Génère un code OTP aléatoire de 6 chiffres pour la réception sécurisée
   */
  static generateDeliveryCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Bloque les fonds d'une commande en séquestre après confirmation de paiement
   */
  static async lockFundsForOrder({ orderId, buyerId, merchantId, totalAmount, paymentMethod, reference }) {
    let order = null;
    let merchant = null;

    if (pool) {
      try {
        const orderRes = await query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
        if (orderRes?.rows?.length > 0) {
          order = orderRes.rows[0];
        }
        const merchantRes = await query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [merchantId || order?.merchant_id]);
        if (merchantRes?.rows?.length > 0) {
          merchant = merchantRes.rows[0];
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }

    if (!order) {
      order = memoryStore.orders.find(o => o.id === orderId);
    }
    if (!order) throw new Error('Commande introuvable.');

    if (!merchant) {
      merchant = memoryStore.merchants.find(m => m.id === (merchantId || order.merchant_id));
    }

    // Calcul frais de service (1%)
    const feePercent = parseFloat(process.env.ESCROW_FEE_PERCENT || '1.0');
    const serviceFee = Math.round((totalAmount * feePercent) / 100);
    const escrowAmount = parseFloat(totalAmount);

    // Génération du code de livraison
    const plainDeliveryCode = this.generateDeliveryCode();
    const deliveryCodeHash = await bcrypt.hash(plainDeliveryCode, 10);
    const txnId = uuidv4();
    const txnReference = reference || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    let txn = null;

    if (pool) {
      try {
        await withTransaction(async (client) => {
          if (client) {
            // 0. Si paiement par portefeuille, débit atomique avec vérification de solde
            if (paymentMethod === 'WALLET') {
              const wDebitRes = await client.query(`
                UPDATE wallets
                SET available_balance = available_balance - $1,
                    updated_at = NOW()
                WHERE user_id = $2 AND available_balance >= $1
                RETURNING *;
              `, [totalAmount, buyerId]);

              if (wDebitRes.rows.length === 0) {
                throw new Error('Solde MoneyLink insuffisant pour régler cette commande.');
              }
            }

            // 1. Mise à jour de la commande (uniquement si PENDING_PAYMENT)
            const updateOrderSql = `
              UPDATE orders
              SET status = 'PAYMENT_CONFIRMED',
                  escrow_amount = $1,
                  service_fee = $2,
                  delivery_code_hash = $3,
                  paid_at = NOW(),
                  updated_at = NOW()
              WHERE id = $4 AND status = 'PENDING_PAYMENT'
              RETURNING *;
            `;
            const updatedOrderRes = await client.query(updateOrderSql, [escrowAmount, serviceFee, deliveryCodeHash, orderId]);
            if (updatedOrderRes.rows.length === 0) {
              throw new Error('Cette commande n’est plus en attente de paiement.');
            }
            order = updatedOrderRes.rows[0];

            // 2. Création de la transaction
            const txnSql = `
              INSERT INTO transactions (
                id, reference, idempotency_key, sender_id, receiver_id, order_id,
                type, amount, fee, currency, payment_method, status, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'SUCCESS', NOW())
              RETURNING *;
            `;
            const txnRes = await client.query(txnSql, [
              txnId,
              txnReference,
              `IDEM-LOCK-${orderId}`,
              buyerId,
              merchant ? merchant.user_id : null,
              orderId,
              'ESCROW_LOCK',
              totalAmount,
              serviceFee,
              'XOF',
              paymentMethod || 'WAVE_MOCK'
            ]);
            txn = txnRes.rows[0];

            // 3. Ajustement portefeuille commerçant (locked_balance)
            if (merchant) {
              await client.query(`
                UPDATE wallets
                SET locked_balance = locked_balance + $1,
                    updated_at = NOW()
                WHERE user_id = $2;
              `, [totalAmount, merchant.user_id]);
            }
          }
        });
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    // Mise à jour miroir / fallback memoryStore
    if (paymentMethod === 'WALLET') {
      const memBuyerWallet = memoryStore.wallets.find(w => w.user_id === buyerId);
      if (memBuyerWallet) {
        if (parseFloat(memBuyerWallet.available_balance) < totalAmount) {
          throw new Error('Solde MoneyLink insuffisant pour régler cette commande.');
        }
        memBuyerWallet.available_balance = (parseFloat(memBuyerWallet.available_balance) || 0) - totalAmount;
      }
    }

    const memOrder = memoryStore.orders.find(o => o.id === orderId);
    if (memOrder) {
      memOrder.status = 'PAYMENT_CONFIRMED';
      memOrder.escrow_amount = escrowAmount;
      memOrder.service_fee = serviceFee;
      memOrder.delivery_code_hash = deliveryCodeHash;
      memOrder.paid_at = nowIso;
      memOrder.updated_at = nowIso;
      order = memOrder;
    }


    if (!txn) {
      txn = {
        id: txnId,
        reference: txnReference,
        idempotency_key: `IDEM-LOCK-${orderId}`,
        sender_id: buyerId,
        receiver_id: merchant ? merchant.user_id : null,
        order_id: orderId,
        type: 'ESCROW_LOCK',
        amount: totalAmount,
        fee: serviceFee,
        currency: 'XOF',
        payment_method: paymentMethod || 'WAVE_MOCK',
        status: 'SUCCESS',
        created_at: nowIso
      };
      memoryStore.transactions.push(txn);

      if (merchant) {
        const merchantWallet = memoryStore.wallets.find(w => w.user_id === merchant.user_id);
        if (merchantWallet) {
          merchantWallet.locked_balance = (parseFloat(merchantWallet.locked_balance) || 0) + totalAmount;
        }
      }
    }

    // Notifications
    notificationService.sendNotification({
      userId: buyerId,
      title: 'Paiement Sécurisé Garanti 🔒',
      message: `Votre paiement de ${totalAmount.toLocaleString('fr-FR')} FCFA pour la commande #${order.order_number} est sous séquestre. Votre code secret de réception est : ${plainDeliveryCode}`,
      type: 'PAYMENT',
      payload: { orderId, plainDeliveryCode }
    });

    if (merchant) {
      notificationService.sendNotification({
        userId: merchant.user_id,
        title: 'Nouvelle Vente Payée (Séquestrée) 📦',
        message: `La commande #${order.order_number} (${totalAmount.toLocaleString('fr-FR')} FCFA) a été réglée et sécurisée. Vous pouvez expédier le colis.`,
        type: 'ORDER_STATUS',
        payload: { orderId }
      });
    }

    return {
      order,
      plainDeliveryCode,
      transaction: txn
    };
  }

  /**
   * Libère les fonds au commerçant suite à la saisie du code OTP de réception
   */
  static async releaseFundsWithCode({ orderId, inputCode, validatedByUserId }) {
    let order = null;
    if (pool) {
      try {
        const orderRes = await query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
        if (orderRes?.rows?.length > 0) {
          order = orderRes.rows[0];
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }

    if (!order) {
      order = memoryStore.orders.find(o => o.id === orderId);
    }
    if (!order) throw new Error('Commande introuvable.');

    if (order.status === 'CONFIRMED') {
      throw new Error('Les fonds de cette commande ont déjà été libérés.');
    }

    if (order.status === 'DISPUTED') {
      throw new Error('Cette commande est sous litige. Un arbitrage administrateur est nécessaire.');
    }

    // Vérification du code de sécurité
    if (!order.delivery_code_hash) {
      throw new Error('Aucun code de livraison associé à cette commande.');
    }

    const isCodeValid = await bcrypt.compare(inputCode.trim(), order.delivery_code_hash);
    if (!isCodeValid) {
      throw new Error('Code de réception incorrect. Veuillez demander le code valide à l’acheteur.');
    }

    return await this._executeEscrowRelease(order, 'CODE_VALIDATION');
  }

  /**
   * Confirmation directe 1-clic par l'acheteur
   */
  static async releaseFundsByBuyer({ orderId, buyerId }) {
    let order = null;
    if (pool) {
      try {
        const orderRes = await query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
        if (orderRes?.rows?.length > 0) {
          order = orderRes.rows[0];
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }

    if (!order) {
      order = memoryStore.orders.find(o => o.id === orderId);
    }
    if (!order) throw new Error('Commande introuvable.');

    if (order.buyer_id !== buyerId) {
      throw new Error('Seul l’acheteur de cette commande peut confirmer la réception.');
    }

    if (order.status === 'CONFIRMED') {
      throw new Error('Cette commande a déjà été confirmée.');
    }

    return await this._executeEscrowRelease(order, 'BUYER_CONFIRMATION');
  }

  /**
   * Exécution interne du transfert de fonds vers le solde disponible
   */
  static async _executeEscrowRelease(order, reason) {
    let merchant = null;
    if (pool) {
      try {
        const mRes = await query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [order.merchant_id]);
        if (mRes?.rows?.length > 0) {
          merchant = mRes.rows[0];
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }
    if (!merchant) {
      merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);
    }
    if (!merchant) throw new Error('Commerçant introuvable.');

    const totalAmount = parseFloat(order.total_amount);
    const serviceFee = parseFloat(order.service_fee || 0);
    const releaseAmount = totalAmount - serviceFee;
    const releaseTxnId = uuidv4();
    const releaseTxnRef = `TXN-REL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    let releaseTxn = null;
    let updatedOrder = order;

    if (pool) {
      try {
        await withTransaction(async (client) => {
          if (client) {
            // 1. Mise à jour du portefeuille commerçant
            await client.query(`
              UPDATE wallets
              SET locked_balance = GREATEST(0, locked_balance - $1),
                  available_balance = available_balance + $2,
                  updated_at = NOW()
              WHERE user_id = $3;
            `, [totalAmount, releaseAmount, merchant.user_id]);

            // 2. Mise à jour de la commande (uniquement si non déjà confirmée)
            const ordRes = await client.query(`
              UPDATE orders
              SET status = 'CONFIRMED',
                  delivered_at = NOW(),
                  confirmed_at = NOW(),
                  updated_at = NOW()
              WHERE id = $1 AND status != 'CONFIRMED'
              RETURNING *;
            `, [order.id]);
            if (ordRes.rows.length === 0) {
              throw new Error('Les fonds de cette commande ont déjà été libérés.');
            }
            updatedOrder = ordRes.rows[0];


            // 3. Enregistrement transaction
            const txnRes = await client.query(`
              INSERT INTO transactions (
                id, reference, idempotency_key, sender_id, receiver_id, order_id,
                type, amount, fee, currency, payment_method, status, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, 'ESCROW_RELEASE', $7, $8, 'XOF', 'WALLET', 'SUCCESS', NOW())
              RETURNING *;
            `, [
              releaseTxnId,
              releaseTxnRef,
              `IDEM-REL-${order.id}`,
              order.buyer_id,
              merchant.user_id,
              order.id,
              releaseAmount,
              serviceFee
            ]);
            releaseTxn = txnRes.rows[0];
          }
        });
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    // Mise à jour miroir / fallback memoryStore
    const memMerchantWallet = memoryStore.wallets.find(w => w.user_id === merchant.user_id);
    if (memMerchantWallet) {
      memMerchantWallet.locked_balance = Math.max(0, (parseFloat(memMerchantWallet.locked_balance) || 0) - totalAmount);
      memMerchantWallet.available_balance = (parseFloat(memMerchantWallet.available_balance) || 0) + releaseAmount;
    }

    const memOrder = memoryStore.orders.find(o => o.id === order.id);
    if (memOrder) {
      memOrder.status = 'CONFIRMED';
      memOrder.delivered_at = nowIso;
      memOrder.confirmed_at = nowIso;
      memOrder.updated_at = nowIso;
      updatedOrder = memOrder;
    }

    if (!releaseTxn) {
      releaseTxn = {
        id: releaseTxnId,
        reference: releaseTxnRef,
        idempotency_key: `IDEM-REL-${order.id}`,
        sender_id: order.buyer_id,
        receiver_id: merchant.user_id,
        order_id: order.id,
        type: 'ESCROW_RELEASE',
        amount: releaseAmount,
        fee: serviceFee,
        currency: 'XOF',
        payment_method: 'WALLET',
        status: 'SUCCESS',
        created_at: nowIso
      };
      memoryStore.transactions.push(releaseTxn);
    }

    // Notifications
    notificationService.sendNotification({
      userId: merchant.user_id,
      title: 'Paiement Débloqué ! 💰',
      message: `Votre compte a été crédité de ${releaseAmount.toLocaleString('fr-FR')} FCFA pour la commande #${order.order_number}.`,
      type: 'PAYMENT',
      payload: { orderId: order.id }
    });

    notificationService.sendNotification({
      userId: order.buyer_id,
      title: 'Commande Terminée avec Succès ✅',
      message: `La réception de la commande #${order.order_number} a été validée. Merci d’avoir utilisé MoneyLink !`,
      type: 'ORDER_STATUS',
      payload: { orderId: order.id }
    });

    return {
      order: updatedOrder,
      releaseTxn,
      releasedAmount: releaseAmount
    };
  }

  /**
   * Remboursement de l'acheteur en cas de résolution de litige en sa faveur
   */
  static async refundOrderToBuyer({ orderId, adminNotes, resolvedByUserId }) {
    let order = null;
    let merchant = null;

    if (pool) {
      try {
        const ordRes = await query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
        if (ordRes?.rows?.length > 0) order = ordRes.rows[0];
        if (order) {
          const mRes = await query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [order.merchant_id]);
          if (mRes?.rows?.length > 0) merchant = mRes.rows[0];
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }

    if (!order) order = memoryStore.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Commande introuvable.');

    if (!merchant) merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);

    const totalAmount = parseFloat(order.total_amount);
    const refundTxnId = uuidv4();
    const refundTxnRef = `TXN-REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    let refundTxn = null;
    let updatedOrder = order;

    if (pool) {
      try {
        await withTransaction(async (client) => {
          if (client) {
            // Décrémenter locked_balance du commerçant si présent
            if (merchant) {
              await client.query(`
                UPDATE wallets
                SET locked_balance = GREATEST(0, locked_balance - $1),
                    updated_at = NOW()
                WHERE user_id = $2;
              `, [totalAmount, merchant.user_id]);
            }

            // Créditer le portefeuille de l'acheteur
            await client.query(`
              UPDATE wallets
              SET available_balance = available_balance + $1,
                  updated_at = NOW()
              WHERE user_id = $2;
            `, [totalAmount, order.buyer_id]);

            // Passer la commande à REFUNDED (si non déjà remboursée ou confirmée)
            const ordRes = await client.query(`
              UPDATE orders
              SET status = 'REFUNDED',
                  updated_at = NOW()
              WHERE id = $1 AND status != 'REFUNDED' AND status != 'CONFIRMED'
              RETURNING *;
            `, [order.id]);
            if (ordRes.rows.length === 0) {
              throw new Error('Cette commande ne peut plus être remboursée (déjà traitée ou clôturée).');
            }
            updatedOrder = ordRes.rows[0];


            // Transaction de remboursement
            const txnRes = await client.query(`
              INSERT INTO transactions (
                id, reference, idempotency_key, sender_id, receiver_id, order_id,
                type, amount, fee, currency, payment_method, status, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, 'ESCROW_REFUND', $7, 0, 'XOF', 'WALLET', 'SUCCESS', NOW())
              RETURNING *;
            `, [
              refundTxnId,
              refundTxnRef,
              `IDEM-REF-${order.id}`,
              merchant ? merchant.user_id : null,
              order.buyer_id,
              order.id,
              totalAmount
            ]);
            refundTxn = txnRes.rows[0];
          }
        });
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    // Miroir memoryStore
    if (merchant) {
      const merchantWallet = memoryStore.wallets.find(w => w.user_id === merchant.user_id);
      if (merchantWallet) {
        merchantWallet.locked_balance = Math.max(0, (parseFloat(merchantWallet.locked_balance) || 0) - totalAmount);
      }
    }

    const buyerWallet = memoryStore.wallets.find(w => w.user_id === order.buyer_id);
    if (buyerWallet) {
      buyerWallet.available_balance = (parseFloat(buyerWallet.available_balance) || 0) + totalAmount;
    }

    const memOrder = memoryStore.orders.find(o => o.id === orderId);
    if (memOrder) {
      memOrder.status = 'REFUNDED';
      memOrder.updated_at = nowIso;
      updatedOrder = memOrder;
    }

    if (!refundTxn) {
      refundTxn = {
        id: refundTxnId,
        reference: refundTxnRef,
        idempotency_key: `IDEM-REF-${order.id}`,
        sender_id: merchant ? merchant.user_id : null,
        receiver_id: order.buyer_id,
        order_id: order.id,
        type: 'ESCROW_REFUND',
        amount: totalAmount,
        fee: 0.00,
        currency: 'XOF',
        payment_method: 'WALLET',
        status: 'SUCCESS',
        created_at: nowIso
      };
      memoryStore.transactions.push(refundTxn);
    }

    // Notification acheteur
    notificationService.sendNotification({
      userId: order.buyer_id,
      title: 'Remboursement Effectué 🔄',
      message: `Votre commande #${order.order_number} de ${totalAmount.toLocaleString('fr-FR')} FCFA a été remboursée sur votre solde.`,
      type: 'PAYMENT',
      payload: { orderId: order.id }
    });

    return { order: updatedOrder, refundTxn };
  }
}

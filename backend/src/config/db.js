/**
 * MoneyLink — Configuration & Abstraction Base de Données
 * Prise en charge de PostgreSQL physique (pg.Pool) avec détection d'état réelle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import { initialSeedData } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chargement robuste des variables d'environnement depuis backend/.env ou la racine
const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../.env')
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const { Pool } = pg;

export let pool = null;
export let isPostgresConnected = false;

let coreTablesInitialized = false;
let analyticsEventsInitialized = false;

// Stockage mémoire de secours (initialisé avec les seeds de démo) pour tests et développement local autonome
export const memoryStore = JSON.parse(JSON.stringify(initialSeedData));

// Initialisation réelle du Pool PostgreSQL
if (process.env.DATABASE_URL && process.env.USE_SQLITE !== 'true') {
  try {
    const isLocalDb = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
      ...(isLocalDb ? {} : { ssl: { rejectUnauthorized: false } })
    });

    pool.on('error', (err) => {
      console.error('⚠️ Avertissement Pool PostgreSQL :', err.message);
      isPostgresConnected = false;
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 ERREUR CRITIQUE: Échec d\'initialisation du Pool PostgreSQL en production :', err.message);
      throw err;
    }
  }
}

/**
 * Assure la présence non-destructive de toutes les tables principales de MoneyLink
 */
export async function ensureCoreTables(client) {
  if (coreTablesInitialized) return;
  try {
    const testRes = await client.query('SELECT 1 FROM users LIMIT 1');
    const prodRes = await client.query('SELECT 1 FROM products LIMIT 1');
    const ordRes = await client.query('SELECT 1 FROM orders LIMIT 1');
    const savRes = await client.query('SELECT 1 FROM savings_goals LIMIT 1');
    if (testRes && prodRes && ordRes && savRes) {
      coreTablesInitialized = true;
      return;
    }
  } catch {
    // Une ou plusieurs tables n'existent pas encore
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          phone TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'CLIENT',
          status TEXT DEFAULT 'ACTIVE',
          avatar_url TEXT,
          subscription_status TEXT DEFAULT 'TRIAL',
          subscription_start_date TIMESTAMPTZ,
          subscription_end_date TIMESTAMPTZ,
          subscription_price NUMERIC DEFAULT 500.00,
          is_trial BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

      CREATE TABLE IF NOT EXISTS wallets (
          id TEXT PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          available_balance NUMERIC DEFAULT 0.00,
          locked_balance NUMERIC DEFAULT 0.00,
          currency TEXT DEFAULT 'XOF',
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

      CREATE TABLE IF NOT EXISTS merchants (
          id TEXT PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          business_name TEXT NOT NULL,
          business_type TEXT NOT NULL,
          description TEXT,
          address TEXT,
          city TEXT DEFAULT 'Dakar',
          phone TEXT,
          logo_url TEXT,
          is_verified BOOLEAN DEFAULT FALSE,
          status TEXT DEFAULT 'ACTIVE',
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
      CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);

      CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          plan_name TEXT DEFAULT 'MoneyLink Premium',
          amount NUMERIC DEFAULT 500.00,
          currency TEXT DEFAULT 'XOF',
          status TEXT DEFAULT 'TRIAL',
          is_trial BOOLEAN DEFAULT TRUE,
          payment_method TEXT,
          payment_reference TEXT,
          start_date TIMESTAMPTZ,
          end_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

      CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          merchant_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          price NUMERIC DEFAULT 0.00,
          stock INTEGER DEFAULT 0,
          image_url TEXT,
          category TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON products(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

      CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          order_number TEXT UNIQUE NOT NULL,
          buyer_id TEXT NOT NULL,
          merchant_id TEXT NOT NULL,
          total_amount NUMERIC NOT NULL,
          escrow_amount NUMERIC DEFAULT 0.00,
          service_fee NUMERIC DEFAULT 0.00,
          status TEXT DEFAULT 'PENDING_PAYMENT',
          delivery_code TEXT,
          delivery_code_hash TEXT,
          delivery_address TEXT,
          delivery_phone TEXT,
          delivery_notes TEXT,
          paid_at TIMESTAMPTZ,
          shipped_at TIMESTAMPTZ,
          delivered_at TIMESTAMPTZ,
          confirmed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

      CREATE TABLE IF NOT EXISTS order_items (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          product_name TEXT,
          quantity INTEGER NOT NULL,
          unit_price NUMERIC NOT NULL,
          total_price NUMERIC NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

      CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          reference TEXT UNIQUE NOT NULL,
          idempotency_key TEXT,
          sender_id TEXT,
          receiver_id TEXT,
          order_id TEXT,
          type TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          fee NUMERIC DEFAULT 0.00,
          currency TEXT DEFAULT 'XOF',
          payment_method TEXT NOT NULL,
          status TEXT DEFAULT 'PENDING',
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
      CREATE INDEX IF NOT EXISTS idx_transactions_sender_id ON transactions(sender_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_receiver_id ON transactions(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

      CREATE TABLE IF NOT EXISTS savings_goals (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          target_amount NUMERIC NOT NULL,
          current_amount NUMERIC DEFAULT 0.00,
          start_date DATE,
          target_date DATE,
          type TEXT DEFAULT 'PERSONAL',
          frequency TEXT DEFAULT 'MONTHLY',
          status TEXT DEFAULT 'ACTIVE',
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_savings_goals_owner_id ON savings_goals(owner_id);
      CREATE INDEX IF NOT EXISTS idx_savings_goals_type ON savings_goals(type);
      CREATE INDEX IF NOT EXISTS idx_savings_goals_status ON savings_goals(status);

      CREATE TABLE IF NOT EXISTS savings_members (
          id TEXT PRIMARY KEY,
          savings_goal_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT DEFAULT 'CONTRIBUTOR',
          total_contributed NUMERIC DEFAULT 0.00,
          joined_at TIMESTAMPTZ,
          CONSTRAINT uq_savings_members UNIQUE (savings_goal_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_savings_members_goal_id ON savings_members(savings_goal_id);
      CREATE INDEX IF NOT EXISTS idx_savings_members_user_id ON savings_members(user_id);

      CREATE TABLE IF NOT EXISTS savings_contributions (
          id TEXT PRIMARY KEY,
          savings_goal_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          transaction_id TEXT,
          amount NUMERIC NOT NULL,
          note TEXT,
          created_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal_id ON savings_contributions(savings_goal_id);
      CREATE INDEX IF NOT EXISTS idx_savings_contributions_user_id ON savings_contributions(user_id);

      CREATE TABLE IF NOT EXISTS disputes (
          id TEXT PRIMARY KEY,
          order_id TEXT UNIQUE NOT NULL,
          opened_by TEXT NOT NULL,
          reason TEXT NOT NULL,
          description TEXT,
          evidence_urls JSONB DEFAULT '[]'::jsonb,
          status TEXT DEFAULT 'OPENED',
          resolution_notes TEXT,
          resolved_by TEXT,
          resolved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
      CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON disputes(opened_by);
      CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

      CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          payload JSONB DEFAULT '{}'::jsonb,
          is_read BOOLEAN DEFAULT FALSE,
          channel TEXT DEFAULT 'PUSH',
          created_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `);
    coreTablesInitialized = true;
  } catch (err) {
    console.warn('⚠️ Avertissement initialisation non-destructive tables :', err.message);
  }
}

/**
 * Assure la présence non-destructive de la table analytics_events et de ses index
 */
export async function ensureAnalyticsEventsTable(client) {
  if (analyticsEventsInitialized) return;
  try {
    const testRes = await client.query('SELECT 1 FROM analytics_events LIMIT 1');
    if (testRes) {
      analyticsEventsInitialized = true;
      return;
    }
  } catch {
    // La table n'existe pas encore
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          user_id TEXT,
          session_id TEXT,
          platform TEXT DEFAULT 'WEB_LANDING',
          metadata JSONB,
          created_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
    `);
    analyticsEventsInitialized = true;
  } catch (err) {
    console.warn('⚠️ Avertissement initialisation non-destructive analytics_events :', err.message);
  }
}

/**
 * Injection non-destructive des seeds PostgreSQL si la base est vierge
 */
export async function seedTablesIfEmpty(client) {
  try {
    const userCheck = await client.query('SELECT COUNT(*) as total FROM users');
    const count = parseInt(userCheck.rows[0]?.total || '0', 10);
    if (count > 0) return;

    for (const u of initialSeedData.users) {
      await client.query(`
        INSERT INTO users (
          id, phone, email, first_name, last_name, password_hash, role, status,
          avatar_url, subscription_status, subscription_start_date, subscription_end_date,
          subscription_price, is_trial, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO NOTHING
      `, [
        u.id, u.phone, u.email, u.first_name, u.last_name, u.password_hash, u.role, u.status || 'ACTIVE',
        u.avatar_url, u.subscription_status || 'TRIAL', u.subscription_start_date || new Date().toISOString(),
        u.subscription_end_date || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        u.subscription_price || 500, u.is_trial ?? true, u.created_at || new Date().toISOString(), u.updated_at || new Date().toISOString()
      ]);
    }

    for (const w of initialSeedData.wallets) {
      await client.query(`
        INSERT INTO wallets (id, user_id, available_balance, locked_balance, currency, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        w.id, w.user_id, w.available_balance || 0, w.locked_balance || 0, w.currency || 'XOF',
        w.created_at || new Date().toISOString(), w.updated_at || new Date().toISOString()
      ]);
    }

    for (const m of initialSeedData.merchants) {
      await client.query(`
        INSERT INTO merchants (
          id, user_id, business_name, business_type, description, address, city,
          phone, logo_url, is_verified, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [
        m.id, m.user_id, m.business_name, m.business_type, m.description || '', m.address, m.city || 'Dakar',
        m.phone, m.logo_url, m.is_verified || false, m.status || 'ACTIVE',
        m.created_at || new Date().toISOString(), m.updated_at || new Date().toISOString()
      ]);
    }

    for (const s of (initialSeedData.subscriptions || [])) {
      await client.query(`
        INSERT INTO subscriptions (
          id, user_id, plan_name, amount, currency, status, is_trial, payment_method,
          payment_reference, start_date, end_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [
        s.id, s.user_id, s.plan_name || 'MoneyLink Premium', s.amount || 500, s.currency || 'XOF',
        s.status || 'TRIAL', s.is_trial ?? true, s.payment_method || 'WAVE', s.payment_reference || null,
        s.start_date || new Date().toISOString(), s.end_date || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        s.created_at || new Date().toISOString(), s.updated_at || new Date().toISOString()
      ]);
    }

    for (const p of (initialSeedData.products || [])) {
      await client.query(`
        INSERT INTO products (
          id, merchant_id, name, description, price, stock, image_url, category, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        p.id, p.merchant_id, p.name, p.description || '', p.price || 0, p.stock || 0,
        p.image_url || '', p.category || 'Général', p.is_active ?? true,
        p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString()
      ]);
    }

    for (const o of (initialSeedData.orders || [])) {
      await client.query(`
        INSERT INTO orders (
          id, order_number, buyer_id, merchant_id, total_amount, escrow_amount, service_fee,
          status, delivery_code, delivery_code_hash, delivery_address, delivery_phone,
          delivery_notes, paid_at, shipped_at, delivered_at, confirmed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (id) DO NOTHING
      `, [
        o.id, o.order_number, o.buyer_id, o.merchant_id, o.total_amount, o.escrow_amount || 0,
        o.service_fee || 0, o.status || 'PENDING_PAYMENT', o.delivery_code || null,
        o.delivery_code_hash || null, o.delivery_address || 'Dakar', o.delivery_phone || '',
        o.delivery_notes || '', o.paid_at || null, o.shipped_at || null, o.delivered_at || null,
        o.confirmed_at || null, o.created_at || new Date().toISOString(), o.updated_at || new Date().toISOString()
      ]);

      for (const itm of (o.items || [])) {
        await client.query(`
          INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [
          itm.id, o.id, itm.product_id, itm.product_name || '', itm.quantity || 1, itm.unit_price || 0, itm.total_price || 0
        ]);
      }
    }

    for (const t of (initialSeedData.transactions || [])) {
      await client.query(`
        INSERT INTO transactions (
          id, reference, idempotency_key, sender_id, receiver_id, order_id, type, amount, fee,
          currency, payment_method, status, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING
      `, [
        t.id, t.reference, t.idempotency_key || null, t.sender_id || null, t.receiver_id || null,
        t.order_id || null, t.type, t.amount, t.fee || 0, t.currency || 'XOF',
        t.payment_method, t.status || 'PENDING', JSON.stringify(t.metadata || {}), t.created_at || new Date().toISOString()
      ]);
    }

    for (const g of (initialSeedData.savings_goals || [])) {
      await client.query(`
        INSERT INTO savings_goals (
          id, owner_id, title, description, target_amount, current_amount, start_date, target_date,
          type, frequency, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [
        g.id, g.owner_id, g.title, g.description || '', g.target_amount, g.current_amount || 0,
        g.start_date || new Date().toISOString().split('T')[0], g.target_date,
        g.type || 'PERSONAL', g.frequency || 'MONTHLY', g.status || 'ACTIVE',
        g.created_at || new Date().toISOString(), g.updated_at || new Date().toISOString()
      ]);
    }

    for (const sm of (initialSeedData.savings_members || [])) {
      await client.query(`
        INSERT INTO savings_members (id, savings_goal_id, user_id, role, total_contributed, joined_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [
        sm.id, sm.savings_goal_id, sm.user_id, sm.role || 'CONTRIBUTOR', sm.total_contributed || 0, sm.joined_at || new Date().toISOString()
      ]);
    }

    for (const sc of (initialSeedData.savings_contributions || [])) {
      await client.query(`
        INSERT INTO savings_contributions (id, savings_goal_id, user_id, transaction_id, amount, note, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        sc.id, sc.savings_goal_id, sc.user_id, sc.transaction_id || null, sc.amount, sc.note || '', sc.created_at || new Date().toISOString()
      ]);
    }

    for (const d of (initialSeedData.disputes || [])) {
      await client.query(`
        INSERT INTO disputes (
          id, order_id, opened_by, reason, description, evidence_urls, status, resolution_notes,
          resolved_by, resolved_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING
      `, [
        d.id, d.order_id, d.opened_by, d.reason, d.description || '', JSON.stringify(d.evidence_urls || []),
        d.status || 'OPENED', d.resolution_notes || '', d.resolved_by || null, d.resolved_at || null,
        d.created_at || new Date().toISOString(), d.updated_at || new Date().toISOString()
      ]);
    }

    for (const n of (initialSeedData.notifications || [])) {
      await client.query(`
        INSERT INTO notifications (id, user_id, title, message, type, payload, is_read, channel, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [
        n.id, n.user_id, n.title, n.message, n.type, JSON.stringify(n.payload || {}), n.is_read || false,
        n.channel || 'PUSH', n.created_at || new Date().toISOString()
      ]);
    }
  } catch (err) {
    console.warn('⚠️ Avertissement injection des seeds PostgreSQL :', err.message);
  }
}

/**
 * Assure la présence, le rôle ADMIN et le statut ACTIVE du compte administrateur racine
 */
export async function ensureAdminAccount(client) {
  try {
    const adminUser = initialSeedData.users.find(u => u.role === 'ADMIN') || initialSeedData.users[0];
    if (!adminUser) return;

    // 1. Recherche si l'administrateur existe déjà (par email, téléphone ou ID)
    const existing = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) OR phone = $2 OR id = $3 LIMIT 1',
      [adminUser.email, adminUser.phone, adminUser.id]
    );

    if (existing && existing.rows && existing.rows.length > 0) {
      const targetId = existing.rows[0].id;
      await client.query(`
        UPDATE users SET
          phone = $1,
          email = $2,
          first_name = $3,
          last_name = $4,
          password_hash = $5,
          role = 'ADMIN',
          status = 'ACTIVE',
          subscription_status = 'ACTIVE',
          is_trial = false,
          updated_at = NOW()
        WHERE id = $6
      `, [
        adminUser.phone,
        adminUser.email,
        adminUser.first_name,
        adminUser.last_name,
        adminUser.password_hash,
        targetId
      ]);
    } else {
      await client.query(`
        INSERT INTO users (
          id, phone, email, first_name, last_name, password_hash, role, status,
          avatar_url, subscription_status, subscription_start_date, subscription_end_date,
          subscription_price, is_trial, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'ADMIN', 'ACTIVE', $7, 'ACTIVE', NOW(), NOW() + INTERVAL '365 days', 500.00, false, NOW(), NOW())
      `, [
        adminUser.id,
        adminUser.phone,
        adminUser.email,
        adminUser.first_name,
        adminUser.last_name,
        adminUser.password_hash,
        adminUser.avatar_url
      ]);
    }

    // 2. Assurer le portefeuille de l'administrateur
    const adminWallet = initialSeedData.wallets.find(w => w.user_id === adminUser.id);
    if (adminWallet) {
      await client.query(`
        INSERT INTO wallets (id, user_id, available_balance, locked_balance, currency, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          available_balance = GREATEST(wallets.available_balance, EXCLUDED.available_balance),
          updated_at = NOW()
      `, [
        adminWallet.id,
        adminUser.id,
        adminWallet.available_balance || 5000000.00,
        adminWallet.locked_balance || 0.00,
        adminWallet.currency || 'XOF'
      ]);
    }
  } catch (err) {
    console.warn('⚠️ Avertissement synchronisation compte administrateur :', err.message);
  }
}

/**
 * Vérifie activement l'état et la disponibilité réelle de la connexion PostgreSQL
 */
export async function checkDbHealth() {
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query('SELECT NOW() as server_time, current_database() as database, version() as version');
        isPostgresConnected = true;

        await ensureCoreTables(client);
        await ensureAnalyticsEventsTable(client);
        await ensureAdminAccount(client);
        await seedTablesIfEmpty(client);

        return {
          connected: true,
          mode: 'POSTGRESQL',
          database: res.rows[0]?.database || 'moneylink_db',
          serverTime: res.rows[0]?.server_time,
          version: res.rows[0]?.version
        };
      } finally {
        client.release();
      }
    } catch (err) {
      isPostgresConnected = false;
      if (process.env.NODE_ENV === 'production') {
        return {
          connected: false,
          mode: 'ERROR',
          error: err.message
        };
      }

      return {
        connected: false,
        mode: 'IN_MEMORY',
        error: err.message,
        message: 'Serveur PostgreSQL physique non joignable sur DATABASE_URL'
      };
    }
  }

  isPostgresConnected = false;
  return {
    connected: false,
    mode: 'IN_MEMORY',
    message: 'DATABASE_URL non configuré ou Pool non initialisé'
  };
}

/**
 * Exécute une fonction dans une transaction PostgreSQL réelle (BEGIN / COMMIT / ROLLBACK)
 */
export async function withTransaction(callback) {
  let client;
  if (!pool) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('🚨 ERREUR CRITIQUE: PostgreSQL non initialisé en environnement de production.');
    }
    return await callback(null);
  }

  try {
    client = await pool.connect();
  } catch (connErr) {
    isPostgresConnected = false;
    if (process.env.NODE_ENV === 'production') {
      throw connErr;
    }
    return await callback(null);
  }

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    isPostgresConnected = true;
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('⚠️ Échec du ROLLBACK PostgreSQL :', rollbackErr.message);
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Indique si PostgreSQL est actuellement configuré et opérationnel
 */
export function isPostgresActive() {
  return isPostgresConnected && pool !== null;
}

/**
 * Exécute une requête SQL directement sur PostgreSQL via le pool
 */
export async function query(text, params = []) {
  if (!pool) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('🚨 ERREUR CRITIQUE: PostgreSQL non initialisé en environnement de production.');
    }
    throw new Error('PostgreSQL non initialisé');
  }

  let client;
  try {
    client = await pool.connect();
  } catch (connErr) {
    isPostgresConnected = false;
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 ERREUR CONNEXION POSTGRESQL (PRODUCTION) :', connErr.message);
      throw connErr;
    }
    throw connErr;
  }

  try {
    const res = await client.query(text, params);
    isPostgresConnected = true;
    return res;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 ERREUR REQUÊTE SQL POSTGRESQL (PRODUCTION) :', err.message, { query: text });
      throw err;
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

export default {
  query,
  withTransaction,
  isPostgresActive,
  checkDbHealth,
  ensureCoreTables,
  ensureAnalyticsEventsTable,
  ensureAdminAccount,
  seedTablesIfEmpty,
  memoryStore,
  pool
};

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
let deliveryPersonsInitialized = false;
let analyticsEventsInitialized = false;
let v2TablesInitialized = false;

// Stockage mémoire de secours (initialisé avec les seeds de démo) pour tests et développement local autonome
export const memoryStore = JSON.parse(JSON.stringify(initialSeedData));
if (!memoryStore.media_uploads) memoryStore.media_uploads = [];
if (!memoryStore.business_profiles) memoryStore.business_profiles = initialSeedData.business_profiles || [];
if (!memoryStore.invoices) memoryStore.invoices = initialSeedData.invoices || [];
if (!memoryStore.invoice_items) memoryStore.invoice_items = initialSeedData.invoice_items || [];
if (!memoryStore.receipts) memoryStore.receipts = initialSeedData.receipts || [];
if (!memoryStore.security_events) memoryStore.security_events = initialSeedData.security_events || [];
if (!memoryStore.security_alerts) memoryStore.security_alerts = initialSeedData.security_alerts || [];
if (!memoryStore.ai_conversations) memoryStore.ai_conversations = initialSeedData.ai_conversations || [];
if (!memoryStore.merchant_verifications) memoryStore.merchant_verifications = [];
if (!memoryStore.early_access_leads) memoryStore.early_access_leads = [];
if (!memoryStore.contact_messages) memoryStore.contact_messages = [];

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

      CREATE TABLE IF NOT EXISTS delivery_persons (
          id TEXT PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'AVAILABLE',
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_delivery_persons_phone ON delivery_persons(phone);
      CREATE INDEX IF NOT EXISTS idx_delivery_persons_status ON delivery_persons(status);

      CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          order_number TEXT UNIQUE NOT NULL,
          buyer_id TEXT NOT NULL,
          merchant_id TEXT NOT NULL,
          delivery_person_id TEXT,
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

      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_person_id TEXT;

      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_delivery_person_id ON orders(delivery_person_id);
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

      -- Extension Marchands & Produits
      ALTER TABLE merchants ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
      ALTER TABLE merchants ADD COLUMN IF NOT EXISTS quartier TEXT;
      ALTER TABLE merchants ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Sénégal';

      ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Dakar';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS quartier TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS location TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'APPROVED';

      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

      -- Table de stockage persistant d'images
      CREATE TABLE IF NOT EXISTS media_uploads (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          data_base64 TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_media_uploads_user_id ON media_uploads(user_id);
      CREATE INDEX IF NOT EXISTS idx_media_uploads_created_at ON media_uploads(created_at DESC);

      CREATE TABLE IF NOT EXISTS merchant_verifications (
          id TEXT PRIMARY KEY,
          merchant_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          legal_business_name TEXT NOT NULL,
          registration_number_ninea TEXT,
          document_type TEXT NOT NULL DEFAULT 'NATIONAL_ID',
          document_url TEXT,
          status TEXT NOT NULL DEFAULT 'PENDING',
          rejection_reason TEXT,
          reviewed_by TEXT,
          reviewed_at TIMESTAMPTZ,
          submitted_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_merchant_verifications_merchant_id ON merchant_verifications(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_merchant_verifications_user_id ON merchant_verifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_merchant_verifications_status ON merchant_verifications(status);
    `);
    coreTablesInitialized = true;
  } catch (err) {
    console.warn('⚠️ Avertissement initialisation non-destructive tables :', err.message);
  }
}

/**
 * Assure la présence non-destructive de la table delivery_persons, de la colonne orders.delivery_person_id et des index
 */
export async function ensureDeliveryPersonsTable(client) {
  if (deliveryPersonsInitialized) return;
  try {
    // 1. Création sécurisée et non-destructive de la table delivery_persons
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_persons (
          id TEXT PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'AVAILABLE',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_delivery_persons_phone ON delivery_persons(phone);
      CREATE INDEX IF NOT EXISTS idx_delivery_persons_status ON delivery_persons(status);
    `);

    // 2. Ajout sécurisé et non-destructif de la colonne delivery_person_id dans la table orders
    await client.query(`
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = 'orders'
          ) AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
                AND table_name = 'orders' 
                AND column_name = 'delivery_person_id'
          ) THEN
              ALTER TABLE orders ADD COLUMN delivery_person_id TEXT;
              CREATE INDEX IF NOT EXISTS idx_orders_delivery_person_id ON orders(delivery_person_id);
          END IF;
      END $$;
    `);

    // 3. Insertion / Mise à jour non-destructive des livreurs de référence (sans doublons)
    await client.query(`
      INSERT INTO delivery_persons (id, first_name, last_name, phone, status, created_at, updated_at)
      VALUES 
        ('d0000000-0000-0000-0000-000000000001', 'Mamadou', 'Diop', '+221778901234', 'AVAILABLE', NOW(), NOW()),
        ('d0000000-0000-0000-0000-000000000002', 'Ibrahima', 'Ndiaye', '+221778901235', 'AVAILABLE', NOW(), NOW())
      ON CONFLICT (phone) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        status = 'AVAILABLE',
        updated_at = NOW();
    `);

    deliveryPersonsInitialized = true;
  } catch (err) {
    console.warn('⚠️ Avertissement initialisation non-destructive delivery_persons :', err.message);
  }
}

/**
 * Assure la présence non-destructive de la table analytics_events et de ses index étendus
 */
export async function ensureAnalyticsEventsTable(client) {
  if (analyticsEventsInitialized) return;

  try {
    // 1. Création de la table de base si non existante
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          user_id TEXT,
          visitor_id TEXT,
          session_id TEXT,
          platform TEXT DEFAULT 'WEB_LANDING',
          page_url TEXT,
          page_title TEXT,
          referrer TEXT,
          utm_source TEXT,
          utm_medium TEXT,
          utm_campaign TEXT,
          utm_term TEXT,
          utm_content TEXT,
          device_type TEXT,
          os TEXT,
          browser TEXT,
          country TEXT,
          city TEXT,
          ip_address TEXT,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Migration ascendante non-destructive si la table existait déjà
    await client.query(`
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS visitor_id TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS page_url TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS page_title TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS referrer TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_source TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_medium TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_term TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_content TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS device_type TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS os TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS browser TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS country TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS city TEXT;
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS ip_address TEXT;
    `);

    // 3. Création des index de performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON analytics_events(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_device_type ON analytics_events(device_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_utm_source ON analytics_events(utm_source);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
    `);

    analyticsEventsInitialized = true;
  } catch (err) {
    console.warn('⚠️ Avertissement initialisation non-destructive analytics_events :', err.message);
  }
}

/**
 * Assure la présence non-destructive de toutes les tables MoneyLink V2 (IA, Shield, Business, Factures & Reçus)
 */
export async function ensureV2Tables(client) {
  if (v2TablesInitialized) return;
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'USER',
          message TEXT NOT NULL,
          intent TEXT DEFAULT 'GENERAL',
          context_data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_intent ON ai_conversations(intent);

      CREATE TABLE IF NOT EXISTS security_events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'LOW',
          risk_score INTEGER NOT NULL DEFAULT 0,
          details JSONB DEFAULT '{}'::jsonb,
          ip_address TEXT,
          status TEXT NOT NULL DEFAULT 'LOGGED',
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
      CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);

      CREATE TABLE IF NOT EXISTS security_alerts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          transaction_id TEXT,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          risk_score INTEGER NOT NULL DEFAULT 0,
          risk_level TEXT NOT NULL DEFAULT 'LOW',
          is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
          action_taken TEXT DEFAULT 'PENDING',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_security_alerts_risk_level ON security_alerts(risk_level);
      CREATE INDEX IF NOT EXISTS idx_security_alerts_is_acknowledged ON security_alerts(is_acknowledged);

      CREATE TABLE IF NOT EXISTS business_profiles (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          merchant_id TEXT,
          business_category TEXT,
          tax_id TEXT,
          currency TEXT DEFAULT 'XOF',
          monthly_target NUMERIC DEFAULT 0.00,
          settings JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_business_profiles_merchant_id ON business_profiles(merchant_id);

      CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          invoice_number TEXT UNIQUE NOT NULL,
          merchant_id TEXT NOT NULL,
          client_id TEXT,
          client_name TEXT NOT NULL,
          client_phone TEXT NOT NULL,
          client_email TEXT,
          client_address TEXT,
          subtotal NUMERIC NOT NULL DEFAULT 0.00,
          discount_amount NUMERIC NOT NULL DEFAULT 0.00,
          total_amount NUMERIC NOT NULL DEFAULT 0.00,
          paid_amount NUMERIC NOT NULL DEFAULT 0.00,
          currency TEXT NOT NULL DEFAULT 'XOF',
          status TEXT NOT NULL DEFAULT 'BROUILLON',
          issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
          due_date DATE,
          notes TEXT,
          share_token TEXT UNIQUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
      CREATE INDEX IF NOT EXISTS idx_invoices_merchant_id ON invoices(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      CREATE INDEX IF NOT EXISTS idx_invoices_share_token ON invoices(share_token);
      CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

      CREATE TABLE IF NOT EXISTS invoice_items (
          id TEXT PRIMARY KEY,
          invoice_id TEXT NOT NULL,
          product_id TEXT,
          description TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price NUMERIC NOT NULL DEFAULT 0.00,
          total_price NUMERIC NOT NULL DEFAULT 0.00,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

      CREATE TABLE IF NOT EXISTS receipts (
          id TEXT PRIMARY KEY,
          receipt_number TEXT UNIQUE NOT NULL,
          invoice_id TEXT,
          order_id TEXT,
          merchant_id TEXT NOT NULL,
          client_id TEXT,
          client_name TEXT NOT NULL,
          client_phone TEXT,
          amount NUMERIC NOT NULL DEFAULT 0.00,
          currency TEXT NOT NULL DEFAULT 'XOF',
          payment_method TEXT NOT NULL DEFAULT 'WAVE',
          transaction_reference TEXT,
          status TEXT NOT NULL DEFAULT 'COMPLETED',
          paid_at TIMESTAMPTZ DEFAULT NOW(),
          share_token TEXT UNIQUE,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);
      CREATE INDEX IF NOT EXISTS idx_receipts_merchant_id ON receipts(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_receipts_order_id ON receipts(order_id);
      CREATE INDEX IF NOT EXISTS idx_receipts_share_token ON receipts(share_token);
      CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);

      CREATE TABLE IF NOT EXISTS early_access_leads (
          id TEXT PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL,
          profile_type TEXT DEFAULT 'PARTICULIER',
          city TEXT NOT NULL,
          notes TEXT,
          status TEXT DEFAULT 'REGISTERED',
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_early_access_phone ON early_access_leads(phone);
      CREATE INDEX IF NOT EXISTS idx_early_access_email ON early_access_leads(email);
      CREATE INDEX IF NOT EXISTS idx_early_access_created_at ON early_access_leads(created_at DESC);

      CREATE TABLE IF NOT EXISTS contact_messages (
          id TEXT PRIMARY KEY,
          ticket_number TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          category TEXT DEFAULT 'SUPPORT',
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'OPEN',
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_contact_messages_ticket ON contact_messages(ticket_number);
      CREATE INDEX IF NOT EXISTS idx_contact_messages_category ON contact_messages(category);
      CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
    `);
    v2TablesInitialized = true;
  } catch (err) {
    console.warn('⚠️ Avertissement initialisation non-destructive tables V2 :', err.message);
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

    for (const dp of (initialSeedData.delivery_persons || [])) {
      await client.query(`
        INSERT INTO delivery_persons (id, first_name, last_name, phone, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        dp.id, dp.first_name, dp.last_name, dp.phone, dp.status || 'AVAILABLE',
        dp.created_at || new Date().toISOString(), dp.updated_at || new Date().toISOString()
      ]);
    }

    for (const o of (initialSeedData.orders || [])) {
      await client.query(`
        INSERT INTO orders (
          id, order_number, buyer_id, merchant_id, delivery_person_id, total_amount, escrow_amount, service_fee,
          status, delivery_code, delivery_code_hash, delivery_address, delivery_phone,
          delivery_notes, paid_at, shipped_at, delivered_at, confirmed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (id) DO NOTHING
      `, [
        o.id, o.order_number, o.buyer_id, o.merchant_id, o.delivery_person_id || null, o.total_amount, o.escrow_amount || 0,
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

    // Seeds V2 : Business Profiles
    for (const bp of (initialSeedData.business_profiles || [])) {
      await client.query(`
        INSERT INTO business_profiles (id, user_id, merchant_id, business_category, tax_id, currency, monthly_target, settings, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [
        bp.id, bp.user_id, bp.merchant_id, bp.business_category, bp.tax_id, bp.currency || 'XOF',
        bp.monthly_target || 0, JSON.stringify(bp.settings || {}), bp.created_at || new Date().toISOString(), bp.updated_at || new Date().toISOString()
      ]);
    }

    // Seeds V2 : Invoices & Invoice Items
    for (const inv of (initialSeedData.invoices || [])) {
      await client.query(`
        INSERT INTO invoices (
          id, invoice_number, merchant_id, client_id, client_name, client_phone, client_email,
          client_address, subtotal, discount_amount, total_amount, paid_amount, currency,
          status, issue_date, due_date, notes, share_token, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (id) DO NOTHING
      `, [
        inv.id, inv.invoice_number, inv.merchant_id, inv.client_id || null, inv.client_name,
        inv.client_phone, inv.client_email || null, inv.client_address || '', inv.subtotal,
        inv.discount_amount || 0, inv.total_amount, inv.paid_amount || 0, inv.currency || 'XOF',
        inv.status || 'BROUILLON', inv.issue_date, inv.due_date || null, inv.notes || '',
        inv.share_token, inv.created_at || new Date().toISOString(), inv.updated_at || new Date().toISOString()
      ]);
    }

    for (const item of (initialSeedData.invoice_items || [])) {
      await client.query(`
        INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, unit_price, total_price, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        item.id, item.invoice_id, item.product_id || null, item.description, item.quantity || 1,
        item.unit_price || 0, item.total_price || 0, item.created_at || new Date().toISOString()
      ]);
    }

    // Seeds V2 : Receipts
    for (const rec of (initialSeedData.receipts || [])) {
      await client.query(`
        INSERT INTO receipts (
          id, receipt_number, invoice_id, order_id, merchant_id, client_id, client_name,
          client_phone, amount, currency, payment_method, transaction_reference, status,
          paid_at, share_token, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO NOTHING
      `, [
        rec.id, rec.receipt_number, rec.invoice_id || null, rec.order_id || null, rec.merchant_id,
        rec.client_id || null, rec.client_name, rec.client_phone || '', rec.amount, rec.currency || 'XOF',
        rec.payment_method || 'WAVE', rec.transaction_reference || '', rec.status || 'COMPLETED',
        rec.paid_at || new Date().toISOString(), rec.share_token, JSON.stringify(rec.metadata || {}),
        rec.created_at || new Date().toISOString()
      ]);
    }

    // Seeds V2 : Security Events & Alerts
    for (const sev of (initialSeedData.security_events || [])) {
      await client.query(`
        INSERT INTO security_events (id, user_id, event_type, severity, risk_score, details, ip_address, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [
        sev.id, sev.user_id, sev.event_type, sev.severity || 'LOW', sev.risk_score || 0,
        JSON.stringify(sev.details || {}), sev.ip_address || null, sev.status || 'LOGGED',
        sev.created_at || new Date().toISOString()
      ]);
    }

    for (const sal of (initialSeedData.security_alerts || [])) {
      await client.query(`
        INSERT INTO security_alerts (id, user_id, transaction_id, title, message, risk_score, risk_level, is_acknowledged, action_taken, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        sal.id, sal.user_id, sal.transaction_id || null, sal.title, sal.message, sal.risk_score || 0,
        sal.risk_level || 'LOW', sal.is_acknowledged || false, sal.action_taken || 'PENDING',
        sal.created_at || new Date().toISOString(), sal.updated_at || new Date().toISOString()
      ]);
    }

    // Seeds V2 : AI Conversations
    for (const aic of (initialSeedData.ai_conversations || [])) {
      await client.query(`
        INSERT INTO ai_conversations (id, user_id, role, message, intent, context_data, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        aic.id, aic.user_id, aic.role, aic.message, aic.intent || 'GENERAL',
        JSON.stringify(aic.context_data || {}), aic.created_at || new Date().toISOString()
      ]);
    }
  } catch (err) {
    console.warn('⚠️ Avertissement injection des seeds PostgreSQL :', err.message);
  }
}

/**
 * Dictionnaire de photos authentiques et haute définition pour les catégories et mots-clés de produits
 */
export const AUTHENTIC_PRODUCT_IMAGES = {
  PHONE: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
  CHARGER: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
  BAG: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
  CLOTHING: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
  DRONE: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&auto=format&fit=crop&q=80',
  HEADPHONES: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
  LAPTOP: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80',
  WATCH: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
  SNEAKERS: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
  FURNITURE: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&auto=format&fit=crop&q=80'
};

/**
 * Détermine l'image authentique correspondant au nom et à la catégorie d'un produit
 */
export function getAuthenticImageForProduct(name = '', category = '', subcategory = '') {
  const text = `${name} ${category} ${subcategory}`.toLowerCase();

  if (text.includes('chargeur') || text.includes('charger') || text.includes('câble') || text.includes('cable') || text.includes('adaptateur')) {
    return AUTHENTIC_PRODUCT_IMAGES.CHARGER;
  }
  if (text.includes('drone') || text.includes('quadricoptère') || text.includes('quadcopter') || text.includes('uav')) {
    return AUTHENTIC_PRODUCT_IMAGES.DRONE;
  }
  if (text.includes('casque') || text.includes('écouteur') || text.includes('ecouteur') || text.includes('headphone') || text.includes('earphone') || text.includes('airpod') || text.includes('audio')) {
    return AUTHENTIC_PRODUCT_IMAGES.HEADPHONES;
  }
  if (text.includes('téléphone') || text.includes('telephone') || text.includes('smartphone') || text.includes('iphone') || text.includes('samsung') || text.includes('xiaomi') || text.includes('redmi')) {
    return AUTHENTIC_PRODUCT_IMAGES.PHONE;
  }
  if (text.includes('sac') || text.includes('bag') || text.includes('valise') || text.includes('sacoche') || text.includes('cartable') || text.includes('backpack')) {
    return AUTHENTIC_PRODUCT_IMAGES.BAG;
  }
  if (text.includes('vêtement') || text.includes('vetement') || text.includes('habit') || text.includes('habille') || text.includes('maillot') || text.includes('t-shirt') || text.includes('tshirt') || text.includes('chemise') || text.includes('pantalon') || text.includes('robe')) {
    return AUTHENTIC_PRODUCT_IMAGES.CLOTHING;
  }
  if (text.includes('ordinateur') || text.includes('laptop') || text.includes('macbook') || text.includes('pc portable') || text.includes('informatique')) {
    return AUTHENTIC_PRODUCT_IMAGES.LAPTOP;
  }
  if (text.includes('montre') || text.includes('watch') || text.includes('smartwatch')) {
    return AUTHENTIC_PRODUCT_IMAGES.WATCH;
  }
  if (text.includes('chaussure') || text.includes('sneaker') || text.includes('basket') || text.includes('nike') || text.includes('adidas') || text.includes('puma')) {
    return AUTHENTIC_PRODUCT_IMAGES.SNEAKERS;
  }
  if (text.includes('lit') || text.includes('meuble') || text.includes('table') || text.includes('chaise') || text.includes('fauteuil') || text.includes('armoire')) {
    return AUTHENTIC_PRODUCT_IMAGES.FURNITURE;
  }

  return null;
}

let productImagesCleaned = false;

/**
 * Assainit et garantit la cohérence des images de tous les produits PostgreSQL & MemoryStore
 */
export async function ensureProductImagesConsistency(client) {
  if (productImagesCleaned) return;
  try {
    // 1. Assurer les 6 produits de référence avec leurs photos officielles
    const refProducts = initialSeedData.products || [];
    for (const p of refProducts) {
      await client.query(`
        INSERT INTO products (
          id, merchant_id, name, description, price, stock, image_url, category, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          image_url = EXCLUDED.image_url,
          category = EXCLUDED.category,
          price = EXCLUDED.price,
          is_active = true,
          updated_at = NOW();
      `, [
        p.id, p.merchant_id, p.name, p.description || '', p.price || 0, p.stock || 0,
        p.image_url || null, p.category || 'Général', p.is_active ?? true
      ]);
    }

    // 2. Vérifier et assainir tous les produits existants dans PostgreSQL
    const allProdsRes = await client.query('SELECT id, name, category, subcategory, image_url FROM products');
    if (allProdsRes?.rows) {
      for (const row of allProdsRes.rows) {
        const img = row.image_url || '';
        const isOldWatchFallback = img.includes('photo-1523275335684-37898b6baf30');
        const isWatchName = (row.name || '').toLowerCase().includes('montre') || (row.category || '').toLowerCase().includes('connecté');
        const authenticImg = getAuthenticImageForProduct(row.name, row.category, row.subcategory);

        // Si le produit avait l'ancienne montre alors qu'il n'est pas une montre : corriger !
        if (isOldWatchFallback && !isWatchName) {
          const newImg = authenticImg || null;
          await client.query('UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2', [newImg, row.id]);
        }
        // Si le produit est un chargeur et a une image erronée (drone ou montre)
        else if ((row.name || '').toLowerCase().includes('chargeur') && (!img || isOldWatchFallback || img.includes('drone'))) {
          await client.query('UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2', [AUTHENTIC_PRODUCT_IMAGES.CHARGER, row.id]);
        }
        // Si le produit est un drone et n'a pas d'image ou montre
        else if ((row.name || '').toLowerCase().includes('drone') && (!img || isOldWatchFallback)) {
          await client.query('UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2', [AUTHENTIC_PRODUCT_IMAGES.DRONE, row.id]);
        }
      }
    }

    // 3. Aligner également le memoryStore
    if (memoryStore.products) {
      for (const p of memoryStore.products) {
        const isOldWatchFallback = (p.image_url || '').includes('photo-1523275335684-37898b6baf30');
        const isWatchName = (p.name || '').toLowerCase().includes('montre') || (p.category || '').toLowerCase().includes('connecté');
        const authenticImg = getAuthenticImageForProduct(p.name, p.category, p.subcategory);

        if (isOldWatchFallback && !isWatchName) {
          p.image_url = authenticImg || null;
        } else if ((p.name || '').toLowerCase().includes('chargeur') && (!p.image_url || isOldWatchFallback || (p.image_url || '').includes('drone'))) {
          p.image_url = AUTHENTIC_PRODUCT_IMAGES.CHARGER;
        } else if ((p.name || '').toLowerCase().includes('drone') && (!p.image_url || isOldWatchFallback)) {
          p.image_url = AUTHENTIC_PRODUCT_IMAGES.DRONE;
        }
      }
    }

    productImagesCleaned = true;
  } catch (err) {
    console.warn('⚠️ Avertissement assainissement des images produits :', err.message);
  }
}

/**
 * Assainit, déduplique et protège le catalogue de produits dans PostgreSQL et memoryStore.
 * Conserve scrupuleusement les vrais produits des marchands et les 6 fiches officielles.
 * Supprime/désactive les doublons techniques et les artefacts de tests.
 */
export async function ensureCatalogCleanAndDeduplicated(client) {
  const stats = {
    testProductsRemoved: 0,
    technicalDuplicatesRemoved: 0,
    productsKept: 0,
    realProductsPreserved: 0
  };

  try {
    if (client) {
      // 1. Assurer la présence des 6 produits de référence avec leurs données et images exactes
      const refProducts = initialSeedData.products || [];
      for (const p of refProducts) {
        await client.query(`
          INSERT INTO products (
            id, merchant_id, name, description, price, stock, image_url, category, is_active, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'APPROVED', NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            merchant_id = EXCLUDED.merchant_id,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            stock = EXCLUDED.stock,
            image_url = EXCLUDED.image_url,
            category = EXCLUDED.category,
            is_active = true,
            status = 'APPROVED',
            updated_at = NOW();
        `, [
          p.id, p.merchant_id, p.name, p.description || '', p.price || 0, p.stock || 0,
          p.image_url || null, p.category || 'Général'
        ]);
      }

      // 2. Identifier les produits de test créés par les scripts automatisés
      const testProdsRes = await client.query(`
        SELECT p.id, p.name, p.merchant_id, m.business_name, u.email
        FROM products p
        LEFT JOIN merchants m ON p.merchant_id = m.id
        LEFT JOIN users u ON m.user_id = u.id
        WHERE p.id NOT LIKE 'p0000000-%'
          AND (
            p.name ILIKE '%Live 178%'
            OR p.name ILIKE '%Live 179%'
            OR p.name ILIKE '%Pro 17880%'
            OR p.name ILIKE '%Pro 17881%'
            OR p.name ILIKE '%Test 178%'
            OR u.email ILIKE 'live.images%@moneylink.sn'
            OR u.email ILIKE 'marchand.live.%@moneylink.sn'
            OR u.email ILIKE 'prod.merchant.%@moneylink.sn'
            OR u.email ILIKE 'test.merchant%@moneylink.sn'
            OR u.email ILIKE 'fall.tech%@moneylink.sn'
            OR u.email ILIKE 'seck.tech%@moneylink.sn'
            OR u.email ILIKE 'ndiaye.tech%@moneylink.sn'
            OR u.email ILIKE 'test.instant%@moneylink.sn'
            OR u.email ILIKE 'test.journey%@moneylink.sn'
            OR u.email ILIKE '%@moneylink-test.sn'
            OR u.email ILIKE '%_178806%@test.sn'
          )
      `);

      if (testProdsRes?.rows?.length > 0) {
        const testIds = testProdsRes.rows.map(r => r.id);
        // Supprimer des order_items uniquement si non liés à des commandes confirmées
        await client.query(`
          DELETE FROM order_items 
          WHERE product_id = ANY($1::text[])
            AND order_id NOT IN (SELECT id FROM orders WHERE status IN ('SHIPPED', 'CONFIRMED', 'DELIVERED', 'DISPUTED'))
        `, [testIds]).catch(() => {});

        const delRes = await client.query(`
          DELETE FROM products WHERE id = ANY($1::text[])
        `, [testIds]);

        stats.testProductsRemoved += delRes.rowCount || testIds.length;
      }

      // 3. Déduplication technique exacte : si un commerçant a plusieurs produits identiques avec le même nom
      const duplicateProdsRes = await client.query(`
        SELECT id, merchant_id, LOWER(TRIM(name)) AS norm_name, created_at,
               ROW_NUMBER() OVER (PARTITION BY merchant_id, LOWER(TRIM(name)) ORDER BY created_at ASC, id ASC) as row_num
        FROM products
        WHERE is_active = true
      `);

      if (duplicateProdsRes?.rows) {
        const dupIds = duplicateProdsRes.rows
          .filter(r => parseInt(r.row_num, 10) > 1)
          .map(r => r.id);

        if (dupIds.length > 0) {
          await client.query(`
            DELETE FROM order_items 
            WHERE product_id = ANY($1::text[])
              AND order_id NOT IN (SELECT id FROM orders WHERE status IN ('SHIPPED', 'CONFIRMED', 'DELIVERED', 'DISPUTED'))
          `, [dupIds]).catch(() => {});

          const dupDel = await client.query(`
            DELETE FROM products WHERE id = ANY($1::text[])
          `, [dupIds]);

          stats.technicalDuplicatesRemoved += dupDel.rowCount || dupIds.length;
        }
      }

      // 4. Nettoyer les marchands de test orphelins (sans vraies commandes)
      await client.query(`
        DELETE FROM merchants
        WHERE id IN (
          SELECT m.id FROM merchants m
          JOIN users u ON m.user_id = u.id
          WHERE (
            u.email ILIKE 'live.images%@moneylink.sn'
            OR u.email ILIKE 'marchand.live.%@moneylink.sn'
            OR u.email ILIKE 'prod.merchant.%@moneylink.sn'
            OR u.email ILIKE 'test.merchant%@moneylink.sn'
            OR u.email ILIKE 'fall.tech%@moneylink.sn'
            OR u.email ILIKE 'seck.tech%@moneylink.sn'
            OR u.email ILIKE 'ndiaye.tech%@moneylink.sn'
            OR u.email ILIKE 'test.instant%@moneylink.sn'
            OR u.email ILIKE 'test.journey%@moneylink.sn'
            OR u.email ILIKE '%@moneylink-test.sn'
            OR u.email ILIKE '%_178806%@test.sn'
          )
          AND m.id NOT IN (SELECT merchant_id FROM orders WHERE status IN ('SHIPPED', 'CONFIRMED', 'DELIVERED', 'DISPUTED'))
        )
      `).catch(() => {});

      // 5. Compter les produits restants et valider la préservation des vrais produits
      const countRes = await client.query(`
        SELECT COUNT(*) as total FROM products WHERE is_active = true AND (status = 'APPROVED' OR status IS NULL)
      `);
      stats.productsKept = parseInt(countRes.rows[0]?.total || '0', 10);

      const realProdsRes = await client.query(`
        SELECT COUNT(*) as total FROM products 
        WHERE id NOT LIKE 'p0000000-%' AND is_active = true
      `);
      stats.realProductsPreserved = parseInt(realProdsRes.rows[0]?.total || '0', 10);
    }

    // 6. Déduplication et assainissement dans memoryStore
    if (memoryStore.products) {
      memoryStore.products = memoryStore.products.filter(p => {
        const isRef = p.id.startsWith('p0000000-');
        const isTestName = (p.name || '').includes('Live 178') || (p.name || '').includes('Pro 1788') || (p.name || '').includes('Test 178');
        return isRef || !isTestName;
      });

      const seen = new Set();
      const cleanMemProducts = [];
      for (const p of memoryStore.products) {
        const key = `${p.merchant_id}_${(p.name || '').trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          cleanMemProducts.push(p);
        }
      }
      memoryStore.products = cleanMemProducts;

      if (!client) {
        stats.productsKept = memoryStore.products.filter(p => p.is_active).length;
        stats.realProductsPreserved = memoryStore.products.filter(p => !p.id.startsWith('p0000000-') && p.is_active).length;
      }
    }
  } catch (err) {
    console.warn('⚠️ Avertissement lors de la déduplication du catalogue :', err.message);
  }

  return stats;
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
        await ensureDeliveryPersonsTable(client);
        await ensureAnalyticsEventsTable(client);
        await ensureV2Tables(client);
        await ensureAdminAccount(client);
        await seedTablesIfEmpty(client);
        await ensureProductImagesConsistency(client);
        await ensureCatalogCleanAndDeduplicated(client);

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
  ensureDeliveryPersonsTable,
  ensureAnalyticsEventsTable,
  ensureV2Tables,
  ensureAdminAccount,
  seedTablesIfEmpty,
  ensureProductImagesConsistency,
  ensureCatalogCleanAndDeduplicated,
  memoryStore,
  pool
};

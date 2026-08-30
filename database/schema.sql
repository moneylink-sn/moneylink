-- ============================================================================
-- MONEYLINK — SCHÉMA DE BASE DE DONNÉES RELATIONNELLE (PostgreSQL 15+)
-- Marché Sénégal & UEMOA (Monnaie : FCFA / XOF)
-- Système de paiement sécurisé, séquestre (escrow), commandes, abonnements & épargne
-- ============================================================================

-- Activation des extensions pour UUID et cryptographie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Nettoyage si nécessaire (en environnement de dev/migration)
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS loyalty_transactions CASCADE;
DROP TABLE IF EXISTS loyalty_programs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS savings_contributions CASCADE;
DROP TABLE IF EXISTS savings_members CASCADE;
DROP TABLE IF EXISTS savings_goals CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS delivery_persons CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ----------------------------------------------------------------------------
-- 1. TABLE : USERS (Utilisateurs de la plateforme)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(30) UNIQUE NOT NULL, -- Format standardisé : +221770000000
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'CLIENT' CHECK (role IN ('CLIENT', 'MERCHANT', 'ADMIN')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION')),
    avatar_url TEXT,
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'TRIAL' CHECK (subscription_status IN ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED')),
    subscription_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subscription_end_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    subscription_price NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    is_trial BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);

-- ----------------------------------------------------------------------------
-- 2. TABLE : WALLETS (Portefeuilles & Comptabilité en partie double)
-- ----------------------------------------------------------------------------
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    available_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    locked_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (locked_balance >= 0), -- Fonds bloqués en séquestre
    currency VARCHAR(5) NOT NULL DEFAULT 'XOF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- ----------------------------------------------------------------------------
-- 3. TABLE : MERCHANTS (Profils Commerçants / Vendeurs)
-- ----------------------------------------------------------------------------
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL, -- Ex: 'Électronique', 'Mode & Beauté', 'Restauration'
    description TEXT,
    address TEXT NOT NULL,
    quartier VARCHAR(150),
    city VARCHAR(100) NOT NULL DEFAULT 'Dakar',
    country VARCHAR(100) NOT NULL DEFAULT 'Sénégal',
    phone VARCHAR(30),
    whatsapp_phone VARCHAR(30),
    logo_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchants_user_id ON merchants(user_id);
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_city ON merchants(city);

-- ----------------------------------------------------------------------------
-- 4. TABLE : PRODUCTS (Catalogue Produits / Services)
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0), -- Montant en FCFA
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Dakar',
    quartier VARCHAR(150),
    location VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_merchant_id ON products(merchant_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_is_active ON products(is_active);

-- ----------------------------------------------------------------------------
-- 4b. TABLE : MEDIA_UPLOADS (Stockage d'Images Persistant)
-- ----------------------------------------------------------------------------
CREATE TABLE media_uploads (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL,
    data_base64 TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_uploads_user_id ON media_uploads(user_id);
CREATE INDEX idx_media_uploads_created_at ON media_uploads(created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. TABLE : DELIVERY_PERSONS (Livreurs & Coursiers Partenaires)
-- ----------------------------------------------------------------------------
CREATE TABLE delivery_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BUSY', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_persons_phone ON delivery_persons(phone);
CREATE INDEX idx_delivery_persons_status ON delivery_persons(status);

-- ----------------------------------------------------------------------------
-- 6. TABLE : ORDERS (Commandes & Cycle de Séquestre Escrow)
-- ----------------------------------------------------------------------------
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL, -- Ex: ML-20260824-001
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
    delivery_person_id UUID REFERENCES delivery_persons(id) ON DELETE SET NULL,
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount > 0),
    escrow_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    service_fee NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (
        status IN (
            'PENDING_PAYMENT',
            'PAYMENT_CONFIRMED',
            'PROCESSING',
            'SHIPPED',
            'DELIVERED',
            'CONFIRMED',
            'CANCELLED',
            'DISPUTED',
            'REFUNDED'
        )
    ),
    delivery_code_hash VARCHAR(255), -- Hash sécurisé du code OTP à 6 chiffres
    delivery_address TEXT NOT NULL,
    delivery_phone VARCHAR(30) NOT NULL,
    delivery_notes TEXT,
    paid_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX idx_orders_delivery_person_id ON orders(delivery_person_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ----------------------------------------------------------------------------
-- 6. TABLE : ORDER_ITEMS (Lignes de commande)
-- ----------------------------------------------------------------------------
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(14, 2) NOT NULL CHECK (total_price >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ----------------------------------------------------------------------------
-- 7. TABLE : TRANSACTIONS (Mouvements Financiers & Traçabilité)
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(64) UNIQUE NOT NULL, -- Ex: TXN-2026-948102
    idempotency_key VARCHAR(128) UNIQUE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (
        type IN (
            'ESCROW_LOCK',
            'ESCROW_RELEASE',
            'ESCROW_REFUND',
            'DEPOSIT',
            'WITHDRAWAL',
            'SUBSCRIPTION_PAYMENT',
            'SAVINGS_DEPOSIT',
            'TRANSFER'
        )
    ),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    fee NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(5) NOT NULL DEFAULT 'XOF',
    payment_method VARCHAR(30) NOT NULL CHECK (
        payment_method IN (
            'WAVE',
            'ORANGE_MONEY',
            'FREE_MONEY',
            'WAVE_SN',
            'ORANGE_MONEY_SN',
            'WAVE_MOCK',
            'OM_MOCK',
            'FREE_MOCK',
            'WALLET',
            'CARD'
        )
    ),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_sender_id ON transactions(sender_id);
CREATE INDEX idx_transactions_receiver_id ON transactions(receiver_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- ----------------------------------------------------------------------------
-- 8. TABLE : SUBSCRIPTIONS (Abonnements & Facturation 500 FCFA/mois)
-- ----------------------------------------------------------------------------
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(100) NOT NULL DEFAULT 'MoneyLink Premium',
    amount NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    currency VARCHAR(5) NOT NULL DEFAULT 'XOF',
    status VARCHAR(20) NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED')),
    is_trial BOOLEAN NOT NULL DEFAULT TRUE,
    payment_method VARCHAR(30), -- 'WAVE', 'ORANGE_MONEY', 'FREE_MONEY', 'WALLET'
    payment_reference VARCHAR(100),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ----------------------------------------------------------------------------
-- 9. TABLE : SAVINGS_GOALS (Coffres d'Épargne MoneyLink)
-- ----------------------------------------------------------------------------
CREATE TABLE savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (current_amount >= 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'PERSONAL' CHECK (type IN ('PERSONAL', 'COLLECTIVE')),
    frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'FLEXIBLE')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'BROKEN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_savings_goals_owner_id ON savings_goals(owner_id);
CREATE INDEX idx_savings_goals_type ON savings_goals(type);
CREATE INDEX idx_savings_goals_status ON savings_goals(status);

-- ----------------------------------------------------------------------------
-- 10. TABLE : SAVINGS_MEMBERS (Participants aux Coffres Collectifs / Tontines)
-- ----------------------------------------------------------------------------
CREATE TABLE savings_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    savings_goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'CONTRIBUTOR' CHECK (role IN ('CREATOR', 'CONTRIBUTOR')),
    total_contributed NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_contributed >= 0),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (savings_goal_id, user_id)
);

CREATE INDEX idx_savings_members_goal_id ON savings_members(savings_goal_id);
CREATE INDEX idx_savings_members_user_id ON savings_members(user_id);

-- ----------------------------------------------------------------------------
-- 11. TABLE : SAVINGS_CONTRIBUTIONS (Historique des versements d'épargne)
-- ----------------------------------------------------------------------------
CREATE TABLE savings_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    savings_goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_savings_contributions_goal_id ON savings_contributions(savings_goal_id);
CREATE INDEX idx_savings_contributions_user_id ON savings_contributions(user_id);

-- ----------------------------------------------------------------------------
-- 12. TABLE : DISPUTES (Gestion des Litiges et Arbitrages)
-- ----------------------------------------------------------------------------
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason VARCHAR(50) NOT NULL CHECK (
        reason IN ('NOT_RECEIVED', 'DAMAGED', 'WRONG_ITEM', 'FRAUD', 'OTHER')
    ),
    description TEXT NOT NULL,
    evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'OPENED' CHECK (
        status IN (
            'OPENED',
            'IN_INVESTIGATION',
            'REFUNDED_BUYER',
            'RELEASED_MERCHANT',
            'REJECTED'
        )
    ),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_order_id ON disputes(order_id);
CREATE INDEX idx_disputes_opened_by ON disputes(opened_by);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ----------------------------------------------------------------------------
-- 13. TABLE : NOTIFICATIONS (Alertes Push, SMS & WhatsApp)
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (
        type IN (
            'PAYMENT',
            'ORDER_STATUS',
            'DELIVERY_CONFIRMATION',
            'DISPUTE',
            'SAVINGS_REMINDER',
            'SECURITY',
            'SYSTEM'
        )
    ),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    channel VARCHAR(20) NOT NULL DEFAULT 'PUSH' CHECK (channel IN ('PUSH', 'SMS', 'WHATSAPP', 'EMAIL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ----------------------------------------------------------------------------
-- 14. TABLE : LOYALTY_PROGRAMS (Programmes de Fidélité Commerçant)
-- ----------------------------------------------------------------------------
CREATE TABLE loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL UNIQUE REFERENCES merchants(id) ON DELETE CASCADE,
    points_per_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.01, -- Ex: 1000 FCFA = 10 points (0.01)
    min_points_redemption INTEGER NOT NULL DEFAULT 100,
    reward_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_programs_merchant ON loyalty_programs(merchant_id);

-- ----------------------------------------------------------------------------
-- 15. TABLE : LOYALTY_TRANSACTIONS (Historique des Points)
-- ----------------------------------------------------------------------------
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    points_change INTEGER NOT NULL, -- Positif pour gain, négatif pour utilisation
    type VARCHAR(20) NOT NULL CHECK (type IN ('EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loyalty_transactions_user ON loyalty_transactions(user_id);
CREATE INDEX idx_loyalty_transactions_merchant ON loyalty_transactions(merchant_id);

-- ----------------------------------------------------------------------------
-- 16. TABLE : AUDIT_LOGS (Journal de Sécurité & Traçabilité Admin)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- Ex: 'ORDER_DISPUTE_RESOLVED', 'ESCROW_FORCE_RELEASE'
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 17. TABLE : ANALYTICS_EVENTS (Collecte & Statistiques d'Utilisation / Visiteurs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- 'PAGE_VIEW', 'VISIT', 'SESSION_START', 'PRODUCT_VIEW', 'SEARCH', 'ADD_TO_CART', 'REMOVE_FROM_CART', 'WHATSAPP_CLICK', 'REGISTER', 'LOGIN', 'ORDER_CREATED', 'ORDER_CONFIRMED', 'HEARTBEAT'
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    visitor_id VARCHAR(100),
    session_id VARCHAR(100),
    platform VARCHAR(30) NOT NULL DEFAULT 'WEB_LANDING', -- 'WEB_LANDING', 'WEB_ADMIN', 'MOBILE_APP'
    page_url TEXT,
    page_title VARCHAR(255),
    referrer TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_term VARCHAR(100),
    utm_content VARCHAR(100),
    device_type VARCHAR(30), -- 'MOBILE', 'DESKTOP', 'TABLET'
    os VARCHAR(50), -- 'Android', 'iOS', 'Windows', 'macOS', 'Linux', 'Other'
    browser VARCHAR(50), -- 'Chrome', 'Safari', 'Firefox', 'Edge', 'Opera', 'WhatsApp', 'Other'
    country VARCHAR(100),
    city VARCHAR(100),
    ip_address VARCHAR(45),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_events_device_type ON analytics_events(device_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_utm_source ON analytics_events(utm_source);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- ----------------------------------------------------------------------------
-- 18. FONCTIONS & TRIGGERS POUR LA GESTION AUTOMATIQUE DE updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_merchants_updated_at BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_delivery_persons_updated_at BEFORE UPDATE ON delivery_persons FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_savings_goals_updated_at BEFORE UPDATE ON savings_goals FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_loyalty_programs_updated_at BEFORE UPDATE ON loyalty_programs FOR EACH ROW EXECUTE FUNCTION update_timestamp();

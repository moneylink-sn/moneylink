-- ============================================================================
-- MONEYLINK — SCHÉMA SQLITE (Pour développement local portable rapide)
-- Compatible 1:1 avec le modèle PostgreSQL de production
-- ============================================================================

DROP TABLE IF EXISTS analytics_events;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS loyalty_transactions;
DROP TABLE IF EXISTS loyalty_programs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS disputes;
DROP TABLE IF EXISTS savings_contributions;
DROP TABLE IF EXISTS savings_members;
DROP TABLE IF EXISTS savings_goals;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS merchants;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CLIENT' CHECK (role IN ('CLIENT', 'MERCHANT', 'ADMIN')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION')),
    avatar_url TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'TRIAL' CHECK (subscription_status IN ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED')),
    subscription_start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    subscription_end_date DATETIME,
    subscription_price REAL NOT NULL DEFAULT 500.0,
    is_trial INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    available_balance REAL NOT NULL DEFAULT 0.0 CHECK (available_balance >= 0),
    locked_balance REAL NOT NULL DEFAULT 0.0 CHECK (locked_balance >= 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE merchants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Dakar',
    phone TEXT,
    logo_url TEXT,
    is_verified INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT,
    category TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_persons (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    buyer_id TEXT NOT NULL REFERENCES users(id),
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    delivery_person_id TEXT REFERENCES delivery_persons(id),
    total_amount REAL NOT NULL CHECK (total_amount > 0),
    escrow_amount REAL NOT NULL DEFAULT 0.0,
    service_fee REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    delivery_code_hash TEXT,
    delivery_address TEXT NOT NULL,
    delivery_phone TEXT NOT NULL,
    delivery_notes TEXT,
    paid_at DATETIME,
    shipped_at DATETIME,
    delivered_at DATETIME,
    confirmed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    total_price REAL NOT NULL CHECK (total_price >= 0)
);

CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    idempotency_key TEXT UNIQUE,
    sender_id TEXT REFERENCES users(id),
    receiver_id TEXT REFERENCES users(id),
    order_id TEXT REFERENCES orders(id),
    type TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    fee REAL NOT NULL DEFAULT 0.0,
    currency TEXT NOT NULL DEFAULT 'XOF',
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL DEFAULT 'MoneyLink Premium',
    amount REAL NOT NULL DEFAULT 500.0,
    currency TEXT NOT NULL DEFAULT 'XOF',
    status TEXT NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED')),
    is_trial INTEGER NOT NULL DEFAULT 1,
    payment_method TEXT,
    payment_reference TEXT,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE savings_goals (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_amount REAL NOT NULL CHECK (target_amount > 0),
    current_amount REAL NOT NULL DEFAULT 0.0 CHECK (current_amount >= 0),
    start_date DATE DEFAULT CURRENT_DATE,
    target_date DATE NOT NULL,
    type TEXT NOT NULL DEFAULT 'PERSONAL',
    frequency TEXT NOT NULL DEFAULT 'MONTHLY',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE savings_members (
    id TEXT PRIMARY KEY,
    savings_goal_id TEXT NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'CONTRIBUTOR',
    total_contributed REAL NOT NULL DEFAULT 0.0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (savings_goal_id, user_id)
);

CREATE TABLE savings_contributions (
    id TEXT PRIMARY KEY,
    savings_goal_id TEXT NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    transaction_id TEXT REFERENCES transactions(id),
    amount REAL NOT NULL CHECK (amount > 0),
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disputes (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    opened_by TEXT NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'OPENED',
    resolution_notes TEXT,
    resolved_by TEXT REFERENCES users(id),
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT DEFAULT '{}',
    is_read INTEGER NOT NULL DEFAULT 0,
    channel TEXT NOT NULL DEFAULT 'PUSH',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loyalty_programs (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL UNIQUE REFERENCES merchants(id) ON DELETE CASCADE,
    points_per_amount REAL NOT NULL DEFAULT 0.01,
    min_points_redemption INTEGER NOT NULL DEFAULT 100,
    reward_discount_percent REAL NOT NULL DEFAULT 5.0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loyalty_transactions (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES orders(id),
    points_change INTEGER NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    previous_state TEXT,
    new_state TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analytics_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    session_id TEXT,
    platform TEXT NOT NULL DEFAULT 'WEB_LANDING',
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- ============================================================================
-- MONEYLINK V2 — TABLES INNOVANTES (SQLite)
-- ============================================================================

CREATE TABLE ai_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'USER',
    message TEXT NOT NULL,
    intent TEXT DEFAULT 'GENERAL',
    context_data TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

CREATE TABLE security_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'LOW',
    risk_score INTEGER NOT NULL DEFAULT 0,
    details TEXT DEFAULT '{}',
    ip_address TEXT,
    status TEXT NOT NULL DEFAULT 'LOGGED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);

CREATE TABLE security_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'LOW',
    is_acknowledged INTEGER NOT NULL DEFAULT 0,
    action_taken TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX idx_security_alerts_is_acknowledged ON security_alerts(is_acknowledged);

CREATE TABLE business_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    merchant_id TEXT REFERENCES merchants(id) ON DELETE CASCADE,
    business_category TEXT,
    tax_id TEXT,
    currency TEXT DEFAULT 'XOF',
    monthly_target REAL DEFAULT 0.0,
    settings TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_business_profiles_user_id ON business_profiles(user_id);

CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES users(id),
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    client_address TEXT,
    subtotal REAL NOT NULL DEFAULT 0.0,
    discount_amount REAL NOT NULL DEFAULT 0.0,
    total_amount REAL NOT NULL DEFAULT 0.0,
    paid_amount REAL NOT NULL DEFAULT 0.0,
    currency TEXT NOT NULL DEFAULT 'XOF',
    status TEXT NOT NULL DEFAULT 'BROUILLON',
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    notes TEXT,
    share_token TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_merchant_id ON invoices(merchant_id);
CREATE INDEX idx_invoices_share_token ON invoices(share_token);

CREATE TABLE invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0.0,
    total_price REAL NOT NULL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

CREATE TABLE receipts (
    id TEXT PRIMARY KEY,
    receipt_number TEXT UNIQUE NOT NULL,
    invoice_id TEXT REFERENCES invoices(id),
    order_id TEXT REFERENCES orders(id),
    merchant_id TEXT NOT NULL REFERENCES merchants(id),
    client_id TEXT REFERENCES users(id),
    client_name TEXT NOT NULL,
    client_phone TEXT,
    amount REAL NOT NULL DEFAULT 0.0,
    currency TEXT NOT NULL DEFAULT 'XOF',
    payment_method TEXT NOT NULL DEFAULT 'WAVE',
    transaction_reference TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    share_token TEXT UNIQUE,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX idx_receipts_merchant_id ON receipts(merchant_id);
CREATE INDEX idx_receipts_share_token ON receipts(share_token);


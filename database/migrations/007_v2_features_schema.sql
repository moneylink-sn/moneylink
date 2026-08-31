-- ============================================================================
-- MONEYLINK V2 — MIGRATION 007 : NOUVELLES FONCTIONNALITÉS INNOVANTES
-- IA, Shield (Sécurité & Scoring), Business, Factures & Reçus, i18n
-- ============================================================================

-- 1. Table des conversations et requêtes MoneyLink IA
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

-- 2. Tables de sécurité MoneyLink Shield (Événements & Alertes de scoring)
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

-- 3. Table des profils enrichis MoneyLink Business
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

-- 4. Table des Factures MoneyLink (Invoices)
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

-- 5. Table des Lignes de Facture (Invoice Items)
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

-- 6. Table des Reçus Numériques Officiels MoneyLink (Receipts)
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

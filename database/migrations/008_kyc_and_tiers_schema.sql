-- ============================================================================
-- MONEYLINK V2.5 — MIGRATION 008 : ONBOARDING & KYC TIERS ARCHITECTURE
-- Gestion de l'onboarding échelonné : USER -> CUSTOMER -> MERCHANT -> VERIFIED MERCHANT
-- Statuts : PENDING, VERIFIED, REJECTED, SUSPENDED
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_verifications (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    legal_business_name TEXT NOT NULL,
    registration_number_ninea TEXT,
    document_type TEXT NOT NULL DEFAULT 'NATIONAL_ID', -- 'NATIONAL_ID', 'PASSPORT', 'COMMERCE_REGISTER'
    document_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'
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
CREATE INDEX IF NOT EXISTS idx_merchant_verifications_submitted_at ON merchant_verifications(submitted_at DESC);

-- ============================================================================
-- MONEYLINK — MIGRATION 005 : EXTENSION ESPACE MARCHAND & STOCKAGE MÉDIAS
-- ============================================================================

-- 1. Extension de la table MERCHANTS
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(30);
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS quartier VARCHAR(150);
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Sénégal';

-- 2. Extension de la table PRODUCTS
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Dakar';
ALTER TABLE products ADD COLUMN IF NOT EXISTS quartier VARCHAR(150);
ALTER TABLE products ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_city ON products(city);

-- 3. Création de la table MEDIA_UPLOADS pour la persistance 100% PostgreSQL sur Render
CREATE TABLE IF NOT EXISTS media_uploads (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    data_base64 TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_uploads_user_id ON media_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_created_at ON media_uploads(created_at DESC);

-- ============================================================================
-- MONEYLINK MIGRATION 004: CREATE TABLE DELIVERY_PERSONS (NON-DESTRUCTIVE)
-- Marché Sénégal & UEMOA (Monnaie : FCFA / XOF)
-- Gestion des livreurs, affectation aux commandes et traçabilité de livraison
-- ============================================================================

-- 1. Activation des extensions cryptographiques et UUID nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Création sécurisée et non-destructive de la table delivery_persons
CREATE TABLE IF NOT EXISTS delivery_persons (
    id TEXT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BUSY', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Création des index pour delivery_persons
CREATE INDEX IF NOT EXISTS idx_delivery_persons_phone ON delivery_persons(phone);
CREATE INDEX IF NOT EXISTS idx_delivery_persons_status ON delivery_persons(status);

-- 4. Ajout sécurisé et non-destructif de la colonne delivery_person_id dans la table orders
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

-- 5. Trigger updated_at pour delivery_persons
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_delivery_persons_updated_at') THEN
        CREATE TRIGGER trg_delivery_persons_updated_at BEFORE UPDATE ON delivery_persons FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    END IF;
END $$;

-- 6. Insertion / Mise à jour non-destructive des livreurs de référence (UUIDs valides RFC 4122 / PostgreSQL)
INSERT INTO delivery_persons (id, first_name, last_name, phone, status, created_at, updated_at)
VALUES 
  ('d0000000-0000-0000-0000-000000000001', 'Mamadou', 'Diop', '+221778901234', 'AVAILABLE', NOW(), NOW()),
  ('d0000000-0000-0000-0000-000000000002', 'Ibrahima', 'Ndiaye', '+221778901235', 'AVAILABLE', NOW(), NOW())
ON CONFLICT (phone) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  status = 'AVAILABLE',
  updated_at = NOW();

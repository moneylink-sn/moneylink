-- ============================================================================
-- MONEYLINK MIGRATION 001: CREATE TABLE ANALYTICS_EVENTS (NON-DESTRUCTIVE)
-- Marché Sénégal & UEMOA (Monnaie : FCFA / XOF)
-- Collecte et agrégation des statistiques réelles (visiteurs, paiements, conversions)
-- ============================================================================

-- 1. Activation des extensions cryptographiques et UUID nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Création sécurisée et non-destructive de la table analytics_events
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    platform VARCHAR(30) NOT NULL DEFAULT 'WEB_LANDING',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Création des index de performance pour requêtes analytiques rapides
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

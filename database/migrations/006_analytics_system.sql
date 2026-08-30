-- ============================================================================
-- MONEYLINK — MIGRATION 006 : SYSTÈME ANALYTICS & STATISTIQUES RÉELLES
-- Table analytics_events enrichie avec visiteurs uniques, appareils, sources et géographie
-- ============================================================================

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

-- Colonnes additionnelles si la table existait déjà
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

-- Index de performance optimisés pour les requêtes d'agrégation analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_events_device_type ON analytics_events(device_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_utm_source ON analytics_events(utm_source);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

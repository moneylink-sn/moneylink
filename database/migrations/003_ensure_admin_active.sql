-- ============================================================================
-- MONEYLINK MIGRATION 003: ENSURE ACTIVE ADMIN ACCOUNT (NON-DESTRUCTIVE)
-- Marché Sénégal & UEMOA (Monnaie : FCFA / XOF)
-- Assure l'existence, le rôle ADMIN et le statut ACTIVE du compte administrateur
-- ============================================================================

-- 1. Activation des extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Insertion ou mise à jour non-destructive du super-administrateur (Codé Samb)
-- Hash Bcrypt pour "Password123!" : $2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE LOWER(email) = 'admin@moneylink.sn' OR phone = '+221770000001' OR id = 'a0000000-0000-0000-0000-000000000001') THEN
    UPDATE users
    SET role = 'ADMIN',
        status = 'ACTIVE',
        password_hash = '$2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2',
        email = 'admin@moneylink.sn',
        phone = '+221770000001',
        first_name = 'Codé',
        last_name = 'Samb',
        subscription_status = 'ACTIVE',
        is_trial = FALSE,
        updated_at = NOW()
    WHERE LOWER(email) = 'admin@moneylink.sn' OR phone = '+221770000001' OR id = 'a0000000-0000-0000-0000-000000000001';
  ELSE
    INSERT INTO users (
      id,
      phone,
      email,
      first_name,
      last_name,
      password_hash,
      role,
      status,
      avatar_url,
      subscription_status,
      subscription_price,
      is_trial,
      created_at,
      updated_at
    ) VALUES (
      'a0000000-0000-0000-0000-000000000001',
      '+221770000001',
      'admin@moneylink.sn',
      'Codé',
      'Samb',
      '$2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2',
      'ADMIN',
      'ACTIVE',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      'ACTIVE',
      500.00,
      FALSE,
      NOW(),
      NOW()
    );
  END IF;

  -- 3. Assurer que le portefeuille administrateur existe
  INSERT INTO wallets (
      id,
      user_id,
      available_balance,
      locked_balance,
      currency,
      created_at,
      updated_at
  ) VALUES (
      'w0000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000001',
      5000000.00,
      0.00,
      'XOF',
      NOW(),
      NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
      available_balance = GREATEST(wallets.available_balance, EXCLUDED.available_balance),
      updated_at = NOW();
END $$;

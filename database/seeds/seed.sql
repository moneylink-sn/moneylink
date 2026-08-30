-- ============================================================================
-- MONEYLINK — JEU DE DONNÉES DE TEST & DÉMONSTRATION (SEEDS)
-- Mot de passe par défaut pour tous les comptes de test : Password123!
-- Hash Bcrypt : $2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2
-- ============================================================================

-- Nettoyage des anciennes données
TRUNCATE TABLE audit_logs, loyalty_transactions, loyalty_programs, notifications, disputes,
savings_contributions, savings_members, savings_goals, transactions, order_items, orders,
delivery_persons, products, merchants, wallets, users RESTART IDENTITY CASCADE;

-- ----------------------------------------------------------------------------
-- 1. UTILISATEURS
-- ----------------------------------------------------------------------------
INSERT INTO users (id, phone, email, first_name, last_name, password_hash, role, status, avatar_url) VALUES
('a0000000-0000-0000-0000-000000000001', '+221770000001', 'admin@moneylink.sn', 'Codé', 'Samb', '$2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2', 'ADMIN', 'ACTIVE', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
('b0000000-0000-0000-0000-000000000002', '+221770000002', 'amadou@diopsports.sn', 'Amadou', 'Diop', '$2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2', 'MERCHANT', 'ACTIVE', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
('b0000000-0000-0000-0000-000000000003', '+221770000003', 'fatou@dakartech.sn', 'Fatou', 'Ndiaye', '$2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2', 'MERCHANT', 'ACTIVE', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'),
('c0000000-0000-0000-0000-000000000004', '+221770000004', 'moussa@gmail.com', 'Moussa', 'Fall', '$2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2', 'CLIENT', 'ACTIVE', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),
('c0000000-0000-0000-0000-000000000005', '+221770000005', 'awa@gmail.com', 'Awa', 'Sow', '$2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2', 'CLIENT', 'ACTIVE', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150');

-- ----------------------------------------------------------------------------
-- 2. PORTEFEUILLES (WALLETS)
-- ----------------------------------------------------------------------------
INSERT INTO wallets (id, user_id, available_balance, locked_balance, currency) VALUES
('w0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 5000000.00, 0.00, 'XOF'),
('w0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 280000.00, 45000.00, 'XOF'), -- 45k en séquestre
('w0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 450000.00, 18000.00, 'XOF'), -- 18k en litige
('w0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 150000.00, 0.00, 'XOF'),
('w0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 85000.00, 0.00, 'XOF');

-- ----------------------------------------------------------------------------
-- 3. COMMERÇANTS (MERCHANTS)
-- ----------------------------------------------------------------------------
INSERT INTO merchants (id, user_id, business_name, business_type, description, address, city, phone, logo_url, is_verified, status) VALUES
('m0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Diop Sports & Sneakers', 'Mode & Sport', 'Boutique spécialisée en équipements sportifs et sneakers authentiques à Dakar.', 'Avenue Lamine Guèye, Plateau', 'Dakar', '+221770000002', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200', TRUE, 'ACTIVE'),
('m0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'Dakar Tech Store', 'Électronique & High-Tech', 'Smartphones, accessoires connectés et matériel informatique garantis.', 'Rue 10 x Mermoz Ancienne Piste', 'Dakar', '+221770000003', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200', TRUE, 'ACTIVE');

-- ----------------------------------------------------------------------------
-- 4. PRODUITS
-- ----------------------------------------------------------------------------
INSERT INTO products (id, merchant_id, name, description, price, stock, image_url, category, is_active) VALUES
('p0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000001', 'Sneakers Nike Air Max 270', 'Chaussures confortables et respirantes, pointures 40 à 45.', 45000.00, 15, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', 'Chaussures', TRUE),
('p0000000-0000-0000-0000-000000000002', 'm0000000-0000-0000-0000-000000000001', 'Maillot Officiel Sénégal CAN', 'Maillot domicile Puma des Lions de la Teranga avec flocage.', 25000.00, 30, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500', 'Vêtements', TRUE),
('p0000000-0000-0000-0000-000000000003', 'm0000000-0000-0000-0000-000000000001', 'Sac de Sport Imperméable 40L', 'Idéal pour le fitness, football et voyages courts.', 15000.00, 20, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', 'Accessoires', TRUE),
('p0000000-0000-0000-0000-000000000004', 'm0000000-0000-0000-0000-000000000002', 'Écouteurs Sans Fil Pro ANC', 'Réduction active du bruit, autonomie 28h avec boîtier de charge.', 18000.00, 25, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', 'Audio', TRUE),
('p0000000-0000-0000-0000-000000000005', 'm0000000-0000-0000-0000-000000000002', 'Montre Connectée SmartFit Pro', 'Suivi cardiaque, GPS, étanche IP68 et notifications WhatsApp.', 32000.00, 12, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', 'Objets Connectés', TRUE),
('p0000000-0000-0000-0000-000000000006', 'm0000000-0000-0000-0000-000000000002', 'Chargeur Rapide GaN 65W 3 Ports', 'Charge ultra-rapide pour MacBook, iPhone et Android en simultané.', 12500.00, 40, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500', 'Accessoires', TRUE);

-- ----------------------------------------------------------------------------
-- 5. LIVREURS (DELIVERY PERSONS)
-- ----------------------------------------------------------------------------
INSERT INTO delivery_persons (id, first_name, last_name, phone, status) VALUES
('dp000000-0000-0000-0000-000000000001', 'Mamadou', 'Diop', '+221778901234', 'AVAILABLE'),
('dp000000-0000-0000-0000-000000000002', 'Ibrahima', 'Ndiaye', '+221778901235', 'AVAILABLE');

-- ----------------------------------------------------------------------------
-- 6. COMMANDES (ORDERS) AVEC DIFFÉRENTS ÉTATS DU CYCLE ESCROW
-- ----------------------------------------------------------------------------
INSERT INTO orders (id, order_number, buyer_id, merchant_id, delivery_person_id, total_amount, escrow_amount, service_fee, status, delivery_code_hash, delivery_address, delivery_phone, delivery_notes, paid_at, shipped_at, delivered_at, confirmed_at) VALUES
-- Commande 1 : En attente de livraison avec Code OTP (ex code clair : 849201) et livreur assigné
('o0000000-0000-0000-0000-000000000001', 'ML-2026-001', 'c0000000-0000-0000-0000-000000000004', 'm0000000-0000-0000-0000-000000000001', 'dp000000-0000-0000-0000-000000000001', 45000.00, 45000.00, 500.00, 'SHIPPED', '$2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2', 'Almadies, Villa 45, Dakar', '+221770000004', 'Appeler dès l’arrivée à la porte', NOW() - INTERVAL '4 HOURS', NOW() - INTERVAL '1 HOUR', NULL, NULL),

-- Commande 2 : Finalisée et confirmée (Fonds versés au vendeur)
('o0000000-0000-0000-0000-000000000002', 'ML-2026-002', 'c0000000-0000-0000-0000-000000000005', 'm0000000-0000-0000-0000-000000000002', 'dp000000-0000-0000-0000-000000000002', 32000.00, 32000.00, 400.00, 'CONFIRMED', '$2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2', 'Liberté 6 Extension, Dakar', '+221770000005', 'Colis remis en main propre', NOW() - INTERVAL '2 DAYS', NOW() - INTERVAL '1 DAY', NOW() - INTERVAL '12 HOURS', NOW() - INTERVAL '12 HOURS'),

-- Commande 3 : En litige (Produit défectueux / non conforme)
('o0000000-0000-0000-0000-000000000003', 'ML-2026-003', 'c0000000-0000-0000-0000-000000000004', 'm0000000-0000-0000-0000-000000000002', NULL, 18000.00, 18000.00, 200.00, 'DISPUTED', '$2a$10$VBllDLdBwqdqSptL4yAHJuMZ9D6ivtvGMT5s1zLawpkeLEpk7pVi2', 'Point E, Immeuble Horizon', '+221770000004', 'Écouteurs ne s’allument pas', NOW() - INTERVAL '1 DAY', NOW() - INTERVAL '8 HOURS', NOW() - INTERVAL '4 HOURS', NULL);

-- ----------------------------------------------------------------------------
-- 6. LIGNES DE COMMANDES (ORDER ITEMS)
-- ----------------------------------------------------------------------------
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price) VALUES
('i0000000-0000-0000-0000-000000000001', 'o0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 1, 45000.00, 45000.00),
('i0000000-0000-0000-0000-000000000002', 'o0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000005', 1, 32000.00, 32000.00),
('i0000000-0000-0000-0000-000000000003', 'o0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000004', 1, 18000.00, 18000.00);

-- ----------------------------------------------------------------------------
-- 7. TRANSACTIONS FINANCIÈRES
-- ----------------------------------------------------------------------------
INSERT INTO transactions (id, reference, idempotency_key, sender_id, receiver_id, order_id, type, amount, fee, currency, payment_method, status, metadata) VALUES
('t0000000-0000-0000-0000-000000000001', 'TXN-2026-894101', 'IDEM-WAVE-001', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'o0000000-0000-0000-0000-000000000001', 'ESCROW_LOCK', 45000.00, 500.00, 'XOF', 'WAVE_MOCK', 'SUCCESS', '{"wave_transaction_id": "WV_SN_9841249", "phone": "+221770000004"}'::jsonb),
('t0000000-0000-0000-0000-000000000002', 'TXN-2026-894102', 'IDEM-OM-002', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'o0000000-0000-0000-0000-000000000002', 'ESCROW_RELEASE', 32000.00, 400.00, 'XOF', 'OM_MOCK', 'SUCCESS', '{"om_reference": "OM_SN_551420", "released_at": "2026-08-24T10:00:00Z"}'::jsonb),
('t0000000-0000-0000-0000-000000000003', 'TXN-2026-894103', 'IDEM-WAVE-003', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 'o0000000-0000-0000-0000-000000000003', 'ESCROW_LOCK', 18000.00, 200.00, 'XOF', 'WAVE_MOCK', 'SUCCESS', '{"status": "LOCKED_IN_DISPUTE"}'::jsonb);

-- ----------------------------------------------------------------------------
-- 8. COFFRES D'ÉPARGNE (MONEYLINK COFFRE)
-- ----------------------------------------------------------------------------
INSERT INTO savings_goals (id, owner_id, title, description, target_amount, current_amount, start_date, target_date, type, frequency, status) VALUES
-- Coffre Personnel
('s0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Achat PC Portable Développeur', 'Épargne pour financer un nouveau MacBook M3 Pro.', 350000.00, 120000.00, CURRENT_DATE - INTERVAL '1 MONTH', CURRENT_DATE + INTERVAL '5 MONTHS', 'PERSONAL', 'MONTHLY', 'ACTIVE'),

-- Coffre Collectif (Tontine)
('s0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000005', 'Tontine Vacances Saly & Sine Saloum', 'Cagnotte commune entre amis pour le séjour de fin d’année.', 500000.00, 200000.00, CURRENT_DATE - INTERVAL '15 DAYS', CURRENT_DATE + INTERVAL '2 MONTHS', 'COLLECTIVE', 'WEEKLY', 'ACTIVE');

-- ----------------------------------------------------------------------------
-- 9. MEMBRES DU COFFRE COLLECTIF
-- ----------------------------------------------------------------------------
INSERT INTO savings_members (id, savings_goal_id, user_id, role, total_contributed) VALUES
('sm000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000005', 'CREATOR', 120000.00),
('sm000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 'CONTRIBUTOR', 80000.00);

-- ----------------------------------------------------------------------------
-- 10. VERSEMENTS D'ÉPARGNE (CONTRIBUTIONS)
-- ----------------------------------------------------------------------------
INSERT INTO savings_contributions (id, savings_goal_id, user_id, amount, note) VALUES
('sc000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 60000.00, 'Premier versement mensuel'),
('sc000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 60000.00, 'Second versement mensuel'),
('sc000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000005', 120000.00, 'Contribution Awa'),
('sc000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 80000.00, 'Contribution Moussa');

-- ----------------------------------------------------------------------------
-- 11. LITIGE (DISPUTES)
-- ----------------------------------------------------------------------------
INSERT INTO disputes (id, order_id, opened_by, reason, description, evidence_urls, status, resolution_notes) VALUES
('d0000000-0000-0000-0000-000000000001', 'o0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'DAMAGED', 'Les écouteurs reçus ne s’allument pas malgré une charge complète de 3 heures.', '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"]'::jsonb, 'OPENED', 'Dossier assigné au médiateur pour examen des preuves.');

-- ----------------------------------------------------------------------------
-- 12. NOTIFICATIONS
-- ----------------------------------------------------------------------------
INSERT INTO notifications (id, user_id, title, message, type, payload, is_read, channel) VALUES
('n0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Paiement Sécurisé Confirmé', 'Votre commande #ML-2026-001 de 45 000 FCFA est garantie en séquestre. Votre code secret est 849201.', 'PAYMENT', '{"order_id": "o0000000-0000-0000-0000-000000000001", "code": "849201"}'::jsonb, FALSE, 'PUSH'),
('n0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Nouvelle Vente Séquestrée !', 'La commande #ML-2026-001 a été payée. Vous pouvez procéder à l’expédition.', 'ORDER_STATUS', '{"order_id": "o0000000-0000-0000-0000-000000000001"}'::jsonb, TRUE, 'PUSH'),
('n0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 'Rappel Coffre Épargne', 'Votre coffre "Tontine Vacances" avance bien : 200 000 FCFA / 500 000 FCFA collectés.', 'SAVINGS_REMINDER', '{"goal_id": "s0000000-0000-0000-0000-000000000002"}'::jsonb, FALSE, 'PUSH');

-- ----------------------------------------------------------------------------
-- 13. PROGRAMME DE FIDÉLITÉ & POINTS
-- ----------------------------------------------------------------------------
INSERT INTO loyalty_programs (id, merchant_id, points_per_amount, min_points_redemption, reward_discount_percent, is_active) VALUES
('lp000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000001', 0.01, 100, 5.00, TRUE),
('lp000000-0000-0000-0000-000000000002', 'm0000000-0000-0000-0000-000000000002', 0.01, 100, 5.00, TRUE);

INSERT INTO loyalty_transactions (id, merchant_id, user_id, order_id, points_change, type) VALUES
('lt000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000005', 'o0000000-0000-0000-0000-000000000002', 320, 'EARNED');

-- ----------------------------------------------------------------------------
-- 14. AUDIT LOGS (JOURNAL DE SÉCURITÉ)
-- ----------------------------------------------------------------------------
INSERT INTO audit_logs (id, actor_id, action, resource_type, resource_id, previous_state, new_state, ip_address) VALUES
('al000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'DISPUTE_OPENED', 'orders', 'o0000000-0000-0000-0000-000000000003', '{"status": "DELIVERED"}'::jsonb, '{"status": "DISPUTED"}'::jsonb, '196.207.240.12'),
('al000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ADMIN_LOGIN', 'users', 'a0000000-0000-0000-0000-000000000001', NULL, '{"login_time": "2026-08-24T12:00:00Z"}'::jsonb, '196.207.240.1');

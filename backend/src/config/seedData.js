/**
 * MoneyLink — Données initiales en mémoire pour le développement & tests
 */

import bcrypt from 'bcryptjs';

// Hash pour "Password123!"
const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

export const initialSeedData = {
  users: [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      phone: '+221770000001',
      email: 'admin@moneylink.sn',
      first_name: 'Codé',
      last_name: 'Samb',
      password_hash: defaultPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      subscription_status: 'ACTIVE',
      subscription_start_date: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
      subscription_end_date: new Date(Date.now() + 300 * 24 * 3600 * 1000).toISOString(),
      subscription_price: 500,
      is_trial: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      phone: '+221770000002',
      email: 'amadou@diopsports.sn',
      first_name: 'Amadou',
      last_name: 'Diop',
      password_hash: defaultPasswordHash,
      role: 'MERCHANT',
      status: 'ACTIVE',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      subscription_status: 'ACTIVE',
      subscription_start_date: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
      subscription_end_date: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
      subscription_price: 500,
      is_trial: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      phone: '+221770000003',
      email: 'fatou@dakartech.sn',
      first_name: 'Fatou',
      last_name: 'Ndiaye',
      password_hash: defaultPasswordHash,
      role: 'MERCHANT',
      status: 'ACTIVE',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      subscription_status: 'TRIAL',
      subscription_start_date: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      subscription_end_date: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
      subscription_price: 500,
      is_trial: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      phone: '+221770000004',
      email: 'moussa@gmail.com',
      first_name: 'Moussa',
      last_name: 'Fall',
      password_hash: defaultPasswordHash,
      role: 'CLIENT',
      status: 'ACTIVE',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      subscription_status: 'TRIAL',
      subscription_start_date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      subscription_end_date: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(),
      subscription_price: 500,
      is_trial: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'c0000000-0000-0000-0000-000000000005',
      phone: '+221770000005',
      email: 'awa@gmail.com',
      first_name: 'Awa',
      last_name: 'Sow',
      password_hash: defaultPasswordHash,
      role: 'CLIENT',
      status: 'ACTIVE',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      subscription_status: 'EXPIRED',
      subscription_start_date: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
      subscription_end_date: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      subscription_price: 500,
      is_trial: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  wallets: [
    {
      id: 'w0000000-0000-0000-0000-000000000001',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      available_balance: 5000000.00,
      locked_balance: 0.00,
      currency: 'XOF'
    },
    {
      id: 'w0000000-0000-0000-0000-000000000002',
      user_id: 'b0000000-0000-0000-0000-000000000002',
      available_balance: 280000.00,
      locked_balance: 45000.00,
      currency: 'XOF'
    },
    {
      id: 'w0000000-0000-0000-0000-000000000003',
      user_id: 'b0000000-0000-0000-0000-000000000003',
      available_balance: 450000.00,
      locked_balance: 18000.00,
      currency: 'XOF'
    },
    {
      id: 'w0000000-0000-0000-0000-000000000004',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      available_balance: 150000.00,
      locked_balance: 0.00,
      currency: 'XOF'
    },
    {
      id: 'w0000000-0000-0000-0000-000000000005',
      user_id: 'c0000000-0000-0000-0000-000000000005',
      available_balance: 85000.00,
      locked_balance: 0.00,
      currency: 'XOF'
    }
  ],
  merchants: [
    {
      id: 'm0000000-0000-0000-0000-000000000001',
      user_id: 'b0000000-0000-0000-0000-000000000002',
      business_name: 'Diop Sports & Sneakers',
      business_type: 'Mode & Sport',
      description: 'Boutique spécialisée en équipements sportifs et sneakers authentiques à Dakar.',
      address: 'Avenue Lamine Guèye, Plateau',
      city: 'Dakar',
      phone: '+221770000002',
      logo_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
      is_verified: true,
      status: 'ACTIVE'
    },
    {
      id: 'm0000000-0000-0000-0000-000000000002',
      user_id: 'b0000000-0000-0000-0000-000000000003',
      business_name: 'Dakar Tech Store',
      business_type: 'Électronique & High-Tech',
      description: 'Smartphones, accessoires connectés et matériel informatique garantis.',
      address: 'Rue 10 x Mermoz Ancienne Piste',
      city: 'Dakar',
      phone: '+221770000003',
      logo_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
      is_verified: true,
      status: 'ACTIVE'
    }
  ],
  products: [
    {
      id: 'p0000000-0000-0000-0000-000000000001',
      merchant_id: 'm0000000-0000-0000-0000-000000000001',
      name: 'Sneakers Nike Air Max 270',
      description: 'Chaussures confortables et respirantes, pointures 40 à 45.',
      price: 45000.00,
      stock: 15,
      image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
      category: 'Chaussures',
      is_active: true
    },
    {
      id: 'p0000000-0000-0000-0000-000000000002',
      merchant_id: 'm0000000-0000-0000-0000-000000000001',
      name: 'Maillot Officiel Sénégal CAN',
      description: 'Maillot domicile Puma des Lions de la Teranga avec flocage.',
      price: 25000.00,
      stock: 30,
      image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500',
      category: 'Vêtements',
      is_active: true
    },
    {
      id: 'p0000000-0000-0000-0000-000000000003',
      merchant_id: 'm0000000-0000-0000-0000-000000000001',
      name: 'Sac de Sport Imperméable 40L',
      description: 'Idéal pour le fitness, football et voyages courts.',
      price: 15000.00,
      stock: 20,
      image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
      category: 'Accessoires',
      is_active: true
    },
    {
      id: 'p0000000-0000-0000-0000-000000000004',
      merchant_id: 'm0000000-0000-0000-0000-000000000002',
      name: 'Écouteurs Sans Fil Pro ANC',
      description: 'Réduction active du bruit, autonomie 28h avec boîtier de charge.',
      price: 18000.00,
      stock: 25,
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      category: 'Audio',
      is_active: true
    },
    {
      id: 'p0000000-0000-0000-0000-000000000005',
      merchant_id: 'm0000000-0000-0000-0000-000000000002',
      name: 'Montre Connectée SmartFit Pro',
      description: 'Suivi cardiaque, GPS, étanche IP68 et notifications WhatsApp.',
      price: 32000.00,
      stock: 12,
      image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
      category: 'Objets Connectés',
      is_active: true
    },
    {
      id: 'p0000000-0000-0000-0000-000000000006',
      merchant_id: 'm0000000-0000-0000-0000-000000000002',
      name: 'Chargeur Rapide GaN 65W 3 Ports',
      description: 'Charge ultra-rapide pour MacBook, iPhone et Android en simultané.',
      price: 12500.00,
      stock: 40,
      image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500',
      category: 'Accessoires',
      is_active: true
    }
  ],
  delivery_persons: [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      first_name: 'Mamadou',
      last_name: 'Diop',
      phone: '+221778901234',
      status: 'AVAILABLE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      first_name: 'Ibrahima',
      last_name: 'Ndiaye',
      phone: '+221778901235',
      status: 'AVAILABLE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  orders: [
    {
      id: 'o0000000-0000-0000-0000-000000000001',
      order_number: 'ML-2026-001',
      buyer_id: 'c0000000-0000-0000-0000-000000000004',
      merchant_id: 'm0000000-0000-0000-0000-000000000001',
      delivery_person_id: 'd0000000-0000-0000-0000-000000000001',
      total_amount: 45000.00,
      escrow_amount: 45000.00,
      service_fee: 500.00,
      status: 'SHIPPED',
      delivery_code: '849201', // Code OTP en clair pour test
      delivery_code_hash: defaultPasswordHash,
      delivery_address: 'Almadies, Villa 45, Dakar',
      delivery_phone: '+221770000004',
      delivery_notes: 'Appeler dès l’arrivée à la porte',
      paid_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      shipped_at: new Date(Date.now() - 1 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      items: [
        {
          id: 'i0000000-0000-0000-0000-000000000001',
          product_id: 'p0000000-0000-0000-0000-000000000001',
          product_name: 'Sneakers Nike Air Max 270',
          quantity: 1,
          unit_price: 45000.00,
          total_price: 45000.00
        }
      ]
    },
    {
      id: 'o0000000-0000-0000-0000-000000000002',
      order_number: 'ML-2026-002',
      buyer_id: 'c0000000-0000-0000-0000-000000000005',
      merchant_id: 'm0000000-0000-0000-0000-000000000002',
      delivery_person_id: 'd0000000-0000-0000-0000-000000000002',
      total_amount: 32000.00,
      escrow_amount: 32000.00,
      service_fee: 400.00,
      status: 'CONFIRMED',
      delivery_code: '123456',
      delivery_code_hash: defaultPasswordHash,
      delivery_address: 'Liberté 6 Extension, Dakar',
      delivery_phone: '+221770000005',
      delivery_notes: 'Colis remis en main propre',
      paid_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      shipped_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      delivered_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      confirmed_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      items: [
        {
          id: 'i0000000-0000-0000-0000-000000000002',
          product_id: 'p0000000-0000-0000-0000-000000000005',
          product_name: 'Montre Connectée SmartFit Pro',
          quantity: 1,
          unit_price: 32000.00,
          total_price: 32000.00
        }
      ]
    },
    {
      id: 'o0000000-0000-0000-0000-000000000003',
      order_number: 'ML-2026-003',
      buyer_id: 'c0000000-0000-0000-0000-000000000004',
      merchant_id: 'm0000000-0000-0000-0000-000000000002',
      total_amount: 18000.00,
      escrow_amount: 18000.00,
      service_fee: 200.00,
      status: 'DISPUTED',
      delivery_code: '777888',
      delivery_code_hash: defaultPasswordHash,
      delivery_address: 'Point E, Dakar',
      delivery_phone: '+221770000004',
      delivery_notes: 'Écouteurs ne s’allument pas',
      paid_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      shipped_at: new Date(Date.now() - 10 * 3600000).toISOString(),
      delivered_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      items: [
        {
          id: 'i0000000-0000-0000-0000-000000000003',
          product_id: 'p0000000-0000-0000-0000-000000000004',
          product_name: 'Écouteurs Sans Fil Pro ANC',
          quantity: 1,
          unit_price: 18000.00,
          total_price: 18000.00
        }
      ]
    }
  ],
  transactions: [
    {
      id: 't0000000-0000-0000-0000-000000000001',
      reference: 'TXN-2026-894101',
      idempotency_key: 'IDEM-WAVE-001',
      sender_id: 'c0000000-0000-0000-0000-000000000004',
      receiver_id: 'b0000000-0000-0000-0000-000000000002',
      order_id: 'o0000000-0000-0000-0000-000000000001',
      type: 'ESCROW_LOCK',
      amount: 45000.00,
      fee: 500.00,
      currency: 'XOF',
      payment_method: 'WAVE_MOCK',
      status: 'SUCCESS',
      created_at: new Date(Date.now() - 4 * 3600000).toISOString()
    },
    {
      id: 't0000000-0000-0000-0000-000000000002',
      reference: 'TXN-2026-894102',
      idempotency_key: 'IDEM-OM-002',
      sender_id: 'c0000000-0000-0000-0000-000000000005',
      receiver_id: 'b0000000-0000-0000-0000-000000000003',
      order_id: 'o0000000-0000-0000-0000-000000000002',
      type: 'ESCROW_RELEASE',
      amount: 32000.00,
      fee: 400.00,
      currency: 'XOF',
      payment_method: 'OM_MOCK',
      status: 'SUCCESS',
      created_at: new Date(Date.now() - 12 * 3600000).toISOString()
    }
  ],
  savings_goals: [
    {
      id: 's0000000-0000-0000-0000-000000000001',
      owner_id: 'c0000000-0000-0000-0000-000000000004',
      title: 'Achat PC Portable Développeur',
      description: 'Épargne pour financer un nouveau MacBook M3 Pro.',
      target_amount: 350000.00,
      current_amount: 120000.00,
      start_date: '2026-07-24',
      target_date: '2027-01-24',
      type: 'PERSONAL',
      frequency: 'MONTHLY',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    },
    {
      id: 's0000000-0000-0000-0000-000000000002',
      owner_id: 'c0000000-0000-0000-0000-000000000005',
      title: 'Tontine Vacances Saly & Sine Saloum',
      description: 'Cagnotte commune entre amis pour le séjour de fin d’année.',
      target_amount: 500000.00,
      current_amount: 200000.00,
      start_date: '2026-08-10',
      target_date: '2026-10-31',
      type: 'COLLECTIVE',
      frequency: 'WEEKLY',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    }
  ],
  savings_members: [
    {
      id: 'sm000000-0000-0000-0000-000000000001',
      savings_goal_id: 's0000000-0000-0000-0000-000000000002',
      user_id: 'c0000000-0000-0000-0000-000000000005',
      role: 'CREATOR',
      total_contributed: 120000.00
    },
    {
      id: 'sm000000-0000-0000-0000-000000000002',
      savings_goal_id: 's0000000-0000-0000-0000-000000000002',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      role: 'CONTRIBUTOR',
      total_contributed: 80000.00
    }
  ],
  savings_contributions: [
    {
      id: 'sc000000-0000-0000-0000-000000000001',
      savings_goal_id: 's0000000-0000-0000-0000-000000000001',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      amount: 60000.00,
      note: 'Premier versement mensuel',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 'sc000000-0000-0000-0000-000000000002',
      savings_goal_id: 's0000000-0000-0000-0000-000000000001',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      amount: 60000.00,
      note: 'Second versement mensuel',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    }
  ],
  disputes: [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      order_id: 'o0000000-0000-0000-0000-000000000003',
      opened_by: 'c0000000-0000-0000-0000-000000000004',
      reason: 'DAMAGED',
      description: 'Les écouteurs reçus ne s’allument pas malgré une charge de 3 heures.',
      evidence_urls: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'],
      status: 'OPENED',
      resolution_notes: 'Dossier en attente d’arbitrage par le modérateur.',
      created_at: new Date().toISOString()
    }
  ],
  notifications: [
    {
      id: 'n0000000-0000-0000-0000-000000000001',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      title: 'Paiement Sécurisé Confirmé',
      message: 'Votre commande #ML-2026-001 de 45 000 FCFA est garantie en séquestre. Votre code secret est 849201.',
      type: 'PAYMENT',
      payload: { order_id: 'o0000000-0000-0000-0000-000000000001', code: '849201' },
      is_read: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'n0000000-0000-0000-0000-000000000002',
      user_id: 'b0000000-0000-0000-0000-000000000002',
      title: 'Nouvelle Vente Séquestrée !',
      message: 'La commande #ML-2026-001 a été payée. Vous pouvez procéder à l’expédition.',
      type: 'ORDER_STATUS',
      payload: { order_id: 'o0000000-0000-0000-0000-000000000001' },
      is_read: true,
      created_at: new Date().toISOString()
    }
  ],
  audit_logs: [],
  analytics_events: [
    // Événements d'aujourd'hui
    {
      id: 'ae-2026-0001',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-today-01',
      platform: 'WEB_LANDING',
      metadata: { path: '/', referrer: 'https://google.sn' },
      created_at: new Date(Date.now() - 30 * 60000).toISOString()
    },
    {
      id: 'ae-2026-0002',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-today-02',
      platform: 'WEB_LANDING',
      metadata: { path: '/tarifs', referrer: 'direct' },
      created_at: new Date(Date.now() - 75 * 60000).toISOString()
    },
    {
      id: 'ae-2026-0003',
      event_type: 'APP_OPEN',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      session_id: 'sess-mob-01',
      platform: 'MOBILE_APP',
      metadata: { screen: 'HomeScreen' },
      created_at: new Date(Date.now() - 120 * 60000).toISOString()
    },
    {
      id: 'ae-2026-0004',
      event_type: 'LOGIN',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      session_id: 'sess-adm-01',
      platform: 'WEB_ADMIN',
      metadata: { role: 'ADMIN' },
      created_at: new Date(Date.now() - 180 * 60000).toISOString()
    },
    {
      id: 'ae-2026-0005',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-today-03',
      platform: 'WEB_LANDING',
      metadata: { path: '/sequestre-securise' },
      created_at: new Date(Date.now() - 240 * 60000).toISOString()
    },
    {
      id: 'ae-2026-0006',
      event_type: 'PAYMENT_SUCCESS',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      session_id: 'sess-mob-01',
      platform: 'MOBILE_APP',
      metadata: { amount: 45000, method: 'WAVE_MOCK', order_id: 'o0000000-0000-0000-0000-000000000001' },
      created_at: new Date(Date.now() - 4 * 3600000).toISOString()
    },
    // Événements des 7 derniers jours
    {
      id: 'ae-2026-0007',
      event_type: 'REGISTER',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      session_id: 'sess-reg-01',
      platform: 'MOBILE_APP',
      metadata: { role: 'CLIENT' },
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0008',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-7d-01',
      platform: 'WEB_LANDING',
      metadata: { path: '/' },
      created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0009',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-7d-02',
      platform: 'WEB_LANDING',
      metadata: { path: '/commercants' },
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0010',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-7d-03',
      platform: 'WEB_LANDING',
      metadata: { path: '/sequestre' },
      created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0011',
      event_type: 'PAYMENT_SUCCESS',
      user_id: 'c0000000-0000-0000-0000-000000000005',
      session_id: 'sess-pay-02',
      platform: 'MOBILE_APP',
      metadata: { amount: 32000, method: 'OM_MOCK', order_id: 'o0000000-0000-0000-0000-000000000002' },
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0012',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-7d-04',
      platform: 'WEB_LANDING',
      metadata: { path: '/faq' },
      created_at: new Date(Date.now() - 4 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0013',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-7d-05',
      platform: 'WEB_LANDING',
      metadata: { path: '/telecharger' },
      created_at: new Date(Date.now() - 6 * 86400000).toISOString()
    },
    // Événements des 30 derniers jours
    {
      id: 'ae-2026-0014',
      event_type: 'REGISTER',
      user_id: 'b0000000-0000-0000-0000-000000000003',
      session_id: 'sess-reg-02',
      platform: 'WEB_LANDING',
      metadata: { role: 'MERCHANT' },
      created_at: new Date(Date.now() - 10 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0015',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-30d-01',
      platform: 'WEB_LANDING',
      metadata: { path: '/' },
      created_at: new Date(Date.now() - 12 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0016',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-30d-02',
      platform: 'WEB_LANDING',
      metadata: { path: '/apropos' },
      created_at: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0017',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-30d-03',
      platform: 'WEB_LANDING',
      metadata: { path: '/securite' },
      created_at: new Date(Date.now() - 18 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0018',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-30d-04',
      platform: 'WEB_LANDING',
      metadata: { path: '/' },
      created_at: new Date(Date.now() - 22 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0019',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-30d-05',
      platform: 'WEB_LANDING',
      metadata: { path: '/tarifs' },
      created_at: new Date(Date.now() - 25 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0020',
      event_type: 'PAGE_VIEW',
      user_id: null,
      session_id: 'sess-30d-06',
      platform: 'WEB_LANDING',
      metadata: { path: '/' },
      created_at: new Date(Date.now() - 28 * 86400000).toISOString()
    },
    {
      id: 'ae-2026-0021',
      event_type: 'SUBSCRIPTION_ACTIVATED',
      user_id: 'b0000000-0000-0000-0000-000000000002',
      session_id: 'sess-sub-01',
      platform: 'WEB_ADMIN',
      metadata: { plan: 'Premium', price: 500 },
      created_at: new Date(Date.now() - 15 * 86400000).toISOString()
    }
  ],
  media_uploads: [],

  // ==========================================================================
  // MONEYLINK V2 SEED DATA
  // ==========================================================================
  business_profiles: [
    {
      id: 'bp-00000000-0000-0000-0000-000000000001',
      user_id: 'b0000000-0000-0000-0000-000000000002',
      merchant_id: 'm0000000-0000-0000-0000-000000000001',
      business_category: 'Sports & Loisirs',
      tax_id: 'NINEA-0098745621',
      currency: 'XOF',
      monthly_target: 2000000,
      settings: { auto_receipt: true, notify_whatsapp: true },
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'bp-00000000-0000-0000-0000-000000000002',
      user_id: 'b0000000-0000-0000-0000-000000000003',
      merchant_id: 'm0000000-0000-0000-0000-000000000002',
      business_category: 'High-Tech & Téléphonie',
      tax_id: 'NINEA-0045127896',
      currency: 'XOF',
      monthly_target: 5000000,
      settings: { auto_receipt: true, notify_whatsapp: true },
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],

  invoices: [
    {
      id: 'inv-2026-000001',
      invoice_number: 'ML-2026-000001',
      merchant_id: 'm0000000-0000-0000-0000-000000000001',
      client_id: 'c0000000-0000-0000-0000-000000000004',
      client_name: 'Moussa Fall',
      client_phone: '+221770000004',
      client_email: 'moussa@gmail.com',
      client_address: 'Mermoz, Dakar',
      subtotal: 70000,
      discount_amount: 5000,
      total_amount: 65000,
      paid_amount: 65000,
      currency: 'XOF',
      status: 'PAYÉE',
      issue_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      notes: 'Facture équipements sportifs club Dakar',
      share_token: 'tok_inv_ml2026000001_sec892',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 86400000).toISOString()
    },
    {
      id: 'inv-2026-000002',
      invoice_number: 'ML-2026-000002',
      merchant_id: 'm0000000-0000-0000-0000-000000000002',
      client_id: 'c0000000-0000-0000-0000-000000000005',
      client_name: 'Awa Sow',
      client_phone: '+221770000005',
      client_email: 'awa@gmail.com',
      client_address: 'Almadies, Dakar',
      subtotal: 120000,
      discount_amount: 0,
      total_amount: 120000,
      paid_amount: 0,
      currency: 'XOF',
      status: 'ENVOYÉE',
      issue_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      due_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      notes: 'Livraison prévue à domicile',
      share_token: 'tok_inv_ml2026000002_sec741',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],

  invoice_items: [
    {
      id: 'ii-000001',
      invoice_id: 'inv-2026-000001',
      product_id: null,
      description: 'Maillots Officiels Lions du Sénégal (x2)',
      quantity: 2,
      unit_price: 25000,
      total_price: 50000,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    {
      id: 'ii-000002',
      invoice_id: 'inv-2026-000001',
      product_id: null,
      description: 'Sac de Sport Étanche 45L',
      quantity: 1,
      unit_price: 20000,
      total_price: 20000,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    {
      id: 'ii-000003',
      invoice_id: 'inv-2026-000002',
      product_id: null,
      description: 'Pack Accessoires Informatiques Pro Fast Charging',
      quantity: 2,
      unit_price: 60000,
      total_price: 120000,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ],

  receipts: [
    {
      id: 'rec-2026-000001',
      receipt_number: 'REC-2026-000001',
      invoice_id: 'inv-2026-000001',
      order_id: null,
      merchant_id: 'm0000000-0000-0000-0000-000000000001',
      client_id: 'c0000000-0000-0000-0000-000000000004',
      client_name: 'Moussa Fall',
      client_phone: '+221770000004',
      amount: 65000,
      currency: 'XOF',
      payment_method: 'WAVE',
      transaction_reference: 'WAVE-REC-98234710',
      status: 'COMPLETED',
      paid_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      share_token: 'tok_rec_ml2026000001_sec109',
      metadata: { items_count: 2, merchant_name: 'Diop Sports Pro' },
      created_at: new Date(Date.now() - 6 * 86400000).toISOString()
    }
  ],

  security_events: [
    {
      id: 'sec-ev-0001',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      event_type: 'TRANSACTION_ANALYSIS',
      severity: 'LOW',
      risk_score: 12,
      details: { amount: 25000, method: 'WAVE', reason: 'Habitude de consommation normale' },
      ip_address: '196.207.240.12',
      status: 'LOGGED',
      created_at: new Date(Date.now() - 24 * 3600000).toISOString()
    },
    {
      id: 'sec-ev-0002',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      event_type: 'HIGH_AMOUNT_CHECK',
      severity: 'MEDIUM',
      risk_score: 45,
      details: { amount: 150000, threshold: 100000, reason: 'Montant supérieur à la moyenne mensuelle' },
      ip_address: '196.207.240.12',
      status: 'RESOLVED',
      created_at: new Date(Date.now() - 12 * 3600000).toISOString()
    }
  ],

  security_alerts: [
    {
      id: 'sec-al-0001',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      transaction_id: null,
      title: '🛡️ Analyse de sécurité MoneyLink Shield',
      message: 'Une opération inhabituelle de 150 000 FCFA a fait l’objet d’une vérification supplémentaire.',
      risk_score: 45,
      risk_level: 'MEDIUM',
      is_acknowledged: true,
      action_taken: 'CONFIRMED',
      created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],

  ai_conversations: [
    {
      id: 'ai-msg-0001',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      role: 'USER',
      message: 'Combien ai-je dépensé cette semaine ?',
      intent: 'EXPENSE_ANALYSIS',
      context_data: { period: 'week' },
      created_at: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: 'ai-msg-0002',
      user_id: 'c0000000-0000-0000-0000-000000000004',
      role: 'ASSISTANT',
      message: 'Cette semaine, vos dépenses totales s’élèvent à 65 000 FCFA. Votre principal poste de dépense est "Sports & Loisirs" (100%). Vous avez économisé 5 000 FCFA grâce à des remises.',
      intent: 'EXPENSE_ANALYSIS',
      context_data: { total_spent: 65000, top_category: 'Sports & Loisirs' },
      created_at: new Date(Date.now() - 2 * 3600000 + 1000).toISOString()
    }
  ]
};


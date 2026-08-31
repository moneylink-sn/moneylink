/**
 * MoneyLink — Schémas de Validation Zod
 */

import { z } from 'zod';

export const registerSchema = z.object({
  phone: z.string().min(8, 'Numéro de téléphone requis (+221...)'),
  email: z.string().email('Adresse e-mail invalide'),
  first_name: z.string().min(2, 'Le prénom doit comporter au moins 2 caractères'),
  last_name: z.string().min(2, 'Le nom de famille doit comporter au moins 2 caractères'),
  password: z.string().min(6, 'Le mot de passe doit comporter au moins 6 caractères'),
  role: z.enum(['CLIENT', 'MERCHANT']).default('CLIENT'),
  business_name: z.string().optional(),
  business_type: z.string().optional()
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Téléphone ou e-mail obligatoire'),
  password: z.string().min(1, 'Mot de passe obligatoire')
});

export const orderSchema = z.object({
  merchant_id: z.string().min(1, 'ID du commerçant requis'),
  items: z.array(z.object({
    product_id: z.string().min(1),
    quantity: z.number().int().positive('La quantité doit être positive')
  })).min(1, 'Au moins un produit doit être sélectionné'),
  delivery_address: z.string().min(3, 'Adresse de livraison requise'),
  delivery_phone: z.string().optional(),
  delivery_notes: z.string().optional()
});

export const paymentSchema = z.object({
  order_id: z.string().min(1, 'ID de commande requis'),
  payment_method: z.enum([
    'WAVE',
    'ORANGE_MONEY',
    'FREE_MONEY',
    'WAVE_SN',
    'ORANGE_MONEY_SN',
    'WAVE_MOCK',
    'OM_MOCK',
    'FREE_MOCK',
    'WALLET',
    'CARD'
  ]),
  phone: z.string().optional()
});

export const savingsGoalSchema = z.object({
  title: z.string().min(3, 'Le titre de l’objectif est requis'),
  description: z.string().optional(),
  target_amount: z.number().positive('Le montant cible doit être supérieur à 0 FCFA'),
  target_date: z.string().min(8, 'Date cible obligatoire (AAAA-MM-JJ)'),
  type: z.enum(['PERSONAL', 'COLLECTIVE']).default('PERSONAL'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'FLEXIBLE']).default('MONTHLY'),
  initial_amount: z.number().nonnegative().optional()
});

export const contributeSchema = z.object({
  amount: z.number().positive('Le montant du versement doit être supérieur à 0 FCFA'),
  note: z.string().optional()
});

export const merchantProfileSchema = z.object({
  first_name: z.string().min(2, 'Le prénom doit comporter au moins 2 caractères').optional(),
  last_name: z.string().min(2, 'Le nom de famille doit comporter au moins 2 caractères').optional(),
  phone: z.string().min(8, 'Numéro de téléphone requis (+221...)').optional(),
  whatsapp_phone: z.string().optional(),
  business_name: z.string().min(2, 'Le nom de l’entreprise doit comporter au moins 2 caractères').optional(),
  business_type: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  quartier: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  logo_url: z.string().optional()
});

export const productSchema = z.object({
  name: z.string().min(2, 'Le nom du produit est requis'),
  description: z.string().optional(),
  price: z.number().nonnegative('Le prix doit être positif'),
  stock: z.number().int().nonnegative().default(0),
  image_url: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  city: z.string().optional(),
  quartier: z.string().optional(),
  location: z.string().optional()
});

export const updateProductSchema = z.object({
  name: z.string().min(2, 'Le nom du produit est requis').optional(),
  description: z.string().optional(),
  price: z.number().nonnegative('Le prix doit être positif').optional(),
  stock: z.number().int().nonnegative().optional(),
  image_url: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  city: z.string().optional(),
  quartier: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'INACTIVE']).optional(),
  is_active: z.boolean().optional()
});

export const updateProductStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'INACTIVE']).optional(),
  is_active: z.boolean().optional()
});

export const updateStockSchema = z.object({
  stock: z.number().int().nonnegative('La quantité de stock doit être supérieure ou égale à 0')
});

export const topUpSchema = z.object({
  amount: z.number().positive('Le montant de rechargement doit être supérieur à 0 FCFA'),
  payment_method: z.string().optional(),
  phone: z.string().optional()
});

export const validateDeliveryCodeSchema = z.object({
  code: z.string().min(4, 'Code secret trop court').max(10, 'Code secret trop long')
});

export const disputeSchema = z.object({
  reason: z.string().min(2, 'Le motif du litige est requis'),
  description: z.string().optional(),
  evidence_urls: z.array(z.string()).optional()
});

export const inviteMemberSchema = z.object({
  phone: z.string().min(8, 'Numéro de téléphone requis (+221...)')
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING'], {
    errorMap: () => ({ message: 'Statut invalide (ACTIVE, SUSPENDED ou PENDING attendu)' })
  })
});

export const resolveDisputeSchema = z.object({
  resolution: z.enum(['REFUND_BUYER', 'RELEASE_MERCHANT'], {
    errorMap: () => ({ message: 'Type de résolution invalide (REFUND_BUYER ou RELEASE_MERCHANT attendu)' })
  }),
  notes: z.string().optional()
});

export const kycSubmitSchema = z.object({
  legal_business_name: z.string().min(2, 'Le nom commercial ou raison sociale est requis'),
  registration_number_ninea: z.string().optional(),
  document_type: z.enum(['NATIONAL_ID', 'PASSPORT', 'COMMERCE_REGISTER', 'DRIVING_LICENSE']).default('NATIONAL_ID'),
  document_url: z.string().optional()
});

export const kycReviewSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'SUSPENDED'], {
    errorMap: () => ({ message: 'Statut de vérification invalide (VERIFIED, REJECTED ou SUSPENDED attendu)' })
  }),
  rejection_reason: z.string().optional()
});

export const earlyAccessSchema = z.object({
  first_name: z.string().min(2, 'Le prénom doit comporter au moins 2 caractères'),
  last_name: z.string().min(2, 'Le nom de famille doit comporter au moins 2 caractères'),
  phone: z.string().min(8, 'Numéro de téléphone requis (+221...)'),
  email: z.string().email('Adresse e-mail valide requise'),
  profile_type: z.enum(['PARTICULIER', 'COMMERCANT', 'ENTREPRENEUR']).default('PARTICULIER'),
  city: z.string().min(2, 'Ville requise (ex: Dakar, Thiès, Touba...)'),
  notes: z.string().optional(),
  honeypot: z.string().optional()
});

export const contactSchema = z.object({
  name: z.string().min(2, 'Nom complet requis'),
  email: z.string().email('Adresse e-mail valide requise'),
  phone: z.string().optional(),
  category: z.enum([
    'SUPPORT',
    'PAIEMENT',
    'SEQUESTRE',
    'COMPTE',
    'COMMERCANT',
    'FACTURE',
    'BUG',
    'PARTENARIAT',
    'AUTRE'
  ]).default('SUPPORT'),
  subject: z.string().min(3, 'Le sujet doit comporter au moins 3 caractères'),
  message: z.string().min(10, 'Le message doit comporter au moins 10 caractères'),
  honeypot: z.string().optional()
});


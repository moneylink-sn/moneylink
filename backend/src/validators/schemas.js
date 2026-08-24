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

export const productSchema = z.object({
  name: z.string().min(2, 'Le nom du produit est requis'),
  description: z.string().optional(),
  price: z.number().nonnegative('Le prix doit être positif'),
  stock: z.number().int().nonnegative().default(0),
  image_url: z.string().url().optional(),
  category: z.string().optional()
});

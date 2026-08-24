import 'package:flutter/material.dart';

class AppConstants {
  static const String appName = 'MoneyLink';
  static const String appTagline = 'Paiement Sécurisé & Séquestre au Sénégal';
  
  // URL de base de l'API Backend (Configurable via --dart-define=API_BASE_URL=https://api.moneylink.sn/api)
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:5000/api',
  );

  // Couleurs de la charte MoneyLink
  static const Color primary = Color(0xFF00A86B); // Vert Émeraude FinTech
  static const Color primaryDark = Color(0xFF007A4D);
  static const Color primaryLight = Color(0xFFE8F8F2);
  
  static const Color secondary = Color(0xFF1E293B); // Bleu nuit profond
  static const Color accentGold = Color(0xFFF59E0B); // Or pour les alertes/séquestre
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Colors.white;
  
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textLight = Color(0xFF94A3B8);

  static const Color danger = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color success = Color(0xFF10B981);
  static const Color info = Color(0xFF3B82F6);
}

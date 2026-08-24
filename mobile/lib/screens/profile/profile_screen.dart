import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/mk_logo.dart';
import '../../providers/auth_provider.dart';
import '../auth/login_screen.dart';
import '../subscription/subscription_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final wallet = auth.wallet;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon Profil'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          children: [
            // Avatar & Nom
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: AppConstants.primaryLight,
                    backgroundImage: user?.avatarUrl != null ? NetworkImage(user!.avatarUrl!) : null,
                    child: user?.avatarUrl == null
                        ? Text(
                            user?.firstName.substring(0, 1) ?? 'U',
                            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppConstants.primaryDark),
                          )
                        : null,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user?.fullName ?? 'Utilisateur MoneyLink',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.phone ?? '',
                    style: const TextStyle(color: AppConstants.textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppConstants.primaryLight,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      user?.role == 'MERCHANT' ? 'COMPTE COMMERÇANT PRO' : 'COMPTE CLIENT PARTICULIER',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppConstants.primaryDark,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Carte Synthèse Portefeuille
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      const Text('Disponible', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
                      const SizedBox(height: 4),
                      Text(
                        Formatters.formatFCFA(wallet?.availableBalance ?? 0),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppConstants.primaryDark),
                      ),
                    ],
                  ),
                  Container(width: 1, height: 35, color: const Color(0xFFE2E8F0)),
                  Column(
                    children: [
                      const Text('En Séquestre 🔒', style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
                      const SizedBox(height: 4),
                      Text(
                        Formatters.formatFCFA(wallet?.lockedBalance ?? 0),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppConstants.warning),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Paramètres & Options
            _buildProfileTile(
              Icons.card_membership_outlined,
              'Mon abonnement (${user?.isSubscriptionTrial == true ? 'Essai gratuit' : '500 FCFA/mois'})',
              () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SubscriptionScreen()),
                );
              },
              badge: user?.isSubscriptionTrial == true ? '30j OFFERTS' : 'ACTIF',
            ),
            _buildProfileTile(Icons.security_outlined, 'Sécurité & Code PIN', () {}),
            _buildProfileTile(Icons.account_balance_outlined, 'Comptes Bancaires & Mobile Money liés', () {}),
            _buildProfileTile(Icons.verified_outlined, 'Vérification d’identité (KYC)', () {}),
            _buildProfileTile(Icons.help_outline, 'Aide & Support Client Sénégal', () {}),
            _buildProfileTile(
              Icons.info_outline,
              'À propos de MoneyLink 🇸🇳',
              () => _showAboutDialog(context),
            ),

            const SizedBox(height: 32),

            // Bouton Déconnexion
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppConstants.danger,
                  side: const BorderSide(color: AppConstants.danger),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () async {
                  await auth.logout();
                  if (context.mounted) {
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                      (route) => false,
                    );
                  }
                },
                icon: const Icon(Icons.logout),
                label: const Text('Se déconnecter'),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const MkLogo(
              size: 56,
              fontSize: 22,
              showText: true,
              isVertical: true,
              subtitle: 'FinTech Sénégal • Tiers de Confiance',
              titleColor: AppConstants.textPrimary,
              subtitleColor: AppConstants.textSecondary,
              spacing: 12,
            ),
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 12),
            const Text(
              'MoneyLink',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppConstants.textPrimary),
            ),
            const SizedBox(height: 6),
            const Text(
              'Plateforme fintech sénégalaise de paiement et de confiance.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppConstants.textSecondary, height: 1.4),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppConstants.primaryLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Column(
                children: [
                  Text('Créateur :', style: TextStyle(fontSize: 11, color: AppConstants.primaryDark)),
                  SizedBox(height: 2),
                  Text(
                    'Codé Samb',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppConstants.primaryDark),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Version 1.0.0 • Dakar, Sénégal',
              style: TextStyle(fontSize: 11, color: AppConstants.textLight),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Fermer', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileTile(IconData icon, String title, VoidCallback onTap, {String? badge}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEDF2F7)),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppConstants.secondary),
        title: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (badge != null)
              Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppConstants.primaryLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  badge,
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppConstants.primaryDark),
                ),
              ),
            const Icon(Icons.arrow_forward_ios, size: 14, color: AppConstants.textLight),
          ],
        ),
        onTap: onTap,
      ),
    );
  }
}

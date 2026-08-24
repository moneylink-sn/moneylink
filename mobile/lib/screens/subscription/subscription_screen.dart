import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/mk_logo.dart';
import '../../providers/auth_provider.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  String _selectedGateway = 'WAVE';
  bool _isLoading = false;

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'Non renseignée';
    try {
      final dt = DateTime.parse(dateStr);
      return DateFormat('dd/MM/yyyy').format(dt);
    } catch (_) {
      return dateStr;
    }
  }

  void _showPaymentModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Renouvellement Abonnement',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppConstants.textPrimary),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: AppConstants.textSecondary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Abonnement MoneyLink Premium (30 jours de protection & services sécurisés)',
                style: TextStyle(color: AppConstants.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 20),

              // Montant
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppConstants.primaryLight,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppConstants.primary.withValues(alpha: 0.2)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Montant mensuel', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    Text(
                      Formatters.formatFCFA(500),
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppConstants.primaryDark),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              const Text(
                'Choisir votre moyen de paiement Mobile Money',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppConstants.textPrimary),
              ),
              const SizedBox(height: 12),

              // Option Wave
              _buildGatewayOption(
                id: 'WAVE',
                title: 'Wave Sénégal 🐧',
                subtitle: 'Paiement direct 1% sans frais additionnels',
                isSelected: _selectedGateway == 'WAVE',
                onTap: () => setModalState(() => _selectedGateway = 'WAVE'),
              ),
              const SizedBox(height: 10),

              // Option Orange Money
              _buildGatewayOption(
                id: 'ORANGE_MONEY',
                title: 'Orange Money Sénégal 🍊',
                subtitle: 'Validation par code secret ou notification Max',
                isSelected: _selectedGateway == 'ORANGE_MONEY',
                onTap: () => setModalState(() => _selectedGateway = 'ORANGE_MONEY'),
              ),
              const SizedBox(height: 24),

              // Info sécurité
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.shield_outlined, color: AppConstants.primary, size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Passerelle sécurisée. La validation finale s’effectuera directement sur l’application de votre opérateur.',
                        style: TextStyle(fontSize: 11, color: AppConstants.textSecondary, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Bouton Confirmer
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppConstants.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: _isLoading
                      ? null
                      : () {
                          Navigator.pop(ctx);
                          _handlePaymentInitiation(_selectedGateway);
                        },
                  child: _isLoading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(
                          'Payer 500 FCFA avec ${_selectedGateway == 'WAVE' ? 'Wave' : 'Orange Money'}',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGatewayOption({
    required String id,
    required String title,
    required String subtitle,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? AppConstants.primaryLight : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppConstants.primary : const Color(0xFFE2E8F0),
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: isSelected ? AppConstants.primary : AppConstants.textLight,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 11, color: AppConstants.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handlePaymentInitiation(String gateway) async {
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 900));
    setState(() => _isLoading = false);

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.info_outline, color: AppConstants.primary),
            const SizedBox(width: 8),
            Text('Paiement ${gateway == 'WAVE' ? 'Wave' : 'Orange Money'}', style: const TextStyle(fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'L’intention de paiement de 500 FCFA a été transmise à la passerelle.',
              style: TextStyle(fontSize: 14, height: 1.4),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                gateway == 'WAVE'
                    ? 'Connecteur Wave prêt : En production, l’utilisateur est redirigé vers l’application Wave pour validation 2FA.'
                    : 'Connecteur Orange Money prêt : En production, l’utilisateur valide par USSD (#144#) ou notification OM.',
                style: const TextStyle(fontSize: 12, color: AppConstants.textSecondary),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Compris', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    final isTrial = user?.isSubscriptionTrial ?? true;
    final isExpired = user?.isSubscriptionExpired ?? false;
    final daysLeft = user?.daysRemaining ?? 30;

    Color statusColor = AppConstants.primary;
    String statusLabel = 'Essai Gratuit Actif (30 jours)';

    if (isExpired) {
      statusColor = AppConstants.danger;
      statusLabel = 'Abonnement Expiré';
    } else if (!isTrial && (user?.isSubscriptionActive ?? false)) {
      statusColor = AppConstants.success;
      statusLabel = 'Abonnement Premium Actif';
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon Abonnement'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Carte Premium Hero
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppConstants.secondary,
                    Color(0xFF0F172A),
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.12),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const MkLogo(
                        size: 40,
                        fontSize: 16,
                        showText: true,
                        titleColor: Colors.white,
                        hasGlow: true,
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                        ),
                        child: const Text(
                          'PREMIUM',
                          style: TextStyle(
                            color: Color(0xFFF59E0B),
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'MoneyLink Premium',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Paiements sécurisés sous séquestre illimités & coffres d’épargne verrouillés.',
                    style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.75), height: 1.4),
                  ),
                  const SizedBox(height: 20),
                  const Divider(color: Colors.white24),
                  const SizedBox(height: 12),

                  // Tarification
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Premier mois', style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.6))),
                          const SizedBox(height: 2),
                          const Text('GRATUIT (30 jours)', style: TextStyle(color: Color(0xFF00E59B), fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('À partir du 2ème mois', style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.6))),
                          const SizedBox(height: 2),
                          const Text('500 FCFA / mois', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Détails du Statut Actuel
            const Text(
              'Statut de votre compte',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppConstants.textPrimary),
            ),
            const SizedBox(height: 12),

            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFEDF2F7)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Statut actuel', style: TextStyle(color: AppConstants.textSecondary, fontSize: 13)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          statusLabel,
                          style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Date de début', style: TextStyle(color: AppConstants.textSecondary, fontSize: 13)),
                      Text(
                        _formatDate(user?.subscriptionStartDate),
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Date d’expiration', style: TextStyle(color: AppConstants.textSecondary, fontSize: 13)),
                      Text(
                        _formatDate(user?.subscriptionEndDate),
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Jours restants', style: TextStyle(color: AppConstants.textSecondary, fontSize: 13)),
                      Text(
                        '$daysLeft jour${daysLeft > 1 ? 's' : ''}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: daysLeft <= 5 ? AppConstants.danger : AppConstants.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Avantages inclus
            const Text(
              'Ce qui est inclus dans votre abonnement',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppConstants.textPrimary),
            ),
            const SizedBox(height: 12),

            _buildBenefitItem(Icons.verified_user_outlined, 'Paiements sous séquestre illimités avec code OTP'),
            _buildBenefitItem(Icons.lock_clock_outlined, 'Coffres d’épargne bloqués à taux garanti'),
            _buildBenefitItem(Icons.support_agent_outlined, 'Arbitrage prioritaire des litiges par l’administrateur'),
            _buildBenefitItem(Icons.phone_android_outlined, 'Recharges instantanées Wave & Orange Money'),

            const SizedBox(height: 32),

            // Bouton de Paiement
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () => _showPaymentModal(context),
                icon: const Icon(Icons.payment),
                label: const Text(
                  'Payer 500 FCFA (Renouveler)',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildBenefitItem(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppConstants.primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: AppConstants.primaryDark),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(text, style: const TextStyle(fontSize: 13, color: AppConstants.textPrimary)),
          ),
        ],
      ),
    );
  }
}

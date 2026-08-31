import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../providers/auth_provider.dart';
import '../../providers/payment_provider.dart';

class DirectPaymentScreen extends StatefulWidget {
  const DirectPaymentScreen({super.key});

  @override
  State<DirectPaymentScreen> createState() => _DirectPaymentScreenState();
}

class _DirectPaymentScreenState extends State<DirectPaymentScreen> {
  final _phoneController = TextEditingController();
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();
  final _reasonController = TextEditingController();
  final _orderRefController = TextEditingController();

  String _selectedMethod = 'WAVE_MOCK'; // WAVE_MOCK, OM_MOCK, WALLET
  bool _useEscrowProtection = true;

  @override
  Widget build(BuildContext context) {
    final paymentProv = Provider.of<PaymentProvider>(context);
    final authProv = Provider.of<AuthProvider>(context);
    final wallet = authProv.wallet;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Paiement Sécurisé'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Sélecteur Mode Séquestre / Tiers de Confiance
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppConstants.primaryLight,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppConstants.primary.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.shield_rounded, color: AppConstants.primaryDark, size: 28),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Protection Séquestre MoneyLink',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppConstants.primaryDark,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'L’argent sera retenu jusqu’à votre confirmation de réception.',
                            style: TextStyle(fontSize: 12, color: AppConstants.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _useEscrowProtection,
                      activeThumbColor: AppConstants.primary,
                      onChanged: (val) => setState(() => _useEscrowProtection = val),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              const Text('Informations du Bénéficiaire', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),

              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Numéro de téléphone du vendeur',
                  hintText: '+221 77 123 45 67',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Nom ou Boutique du vendeur',
                  hintText: 'Ex: Diop Sports Dakar',
                  prefixIcon: Icon(Icons.store_outlined),
                ),
              ),
              const SizedBox(height: 20),

              const Text('Détails de la Transaction', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),

              TextField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Montant à payer (FCFA)',
                  hintText: 'Ex: 25 000',
                  prefixIcon: Icon(Icons.payments_outlined),
                  suffixText: 'FCFA',
                ),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: _reasonController,
                decoration: const InputDecoration(
                  labelText: 'Motif du paiement',
                  hintText: 'Ex: Achat Sneakers & Maillot',
                  prefixIcon: Icon(Icons.description_outlined),
                ),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: _orderRefController,
                decoration: const InputDecoration(
                  labelText: 'Référence de commande (optionnel)',
                  hintText: 'Ex: CMD-2026-884',
                  prefixIcon: Icon(Icons.tag_outlined),
                ),
              ),
              const SizedBox(height: 24),

              const Text('Moyen de Paiement', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),

              _buildPaymentOption(
                id: 'WAVE_MOCK',
                title: 'Wave Sénégal',
                subtitle: 'Sans frais supplémentaires',
                icon: Icons.waves_outlined,
                color: const Color(0xFF1EA1F2),
              ),
              const SizedBox(height: 10),

              _buildPaymentOption(
                id: 'OM_MOCK',
                title: 'Orange Money Sénégal',
                subtitle: 'Paiement direct via compte OM',
                icon: Icons.phone_android_outlined,
                color: const Color(0xFFFF6600),
              ),
              const SizedBox(height: 10),

              _buildPaymentOption(
                id: 'WALLET',
                title: 'Solde MoneyLink',
                subtitle: 'Disponible : ${Formatters.formatFCFA(wallet?.availableBalance ?? 0)}',
                icon: Icons.account_balance_wallet_outlined,
                color: AppConstants.primary,
              ),
              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: paymentProv.isLoading ? null : _submitPayment,
                  child: paymentProv.isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Confirmer & Verrouiller en Séquestre 🔒'),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentOption({
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    final isSelected = _selectedMethod == id;

    return GestureDetector(
      onTap: () => setState(() => _selectedMethod = id),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppConstants.primary : const Color(0xFFE2E8F0),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  Text(subtitle, style: const TextStyle(color: AppConstants.textSecondary, fontSize: 12)),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle_rounded, color: AppConstants.primary)
            else
              const Icon(Icons.radio_button_off_rounded, color: AppConstants.textLight),
          ],
        ),
      ),
    );
  }

  void _submitPayment() {
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez saisir un montant valide')),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Confirmation de Séquestre'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Montant : ${Formatters.formatFCFA(amount)}'),
            const SizedBox(height: 6),
            Text('Bénéficiaire : ${_nameController.text.isEmpty ? "Vendeur" : _nameController.text}'),
            const SizedBox(height: 12),
            const Text(
              '⚠️ Ce montant ne sera versé au vendeur que lorsque vous aurez validé la réception du colis.',
              style: TextStyle(fontSize: 12, color: AppConstants.textSecondary),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: AppConstants.success,
                  content: Text('Paiement sécurisé effectué avec succès !'),
                ),
              );
            },
            child: const Text('Valider le paiement'),
          ),
        ],
      ),
    );
  }
}

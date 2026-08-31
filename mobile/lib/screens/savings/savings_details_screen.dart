import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../providers/savings_provider.dart';
import '../../providers/auth_provider.dart';

class SavingsDetailsScreen extends StatefulWidget {
  final dynamic goal;

  const SavingsDetailsScreen({super.key, required this.goal});

  @override
  State<SavingsDetailsScreen> createState() => _SavingsDetailsScreenState();
}

class _SavingsDetailsScreenState extends State<SavingsDetailsScreen> {
  final _amountController = TextEditingController();
  final _phoneInviteController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final goal = widget.goal;

    return Scaffold(
      appBar: AppBar(
        title: Text(goal.title),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Jauge Principale & Montants
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        goal.isCollective ? 'Tontine Collective 🤝' : 'Coffre Individuel 🎯',
                        style: const TextStyle(color: AppConstants.textSecondary, fontSize: 13),
                      ),
                      Text(
                        'Échéance : ${Formatters.formatDateShort(goal.targetDate)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    Formatters.formatFCFA(goal.currentAmount),
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: AppConstants.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'sur un objectif de ${Formatters.formatFCFA(goal.targetAmount)}',
                    style: const TextStyle(color: AppConstants.textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 18),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: (goal.progressPercent / 100).clamp(0.0, 1.0),
                      minHeight: 12,
                      backgroundColor: const Color(0xFFE2E8F0),
                      valueColor: const AlwaysStoppedAnimation<Color>(AppConstants.primary),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Reste : ${Formatters.formatFCFA(goal.remainingAmount)}', style: const TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
                      Text('${goal.progressPercent}% Atteint', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppConstants.primaryDark)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Boutons d'Action (Verser / Inviter)
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: AppConstants.primary,
                    ),
                    onPressed: () => _showContributeDialog(context, goal.id),
                    icon: const Icon(Icons.add_circle_outline, size: 20),
                    label: const Text('Faire un versement'),
                  ),
                ),
                if (goal.isCollective) ...[
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                    ),
                    onPressed: () => _showInviteDialog(context, goal.id),
                    icon: const Icon(Icons.person_add_outlined, size: 20),
                    label: const Text('Inviter'),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 28),

            // Liste des membres si coffre collectif
            if (goal.isCollective) ...[
              const Text('Participants à la Tontine', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFEDF2F7)),
                ),
                child: const Column(
                  children: [
                    ListTile(
                      leading: CircleAvatar(child: Text('A')),
                      title: Text('Awa Sow (Créatrice)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      trailing: Text('120 000 FCFA', style: TextStyle(fontWeight: FontWeight.bold, color: AppConstants.primaryDark)),
                    ),
                    Divider(),
                    ListTile(
                      leading: CircleAvatar(child: Text('M')),
                      title: Text('Moussa Fall', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      trailing: Text('80 000 FCFA', style: TextStyle(fontWeight: FontWeight.bold, color: AppConstants.primaryDark)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            const Text('Rappel Automatique MoneyLink 🔔', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.alarm_on_outlined, color: AppConstants.warning),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Un rappel vous sera envoyé 48h avant l’échéance pour finaliser votre objectif.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF92400E)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showContributeDialog(BuildContext context, String goalId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Alimenter le Coffre', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Montant à verser (FCFA)',
                prefixIcon: Icon(Icons.payments_outlined),
                suffixText: 'FCFA',
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  final amount = double.tryParse(_amountController.text.trim()) ?? 0;
                  if (amount > 0) {
                    Navigator.pop(ctx);
                    final savingsProv = Provider.of<SavingsProvider>(context, listen: false);
                    final success = await savingsProv.contribute(goalId, amount);
                    if (success && context.mounted) {
                      await Provider.of<AuthProvider>(context, listen: false).refreshWallet();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Versement de ${Formatters.formatFCFA(amount)} enregistré avec succès !')),
                      );
                      Navigator.pop(context);
                    }
                  }
                },
                child: const Text('Confirmer le versement'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showInviteDialog(BuildContext context, String goalId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Inviter un Participant'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Saisissez le numéro de téléphone de votre proche (+221...) pour l’ajouter à cette tontine :',
              style: TextStyle(fontSize: 12, color: AppConstants.textSecondary),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneInviteController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(hintText: '+221 77 123 45 67'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              final phone = _phoneInviteController.text.trim();
              if (phone.isNotEmpty) {
                Navigator.pop(ctx);
                final savingsProv = Provider.of<SavingsProvider>(context, listen: false);
                final success = await savingsProv.inviteMember(goalId, phone);
                if (success && context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Invitation envoyée à $phone')),
                  );
                }
              }
            },
            child: const Text('Envoyer l’invitation'),
          ),
        ],
      ),
    );
  }
}

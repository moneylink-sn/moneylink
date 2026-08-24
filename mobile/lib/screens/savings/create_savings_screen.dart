import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../providers/savings_provider.dart';

class CreateSavingsScreen extends StatefulWidget {
  const CreateSavingsScreen({super.key});

  @override
  State<CreateSavingsScreen> createState() => _CreateSavingsScreenState();
}

class _CreateSavingsScreenState extends State<CreateSavingsScreen> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _targetAmountController = TextEditingController();
  final _initialAmountController = TextEditingController(text: '0');

  String _selectedType = 'PERSONAL'; // PERSONAL ou COLLECTIVE
  String _selectedFrequency = 'MONTHLY';
  DateTime _targetDate = DateTime.now().add(const Duration(days: 90));

  @override
  Widget build(BuildContext context) {
    final savingsProv = Provider.of<SavingsProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouveau Coffre d’Épargne'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Type de Coffre', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('Coffre Personnel')),
                      selected: _selectedType == 'PERSONAL',
                      onSelected: (val) {
                        if (val) setState(() => _selectedType = 'PERSONAL');
                      },
                      selectedColor: AppConstants.primaryLight,
                      labelStyle: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _selectedType == 'PERSONAL' ? AppConstants.primaryDark : AppConstants.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('Tontine Collective')),
                      selected: _selectedType == 'COLLECTIVE',
                      onSelected: (val) {
                        if (val) setState(() => _selectedType = 'COLLECTIVE');
                      },
                      selectedColor: const Color(0xFFEEF2FF),
                      labelStyle: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _selectedType == 'COLLECTIVE' ? const Color(0xFF4F46E5) : AppConstants.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              const Text('Nom du Projet / Objectif', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(
                controller: _titleController,
                decoration: const InputDecoration(
                  hintText: 'Ex: Achat Ordinateur, Voyage Tabaski',
                  prefixIcon: Icon(Icons.flag_outlined),
                ),
              ),
              const SizedBox(height: 16),

              const Text('Montant Cible (FCFA)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(
                controller: _targetAmountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  hintText: 'Ex: 350 000',
                  prefixIcon: Icon(Icons.payments_outlined),
                  suffixText: 'FCFA',
                ),
              ),
              const SizedBox(height: 16),

              const Text('Dépôt Initial (Optionnel)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(
                controller: _initialAmountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  hintText: '0',
                  prefixIcon: Icon(Icons.account_balance_wallet_outlined),
                  suffixText: 'FCFA',
                ),
              ),
              const SizedBox(height: 16),

              const Text('Date d’Échéance Cible', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              GestureDetector(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _targetDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
                  );
                  if (picked != null) setState(() => _targetDate = picked);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${_targetDate.day.toString().padLeft(2, '0')}/${_targetDate.month.toString().padLeft(2, '0')}/${_targetDate.year}',
                        style: const TextStyle(fontSize: 15),
                      ),
                      const Icon(Icons.calendar_today_outlined, size: 20, color: AppConstants.textSecondary),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 28),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: savingsProv.isLoading ? null : _handleCreate,
                  child: savingsProv.isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Créer le Coffre MoneyLink'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleCreate() async {
    final title = _titleController.text.trim();
    final targetAmount = double.tryParse(_targetAmountController.text.trim()) ?? 0;
    final initialAmount = double.tryParse(_initialAmountController.text.trim()) ?? 0;

    if (title.isEmpty || targetAmount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez renseigner un titre et un montant cible valide')),
      );
      return;
    }

    final savingsProv = Provider.of<SavingsProvider>(context, listen: false);
    final targetDateStr = _targetDate.toIso8601String().split('T')[0];

    final success = await savingsProv.createGoal(
      title: title,
      description: _descriptionController.text.trim(),
      targetAmount: targetAmount,
      targetDate: targetDateStr,
      type: _selectedType,
      frequency: _selectedFrequency,
      initialAmount: initialAmount,
    );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppConstants.success,
          content: Text('Coffre d’épargne créé avec succès !'),
        ),
      );
      Navigator.pop(context);
    }
  }
}

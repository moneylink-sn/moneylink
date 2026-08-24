import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../providers/savings_provider.dart';
import 'create_savings_screen.dart';
import 'savings_details_screen.dart';

class SavingsListScreen extends StatefulWidget {
  const SavingsListScreen({super.key});

  @override
  State<SavingsListScreen> createState() => _SavingsListScreenState();
}

class _SavingsListScreenState extends State<SavingsListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<SavingsProvider>(context, listen: false).fetchGoals();
    });
  }

  @override
  Widget build(BuildContext context) {
    final savingsProvider = Provider.of<SavingsProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('MoneyLink Coffre 💰'),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CreateSavingsScreen()),
              );
            },
            icon: const Icon(Icons.add_circle_outline, color: AppConstants.primary, size: 28),
          ),
        ],
      ),
      body: savingsProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => savingsProvider.fetchGoals(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Bannière Présentation Coffres
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1E293B), Color(0xFF334155)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppConstants.accentGold.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(Icons.savings_rounded, color: AppConstants.accentGold, size: 32),
                          ),
                          const SizedBox(width: 16),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Épargnez à votre rythme',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'Créez des coffres personnels ou des tontines collectives entre proches.',
                                  style: TextStyle(fontSize: 12, color: Colors.white70),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Coffres Personnels
                    const Text('Mes Projets & Coffres Personnels', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),

                    if (savingsProvider.personalGoals.isEmpty)
                      _buildEmptyState('Aucun coffre personnel créé.')
                    else
                      ...savingsProvider.personalGoals.map((goal) => _buildGoalCard(goal)),

                    const SizedBox(height: 24),

                    // Coffres Collectifs (Tontines)
                    const Text('Coffres Collectifs & Tontines 🤝', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),

                    if (savingsProvider.collectiveGoals.isEmpty)
                      _buildEmptyState('Aucune tontine collective active.')
                    else
                      ...savingsProvider.collectiveGoals.map((goal) => _buildGoalCard(goal)),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildEmptyState(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Center(
        child: Text(text, style: const TextStyle(color: AppConstants.textSecondary, fontSize: 13)),
      ),
    );
  }

  Widget _buildGoalCard(dynamic goal) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => SavingsDetailsScreen(goal: goal)),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    goal.title,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: goal.isCollective ? const Color(0xFFEEF2FF) : AppConstants.primaryLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    goal.isCollective ? 'Tontine (${goal.membersCount} pers)' : 'Personnel',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: goal.isCollective ? const Color(0xFF4F46E5) : AppConstants.primaryDark,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Collecté : ${Formatters.formatFCFA(goal.currentAmount)}',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppConstants.primaryDark),
                ),
                Text(
                  'Cible : ${Formatters.formatFCFA(goal.targetAmount)}',
                  style: const TextStyle(fontSize: 12, color: AppConstants.textSecondary),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Jauge de Progression
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: (goal.progressPercent / 100).clamp(0.0, 1.0),
                minHeight: 8,
                backgroundColor: const Color(0xFFE2E8F0),
                valueColor: const AlwaysStoppedAnimation<Color>(AppConstants.primary),
              ),
            ),
            const SizedBox(height: 8),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Échéance : ${Formatters.formatDateShort(goal.targetDate)}',
                  style: const TextStyle(fontSize: 11, color: AppConstants.textLight),
                ),
                Text(
                  '${goal.progressPercent}%',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppConstants.primaryDark),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

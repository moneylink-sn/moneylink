import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';
import '../../providers/payment_provider.dart';
import '../payment/direct_payment_screen.dart';
import '../notifications/notifications_screen.dart';
import '../orders/order_details_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _showBalance = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AuthProvider>(context, listen: false).loadProfile();
      Provider.of<OrderProvider>(context, listen: false).fetchOrders();
      Provider.of<PaymentProvider>(context, listen: false).fetchTransactions();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final orderProvider = Provider.of<OrderProvider>(context);
    final paymentProvider = Provider.of<PaymentProvider>(context);

    final user = auth.user;
    final wallet = auth.wallet;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await auth.loadProfile();
            await orderProvider.fetchOrders();
            await paymentProvider.fetchTransactions();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header (Profil & Notifications)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: AppConstants.primaryLight,
                          backgroundImage: user?.avatarUrl != null ? NetworkImage(user!.avatarUrl!) : null,
                          child: user?.avatarUrl == null
                              ? Text(
                                  user?.firstName.substring(0, 1) ?? 'M',
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppConstants.primaryDark),
                                )
                              : null,
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Bonjour, ${user?.firstName ?? "Client"} 👋',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppConstants.textPrimary,
                              ),
                            ),
                            Text(
                              user?.isMerchant == true ? 'Compte Commerçant Pro 🏪' : 'Particulier 🇸🇳',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppConstants.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                        );
                      },
                      icon: const Icon(Icons.notifications_outlined, color: AppConstants.textPrimary),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Carte du Solde FinTech (Disponible & Séquestre)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF007A4D), Color(0xFF00A86B)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: AppConstants.primary.withValues(alpha: 0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Solde Disponible',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => setState(() => _showBalance = !_showBalance),
                            child: Icon(
                              _showBalance ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                              color: Colors.white70,
                              size: 20,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _showBalance ? Formatters.formatFCFA(wallet?.availableBalance ?? 0) : '•••••••• FCFA',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.lock_clock_outlined, color: Colors.white, size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'En séquestre sécurisé : ${_showBalance ? Formatters.formatFCFA(wallet?.lockedBalance ?? 0) : "••••"}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Boutons d'Action Rapide
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildActionButton(
                      icon: Icons.shield_outlined,
                      label: 'Payer Sécurisé',
                      color: AppConstants.primary,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const DirectPaymentScreen()),
                        );
                      },
                    ),
                    _buildActionButton(
                      icon: Icons.send_outlined,
                      label: 'Envoyer',
                      color: AppConstants.secondary,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const DirectPaymentScreen()),
                        );
                      },
                    ),
                    _buildActionButton(
                      icon: Icons.qr_code_scanner_outlined,
                      label: 'Scanner QR',
                      color: const Color(0xFF6366F1),
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Scanner QR Code actif.')),
                        );
                      },
                    ),
                    _buildActionButton(
                      icon: Icons.add_card_outlined,
                      label: 'Recharger',
                      color: AppConstants.accentGold,
                      onTap: () {
                        _showTopUpDialog(context);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Bannière de Confiance Séquestre (Escrow Senegal)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF3B82F6),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.verified_user_outlined, color: Colors.white, size: 22),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Garantie MoneyLink Escrow',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: Color(0xFF1E3A8A),
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Votre argent reste bloqué jusqu’à ce que vous validiez votre colis avec le code OTP.',
                              style: TextStyle(fontSize: 11, color: Color(0xFF3B82F6)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Commandes Récentes (Suivi de livraison & Séquestre)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Mes Commandes Récentes',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                    ),
                    TextButton(
                      onPressed: () {
                        // Passer à l'onglet commandes
                      },
                      child: const Text('Voir tout'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                if (orderProvider.orders.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Text('Aucune commande enregistrée.'),
                    ),
                  )
                else
                  ...orderProvider.orders.take(2).map((order) => _buildOrderCard(context, order)),

                const SizedBox(height: 16),

                // Dernières Transactions
                const Text(
                  'Dernières Transactions',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),

                if (paymentProvider.transactions.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Text('Aucune transaction récente.'),
                    ),
                  )
                else
                  ...paymentProvider.transactions.take(3).map((txn) => _buildTransactionTile(txn)),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Column(
      children: [
        GestureDetector(
          onTap: onTap,
          child: Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(icon, color: color, size: 26),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppConstants.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildOrderCard(BuildContext context, dynamic order) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => OrderDetailsScreen(order: order)),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppConstants.primaryLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.shopping_bag_outlined, color: AppConstants.primaryDark),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Commande #${order.orderNumber}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    order.statusLabel,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: order.isConfirmed ? AppConstants.success : AppConstants.warning,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  Formatters.formatFCFA(order.totalAmount),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 4),
                const Icon(Icons.arrow_forward_ios, size: 12, color: AppConstants.textLight),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionTile(dynamic txn) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEDF2F7)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.swap_horiz, color: AppConstants.secondary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  txn.typeLabel,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                Text(
                  Formatters.formatDateShort(txn.createdAt),
                  style: const TextStyle(fontSize: 11, color: AppConstants.textSecondary),
                ),
              ],
            ),
          ),
          Text(
            Formatters.formatFCFA(txn.amount),
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
        ],
      ),
    );
  }

  void _showTopUpDialog(BuildContext context) {
    final amountController = TextEditingController(text: '25000');
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
            const Text(
              'Recharger mon portefeuille',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Montant en FCFA',
                prefixIcon: Icon(Icons.payments_outlined),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  final amount = double.tryParse(amountController.text) ?? 0;
                  if (amount > 0) {
                    Navigator.pop(ctx);
                    final paymentProv = Provider.of<PaymentProvider>(context, listen: false);
                    final success = await paymentProv.topUpWallet(
                      amount: amount,
                      paymentMethod: 'WAVE_MOCK',
                    );
                    if (success && context.mounted) {
                      await Provider.of<AuthProvider>(context, listen: false).refreshWallet();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Portefeuille rechargé de ${Formatters.formatFCFA(amount)}')),
                      );
                    }
                  }
                },
                child: const Text('Recharger via Wave Sénégal'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

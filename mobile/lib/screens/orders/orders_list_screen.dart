import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../providers/order_provider.dart';
import 'order_details_screen.dart';

class OrdersListScreen extends StatefulWidget {
  const OrdersListScreen({super.key});

  @override
  State<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends State<OrdersListScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<OrderProvider>(context, listen: false).fetchOrders();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final orderProvider = Provider.of<OrderProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes Commandes & Séquestres'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppConstants.primary,
          unselectedLabelColor: AppConstants.textSecondary,
          indicatorColor: AppConstants.primary,
          indicatorWeight: 3,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Toutes'),
            Tab(text: 'En attente'),
            Tab(text: 'Expédiées 🚚'),
            Tab(text: 'Litiges ⚠️'),
          ],
        ),
      ),
      body: orderProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildOrderList(orderProvider.orders),
                _buildOrderList(orderProvider.pendingOrders),
                _buildOrderList(orderProvider.shippedOrders),
                _buildOrderList(orderProvider.disputedOrders),
              ],
            ),
    );
  }

  Widget _buildOrderList(List<dynamic> orders) {
    if (orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 54, color: AppConstants.textLight.withValues(alpha: 0.6)),
            const SizedBox(height: 12),
            const Text(
              'Aucune commande dans cette catégorie',
              style: TextStyle(color: AppConstants.textSecondary, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: orders.length,
      itemBuilder: (context, index) {
        final order = orders[index];
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '#${order.orderNumber}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: order.isConfirmed
                            ? AppConstants.primaryLight
                            : order.isDisputed
                                ? const Color(0xFFFEE2E2)
                                : const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        order.statusLabel,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: order.isConfirmed
                              ? AppConstants.primaryDark
                              : order.isDisputed
                                  ? AppConstants.danger
                                  : AppConstants.warning,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  'Vendeur : ${order.merchantName ?? "Boutique Partenaire"}',
                  style: const TextStyle(color: AppConstants.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 4),
                Text(
                  'Date : ${Formatters.formatDate(order.createdAt)}',
                  style: const TextStyle(color: AppConstants.textLight, fontSize: 12),
                ),
                const Divider(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Montant Séquestré :',
                      style: TextStyle(fontSize: 13, color: AppConstants.textSecondary),
                    ),
                    Text(
                      Formatters.formatFCFA(order.totalAmount),
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppConstants.primaryDark),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

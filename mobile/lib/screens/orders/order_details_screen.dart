import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/utils/formatters.dart';
import '../../providers/order_provider.dart';
import '../../providers/auth_provider.dart';

class OrderDetailsScreen extends StatefulWidget {
  final dynamic order;

  const OrderDetailsScreen({super.key, required this.order});

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  final _codeController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final orderProvider = Provider.of<OrderProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final isMerchant = authProvider.user?.isMerchant ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Text('Commande #${order.orderNumber}'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Statut Badge & Montant
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Statut de la commande', style: TextStyle(color: AppConstants.textSecondary, fontSize: 13)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: order.isConfirmed ? AppConstants.primaryLight : const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          order.statusLabel,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: order.isConfirmed ? AppConstants.primaryDark : AppConstants.warning,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Montant Total Séquestré', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      Text(
                        Formatters.formatFCFA(order.totalAmount),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppConstants.primaryDark),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Encadré Code Secret OTP pour l'Acheteur
            if (!isMerchant && (order.isShipped || order.isPaymentConfirmed))
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF93C5FD)),
                ),
                child: Column(
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.vpn_key_outlined, color: Color(0xFF1D4ED8)),
                        SizedBox(width: 10),
                        Text(
                          'Votre Code Secret de Réception (OTP)',
                          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A), fontSize: 13),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: Text(
                        order.deliveryCode ?? '849201',
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 6,
                          color: Color(0xFF1E3A8A),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Ne communiquez ce code au livreur qu’une fois le colis vérifié et en votre possession.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11, color: Color(0xFF2563EB)),
                    ),
                  ],
                ),
              ),

            // Saisie du code par le Commerçant / Livreur
            if (isMerchant && order.isShipped)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Valider la remise en main propre',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Demandez le code à 6 chiffres au client pour débloquer votre paiement instantanément :',
                      style: TextStyle(fontSize: 12, color: AppConstants.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _codeController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        hintText: 'Ex: 849201',
                        prefixIcon: Icon(Icons.key),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () async {
                          final code = _codeController.text.trim();
                          if (code.isNotEmpty) {
                            final success = await orderProvider.validateDeliveryCode(order.id, code);
                            if (success && context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Paiement débloqué avec succès !')),
                              );
                              Navigator.pop(context);
                            }
                          }
                        },
                        child: const Text('Valider le code & Débloquer les fonds'),
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 20),

            // Détails de la livraison
            const Text('Informations de Livraison', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFEDF2F7)),
              ),
              child: Column(
                children: [
                  _buildDetailRow(Icons.location_on_outlined, 'Adresse', order.deliveryAddress),
                  const Divider(height: 18),
                  _buildDetailRow(Icons.phone_outlined, 'Téléphone', order.deliveryPhone),
                  if (order.deliveryNotes != null && order.deliveryNotes!.isNotEmpty) ...[
                    const Divider(height: 18),
                    _buildDetailRow(Icons.notes_outlined, 'Instructions', order.deliveryNotes!),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Boutons d'action pour le Client
            if (!isMerchant && !order.isConfirmed && !order.isDisputed) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppConstants.primary),
                  onPressed: () async {
                    final success = await orderProvider.confirmReceipt(order.id);
                    if (success && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Réception confirmée avec succès !')),
                      );
                      Navigator.pop(context);
                    }
                  },
                  child: const Text('J’ai bien reçu ma commande (Confirmer)'),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppConstants.danger,
                    side: const BorderSide(color: AppConstants.danger),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () => _showDisputeDialog(context, order.id),
                  child: const Text('Signaler un problème / Litige ⚠️'),
                ),
              ),
            ],
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppConstants.textSecondary),
        const SizedBox(width: 10),
        Text('$label : ', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(color: AppConstants.textSecondary, fontSize: 13),
          ),
        ),
      ],
    );
  }

  void _showDisputeDialog(BuildContext context, String orderId) {
    final reasonController = TextEditingController(text: 'Produit défectueux ou non conforme');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Ouvrir un Litige'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'En ouvrant un litige, les fonds restent bloqués sous séquestre jusqu’à examen des preuves par l’administrateur MoneyLink.',
              style: TextStyle(fontSize: 12, color: AppConstants.textSecondary),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(labelText: 'Description du problème'),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppConstants.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              final orderProv = Provider.of<OrderProvider>(context, listen: false);
              final success = await orderProv.openDispute(
                orderId,
                'DAMAGED',
                reasonController.text.trim(),
              );
              if (success && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Litige ouvert. Les fonds sont gelés.')),
                );
                Navigator.pop(context);
              }
            },
            child: const Text('Confirmer le Litige'),
          ),
        ],
      ),
    );
  }
}

class TransactionModel {
  final String id;
  final String reference;
  final String? senderId;
  final String? receiverId;
  final String? orderId;
  final String type; // ESCROW_LOCK, ESCROW_RELEASE, ESCROW_REFUND, DEPOSIT, etc.
  final double amount;
  final double fee;
  final String currency;
  final String paymentMethod;
  final String status;
  final String createdAt;

  TransactionModel({
    required this.id,
    required this.reference,
    this.senderId,
    this.receiverId,
    this.orderId,
    required this.type,
    required this.amount,
    required this.fee,
    required this.currency,
    required this.paymentMethod,
    required this.status,
    required this.createdAt,
  });

  String get typeLabel {
    switch (type) {
      case 'ESCROW_LOCK':
        return 'Paiement Séquestré 🔒';
      case 'ESCROW_RELEASE':
        return 'Fonds Débloqués 💰';
      case 'ESCROW_REFUND':
        return 'Remboursement Séquestre 🔄';
      case 'DEPOSIT':
        return 'Rechargement Solde 📥';
      case 'SAVINGS_DEPOSIT':
        return 'Versement Coffre 🎯';
      default:
        return type;
    }
  }

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    return TransactionModel(
      id: json['id'] ?? '',
      reference: json['reference'] ?? '',
      senderId: json['sender_id'],
      receiverId: json['receiver_id'],
      orderId: json['order_id'],
      type: json['type'] ?? 'PAYMENT',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      fee: (json['fee'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] ?? 'XOF',
      paymentMethod: json['payment_method'] ?? 'WAVE_MOCK',
      status: json['status'] ?? 'SUCCESS',
      createdAt: json['created_at'] ?? DateTime.now().toIso8601String(),
    );
  }
}

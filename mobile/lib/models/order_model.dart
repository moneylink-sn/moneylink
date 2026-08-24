class OrderItemModel {
  final String id;
  final String productId;
  final String productName;
  final int quantity;
  final double unitPrice;
  final double totalPrice;

  OrderItemModel({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      id: json['id'] ?? '',
      productId: json['product_id'] ?? '',
      productName: json['product_name'] ?? 'Article',
      quantity: json['quantity'] ?? 1,
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0.0,
      totalPrice: (json['total_price'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class OrderModel {
  final String id;
  final String orderNumber;
  final String buyerId;
  final String merchantId;
  final String? merchantName;
  final String? buyerName;
  final double totalAmount;
  final double escrowAmount;
  final double serviceFee;
  final String status;
  final String? deliveryCode;
  final String deliveryAddress;
  final String deliveryPhone;
  final String? deliveryNotes;
  final String? paidAt;
  final String? shippedAt;
  final String? deliveredAt;
  final String? confirmedAt;
  final String createdAt;
  final List<OrderItemModel> items;

  OrderModel({
    required this.id,
    required this.orderNumber,
    required this.buyerId,
    required this.merchantId,
    this.merchantName,
    this.buyerName,
    required this.totalAmount,
    required this.escrowAmount,
    required this.serviceFee,
    required this.status,
    this.deliveryCode,
    required this.deliveryAddress,
    required this.deliveryPhone,
    this.deliveryNotes,
    this.paidAt,
    this.shippedAt,
    this.deliveredAt,
    this.confirmedAt,
    required this.createdAt,
    required this.items,
  });

  bool get isPendingPayment => status == 'PENDING_PAYMENT';
  bool get isPaymentConfirmed => status == 'PAYMENT_CONFIRMED';
  bool get isShipped => status == 'SHIPPED';
  bool get isDelivered => status == 'DELIVERED';
  bool get isConfirmed => status == 'CONFIRMED';
  bool get isDisputed => status == 'DISPUTED';
  bool get isRefunded => status == 'REFUNDED';

  String get statusLabel {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'En attente de paiement';
      case 'PAYMENT_CONFIRMED':
        return 'Payé (Fonds sous séquestre)';
      case 'PROCESSING':
        return 'En préparation';
      case 'SHIPPED':
        return 'Colis Expédié 🚚';
      case 'DELIVERED':
        return 'Livré (En attente confirmation)';
      case 'CONFIRMED':
        return 'Terminé & Débloqué ✅';
      case 'DISPUTED':
        return 'Litige en cours ⚠️';
      case 'REFUNDED':
        return 'Remboursé 🔄';
      case 'CANCELLED':
        return 'Annulé';
      default:
        return status;
    }
  }

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'] ?? '',
      orderNumber: json['order_number'] ?? '',
      buyerId: json['buyer_id'] ?? '',
      merchantId: json['merchant_id'] ?? '',
      merchantName: json['merchant_name'],
      buyerName: json['buyer_name'],
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      escrowAmount: (json['escrow_amount'] as num?)?.toDouble() ?? 0.0,
      serviceFee: (json['service_fee'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'PENDING_PAYMENT',
      deliveryCode: json['delivery_code'],
      deliveryAddress: json['delivery_address'] ?? '',
      deliveryPhone: json['delivery_phone'] ?? '',
      deliveryNotes: json['delivery_notes'],
      paidAt: json['paid_at'],
      shippedAt: json['shipped_at'],
      deliveredAt: json['delivered_at'],
      confirmedAt: json['confirmed_at'],
      createdAt: json['created_at'] ?? DateTime.now().toIso8601String(),
      items: (json['items'] as List<dynamic>?)
              ?.map((item) => OrderItemModel.fromJson(item))
              .toList() ??
          [],
    );
  }
}

class WalletModel {
  final String id;
  final String userId;
  final double availableBalance;
  final double lockedBalance; // Fonds en séquestre
  final String currency;

  WalletModel({
    required this.id,
    required this.userId,
    required this.availableBalance,
    required this.lockedBalance,
    required this.currency,
  });

  double get totalBalance => availableBalance + lockedBalance;

  factory WalletModel.fromJson(Map<String, dynamic> json) {
    return WalletModel(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      availableBalance: (json['available_balance'] as num?)?.toDouble() ?? 0.0,
      lockedBalance: (json['locked_balance'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] ?? 'XOF',
    );
  }
}

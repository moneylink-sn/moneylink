class UserModel {
  final String id;
  final String phone;
  final String email;
  final String firstName;
  final String lastName;
  final String role; // CLIENT, MERCHANT, ADMIN
  final String status;
  final String? avatarUrl;
  final String subscriptionStatus; // TRIAL, ACTIVE, EXPIRED, SUSPENDED
  final String? subscriptionStartDate;
  final String? subscriptionEndDate;
  final double subscriptionPrice;
  final bool isTrial;

  UserModel({
    required this.id,
    required this.phone,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.status,
    this.avatarUrl,
    this.subscriptionStatus = 'TRIAL',
    this.subscriptionStartDate,
    this.subscriptionEndDate,
    this.subscriptionPrice = 500,
    this.isTrial = true,
  });

  String get fullName => '$firstName $lastName';
  bool get isMerchant => role == 'MERCHANT';
  bool get isAdmin => role == 'ADMIN';
  bool get isSubscriptionActive => subscriptionStatus == 'ACTIVE' || subscriptionStatus == 'TRIAL';
  bool get isSubscriptionTrial => subscriptionStatus == 'TRIAL' || isTrial;
  bool get isSubscriptionExpired => subscriptionStatus == 'EXPIRED';

  int get daysRemaining {
    if (subscriptionEndDate == null) return 30;
    try {
      final end = DateTime.parse(subscriptionEndDate!);
      final now = DateTime.now();
      final diff = end.difference(now).inDays;
      return diff < 0 ? 0 : diff;
    } catch (_) {
      return 30;
    }
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'] ?? '',
      firstName: json['first_name'] ?? '',
      lastName: json['last_name'] ?? '',
      role: json['role'] ?? 'CLIENT',
      status: json['status'] ?? 'ACTIVE',
      avatarUrl: json['avatar_url'],
      subscriptionStatus: json['subscription_status'] ?? (json['subscriptionStatus'] ?? 'TRIAL'),
      subscriptionStartDate: json['subscription_start_date'] ?? json['subscriptionStartDate'],
      subscriptionEndDate: json['subscription_end_date'] ?? json['subscriptionEndDate'],
      subscriptionPrice: (json['subscription_price'] ?? json['subscriptionPrice'] ?? 500).toDouble(),
      isTrial: json['is_trial'] ?? json['isTrial'] ?? true,
    );
  }
}

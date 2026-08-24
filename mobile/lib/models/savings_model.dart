class SavingsGoalModel {
  final String id;
  final String ownerId;
  final String title;
  final String? description;
  final double targetAmount;
  final double currentAmount;
  final String startDate;
  final String targetDate;
  final String type; // PERSONAL, COLLECTIVE
  final String frequency; // MONTHLY, WEEKLY, DAILY
  final String status;
  final int progressPercent;
  final double remainingAmount;
  final int membersCount;

  SavingsGoalModel({
    required this.id,
    required this.ownerId,
    required this.title,
    this.description,
    required this.targetAmount,
    required this.currentAmount,
    required this.startDate,
    required this.targetDate,
    required this.type,
    required this.frequency,
    required this.status,
    required this.progressPercent,
    required this.remainingAmount,
    required this.membersCount,
  });

  bool get isCollective => type == 'COLLECTIVE';
  bool get isCompleted => currentAmount >= targetAmount || status == 'COMPLETED';

  factory SavingsGoalModel.fromJson(Map<String, dynamic> json) {
    return SavingsGoalModel(
      id: json['id'] ?? '',
      ownerId: json['owner_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      targetAmount: (json['target_amount'] as num?)?.toDouble() ?? 0.0,
      currentAmount: (json['current_amount'] as num?)?.toDouble() ?? 0.0,
      startDate: json['start_date'] ?? '',
      targetDate: json['target_date'] ?? '',
      type: json['type'] ?? 'PERSONAL',
      frequency: json['frequency'] ?? 'MONTHLY',
      status: json['status'] ?? 'ACTIVE',
      progressPercent: json['progress_percent'] ?? 0,
      remainingAmount: (json['remaining_amount'] as num?)?.toDouble() ?? 0.0,
      membersCount: json['members_count'] ?? 1,
    );
  }
}

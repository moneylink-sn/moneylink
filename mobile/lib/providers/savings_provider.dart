import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../models/savings_model.dart';

class SavingsProvider with ChangeNotifier {
  List<SavingsGoalModel> _goals = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<SavingsGoalModel> get goals => _goals;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<SavingsGoalModel> get personalGoals => _goals.where((g) => !g.isCollective).toList();
  List<SavingsGoalModel> get collectiveGoals => _goals.where((g) => g.isCollective).toList();

  Future<void> fetchGoals() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final response = await ApiClient.get('/savings');
    _isLoading = false;

    if (response.success && response.data != null) {
      _goals = (response.data as List<dynamic>)
          .map((item) => SavingsGoalModel.fromJson(item))
          .toList();
      notifyListeners();
    } else {
      _errorMessage = response.error ?? 'Erreur lors du chargement des coffres';
      notifyListeners();
    }
  }

  Future<bool> createGoal({
    required String title,
    String? description,
    required double targetAmount,
    required String targetDate,
    required String type,
    String frequency = 'MONTHLY',
    double initialAmount = 0,
  }) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiClient.post('/savings', {
      'title': title,
      'description': description,
      'target_amount': targetAmount,
      'target_date': targetDate,
      'type': type,
      'frequency': frequency,
      'initial_amount': initialAmount,
    });

    _isLoading = false;

    if (response.success) {
      await fetchGoals();
      return true;
    } else {
      _errorMessage = response.error;
      notifyListeners();
      return false;
    }
  }

  Future<bool> contribute(String goalId, double amount, [String? note]) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiClient.post('/savings/$goalId/contribute', {
      'amount': amount,
      'note': note,
    });

    _isLoading = false;

    if (response.success) {
      await fetchGoals();
      return true;
    } else {
      _errorMessage = response.error;
      notifyListeners();
      return false;
    }
  }

  Future<bool> inviteMember(String goalId, String phone) async {
    final response = await ApiClient.post('/savings/$goalId/invite', {
      'phone': phone,
    });
    return response.success;
  }
}

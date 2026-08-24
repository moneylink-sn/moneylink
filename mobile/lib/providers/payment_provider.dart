import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../models/transaction_model.dart';

class PaymentProvider with ChangeNotifier {
  List<TransactionModel> _transactions = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<TransactionModel> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchTransactions() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final response = await ApiClient.get('/payments/transactions');
    _isLoading = false;

    if (response.success && response.data != null) {
      _transactions = (response.data as List<dynamic>)
          .map((item) => TransactionModel.fromJson(item))
          .toList();
      notifyListeners();
    } else {
      _errorMessage = response.error ?? 'Erreur lors du chargement des transactions';
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> processCheckout({
    required String orderId,
    required String paymentMethod,
    String? phone,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final response = await ApiClient.post('/payments/checkout', {
      'order_id': orderId,
      'payment_method': paymentMethod,
      'phone': phone,
    });

    _isLoading = false;

    if (response.success && response.data != null) {
      await fetchTransactions();
      return response.data as Map<String, dynamic>;
    } else {
      _errorMessage = response.error ?? 'Échec du paiement';
      notifyListeners();
      return null;
    }
  }

  Future<bool> topUpWallet({
    required double amount,
    required String paymentMethod,
    String? phone,
  }) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiClient.post('/payments/topup', {
      'amount': amount,
      'payment_method': paymentMethod,
      'phone': phone,
    });

    _isLoading = false;

    if (response.success) {
      await fetchTransactions();
      return true;
    } else {
      _errorMessage = response.error;
      notifyListeners();
      return false;
    }
  }
}

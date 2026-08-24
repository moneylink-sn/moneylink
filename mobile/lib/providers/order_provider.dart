import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../models/order_model.dart';

class OrderProvider with ChangeNotifier {
  List<OrderModel> _orders = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<OrderModel> get orders => _orders;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<OrderModel> get pendingOrders =>
      _orders.where((o) => o.isPendingPayment || o.isPaymentConfirmed || o.status == 'PROCESSING').toList();
  List<OrderModel> get shippedOrders => _orders.where((o) => o.isShipped || o.isDelivered).toList();
  List<OrderModel> get confirmedOrders => _orders.where((o) => o.isConfirmed).toList();
  List<OrderModel> get disputedOrders => _orders.where((o) => o.isDisputed).toList();

  Future<void> fetchOrders() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final response = await ApiClient.get('/orders');
    _isLoading = false;

    if (response.success && response.data != null) {
      _orders = (response.data as List<dynamic>)
          .map((item) => OrderModel.fromJson(item))
          .toList();
      notifyListeners();
    } else {
      _errorMessage = response.error ?? 'Erreur de chargement des commandes';
      notifyListeners();
    }
  }

  /// Validation avec code secret OTP
  Future<bool> validateDeliveryCode(String orderId, String code) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiClient.post('/orders/$orderId/validate-code', {
      'code': code,
    });

    _isLoading = false;

    if (response.success) {
      await fetchOrders();
      return true;
    } else {
      _errorMessage = response.error;
      notifyListeners();
      return false;
    }
  }

  /// Confirmation directe 1-clic
  Future<bool> confirmReceipt(String orderId) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiClient.post('/orders/$orderId/confirm', {});
    _isLoading = false;

    if (response.success) {
      await fetchOrders();
      return true;
    } else {
      _errorMessage = response.error;
      notifyListeners();
      return false;
    }
  }

  /// Ouverture d'un litige
  Future<bool> openDispute(String orderId, String reason, String description) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiClient.post('/orders/$orderId/dispute', {
      'reason': reason,
      'description': description,
    });

    _isLoading = false;

    if (response.success) {
      await fetchOrders();
      return true;
    } else {
      _errorMessage = response.error;
      notifyListeners();
      return false;
    }
  }
}

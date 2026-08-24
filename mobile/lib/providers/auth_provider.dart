import 'package:flutter/material.dart';
import '../core/network/api_client.dart';
import '../models/user_model.dart';
import '../models/wallet_model.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _user;
  WalletModel? _wallet;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get user => _user;
  WalletModel? get wallet => _wallet;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;

  Future<bool> login(String identifier, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final response = await ApiClient.post('/auth/login', {
      'identifier': identifier,
      'password': password,
    });

    _isLoading = false;

    if (response.success && response.data != null) {
      final token = response.data['token'];
      if (token != null) {
        await ApiClient.setToken(token);
      }
      _user = UserModel.fromJson(response.data['user']);
      if (response.data['wallet'] != null) {
        _wallet = WalletModel.fromJson(response.data['wallet']);
      }
      notifyListeners();
      return true;
    } else {
      _errorMessage = response.error ?? 'Échec de connexion';
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String phone,
    required String email,
    required String firstName,
    required String lastName,
    required String password,
    String role = 'CLIENT',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final response = await ApiClient.post('/auth/register', {
      'phone': phone,
      'email': email,
      'first_name': firstName,
      'last_name': lastName,
      'password': password,
      'role': role,
    });

    _isLoading = false;

    if (response.success && response.data != null) {
      final token = response.data['token'];
      if (token != null) {
        await ApiClient.setToken(token);
      }
      _user = UserModel.fromJson(response.data['user']);
      if (response.data['wallet'] != null) {
        _wallet = WalletModel.fromJson(response.data['wallet']);
      }
      notifyListeners();
      return true;
    } else {
      _errorMessage = response.error ?? 'Échec de l’inscription';
      notifyListeners();
      return false;
    }
  }

  Future<void> loadProfile() async {
    final response = await ApiClient.get('/auth/profile');
    if (response.success && response.data != null) {
      _user = UserModel.fromJson(response.data['user']);
      if (response.data['wallet'] != null) {
        _wallet = WalletModel.fromJson(response.data['wallet']);
      }
      notifyListeners();
    }
  }

  Future<void> refreshWallet() async {
    final response = await ApiClient.get('/payments/wallet');
    if (response.success && response.data != null) {
      _wallet = WalletModel.fromJson(response.data);
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await ApiClient.clearToken();
    _user = null;
    _wallet = null;
    notifyListeners();
  }
}

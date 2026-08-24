import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';

class ApiResponse {
  final bool success;
  final dynamic data;
  final String? error;
  final String? message;
  final int statusCode;

  ApiResponse({
    required this.success,
    this.data,
    this.error,
    this.message,
    required this.statusCode,
  });
}

class ApiClient {
  static String? _token;

  static Future<void> initToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('jwt_token');
  }

  static Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('jwt_token', token);
  }

  static Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
  }

  static Map<String, String> _getHeaders() {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  static Future<ApiResponse> get(String endpoint) async {
    try {
      final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
      final response = await http.get(url, headers: _getHeaders());
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(success: false, error: e.toString(), statusCode: 500);
    }
  }

  static Future<ApiResponse> post(String endpoint, Map<String, dynamic> body) async {
    try {
      final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
      final response = await http.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode(body),
      );
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(success: false, error: e.toString(), statusCode: 500);
    }
  }

  static Future<ApiResponse> put(String endpoint, [Map<String, dynamic>? body]) async {
    try {
      final url = Uri.parse('${AppConstants.baseUrl}$endpoint');
      final response = await http.put(
        url,
        headers: _getHeaders(),
        body: body != null ? jsonEncode(body) : null,
      );
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(success: false, error: e.toString(), statusCode: 500);
    }
  }

  static ApiResponse _handleResponse(http.Response response) {
    try {
      final data = jsonDecode(response.body);
      final isSuccess = response.statusCode >= 200 && response.statusCode < 300;

      return ApiResponse(
        success: isSuccess,
        data: data['data'],
        message: data['message'],
        error: !isSuccess ? (data['error'] ?? 'Une erreur est survenue') : null,
        statusCode: response.statusCode,
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        error: 'Erreur lors du décodage du serveur (${response.statusCode})',
        statusCode: response.statusCode,
      );
    }
  }
}

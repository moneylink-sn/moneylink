import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/network/api_client.dart';
import 'providers/auth_provider.dart';
import 'providers/order_provider.dart';
import 'providers/savings_provider.dart';
import 'providers/payment_provider.dart';
import 'screens/auth/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiClient.initToken();
  runApp(const MoneyLinkApp());
}

class MoneyLinkApp extends StatelessWidget {
  const MoneyLinkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => OrderProvider()),
        ChangeNotifierProvider(create: (_) => SavingsProvider()),
        ChangeNotifierProvider(create: (_) => PaymentProvider()),
      ],
      child: MaterialApp(
        title: 'MoneyLink',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const SplashScreen(),
      ),
    );
  }
}

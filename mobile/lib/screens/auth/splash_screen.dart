import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/widgets/mk_logo.dart';
import '../../providers/auth_provider.dart';
import 'login_screen.dart';
import '../home/main_navigation_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await Future.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.isAuthenticated) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppConstants.secondary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            MkLogo(
              size: 88,
              fontSize: 38,
              showText: true,
              isVertical: true,
              subtitle: 'Paiement Sécurisé & Tiers de Confiance',
              titleColor: Colors.white,
              spacing: 20,
            ),
            SizedBox(height: 48),
            CircularProgressIndicator(
              color: AppConstants.primary,
              strokeWidth: 3,
            ),
          ],
        ),
      ),
    );
  }
}


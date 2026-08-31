import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/widgets/mk_logo.dart';
import '../../providers/auth_provider.dart';
import '../home/main_navigation_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  String _selectedRole = 'CLIENT';

  Future<void> _handleRegister() async {
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final phone = _phoneController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (firstName.isEmpty || lastName.isEmpty || phone.isEmpty || email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez remplir tous les champs obligatoires')),
      );
      return;
    }

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.register(
      phone: phone,
      email: email,
      firstName: firstName,
      lastName: lastName,
      password: password,
      role: _selectedRole,
    );

    if (success && mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
        (route) => false,
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppConstants.danger,
          content: Text(auth.errorMessage ?? 'Erreur lors de l’inscription'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Créer un compte'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const MkLogo(
                size: 42,
                fontSize: 17,
                showText: true,
                hasGlow: true,
              ),
              const SizedBox(height: 20),
              const Text(
                'Rejoignez MoneyLink 🇸🇳',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppConstants.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Sécurisez vos transactions, vos livraisons et épargnez en toute confiance.',
                style: TextStyle(color: AppConstants.textSecondary, fontSize: 14),
              ),
              const SizedBox(height: 24),

              // Sélecteur de type de compte
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('Particulier / Client')),
                      selected: _selectedRole == 'CLIENT',
                      onSelected: (selected) {
                        if (selected) setState(() => _selectedRole = 'CLIENT');
                      },
                      selectedColor: AppConstants.primaryLight,
                      labelStyle: TextStyle(
                        color: _selectedRole == 'CLIENT' ? AppConstants.primaryDark : AppConstants.textSecondary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('Commerçant Pro')),
                      selected: _selectedRole == 'MERCHANT',
                      onSelected: (selected) {
                        if (selected) setState(() => _selectedRole = 'MERCHANT');
                      },
                      selectedColor: AppConstants.primaryLight,
                      labelStyle: TextStyle(
                        color: _selectedRole == 'MERCHANT' ? AppConstants.primaryDark : AppConstants.textSecondary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Prénom', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _firstNameController,
                          decoration: const InputDecoration(hintText: 'Moussa'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Nom', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _lastNameController,
                          decoration: const InputDecoration(hintText: 'Fall'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              const Text('Numéro de téléphone', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(hintText: '+221 77 123 45 67'),
              ),
              const SizedBox(height: 16),

              const Text('Adresse Email', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(hintText: 'moussa.fall@gmail.com'),
              ),
              const SizedBox(height: 16),

              const Text('Mot de passe', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 6),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(hintText: 'Au moins 6 caractères'),
              ),
              const SizedBox(height: 28),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: auth.isLoading ? null : _handleRegister,
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text('Créer mon compte MoneyLink'),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

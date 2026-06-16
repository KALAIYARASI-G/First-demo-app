import 'package:flutter/material';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController(text: 'worker_john');
  final _passwordController = TextEditingController(text: 'password');
  bool _isLoading = false;

  void _handleLogin() async {
    setState(() {
      _isLoading = true;
    });

    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    try {
      final res = await ApiService.login(username, password);
      if (res != null) {
        // Mock ID depending on choice for demo
        int userId = username == 'worker_john' ? 2 : 3;
        SocketService().connect(userId);
        
        Navigator.pushReplacementNamed(
          context,
          '/tasks',
          arguments: {
            'userId': userId,
            'username': username,
            'token': res['token'],
          },
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Login failed: ${e.toString()}')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(
                Icons.location_on,
                size: 80,
                color: Color(0xFF6366F1),
              ),
              const SizedBox(height: 16),
              const Text(
                'LIVETRACK',
                textAlign: Center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
              const Text(
                'Worker Mobile Portal',
                textAlign: Center,
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 48),
              TextField(
                controller: _usernameController,
                decoration: InputDecoration(
                  labelText: 'Username',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.person),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.lock),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text(
                        'LOGIN',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Available Demo Users:\n• worker_john / password\n• worker_alice / password',
                textAlign: Center,
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

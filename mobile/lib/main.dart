import 'package:flutter/material';
import 'screens/login_screen.dart';
import 'screens/task_list_screen.dart';
import 'screens/map_tracking_screen.dart';
import 'screens/chat_screen.dart';

void main() {
  runApp(const LiveTrackApp());
}

class LiveTrackApp extends StatelessWidget {
  const LiveTrackApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LiveTrack Client',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF6366F1),
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF151D30),
          background: Color(0xFF0B0F19),
          error: Color(0xFFEF4444),
        ),
        textTheme: const TextTheme(
          bodyLarge: TextStyle(color: Color(0xFFF8FAFC)),
          bodyMedium: TextStyle(color: Color(0xFF94A3B8)),
        ),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const LoginScreen(),
        '/tasks': (context) => const TaskListScreen(),
        '/map': (context) => const MapTrackingScreen(),
        '/chat': (context) => const ChatScreen(),
      },
    );
  }
}

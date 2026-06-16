import 'dart:convert';
import 'package:http/http.as_http' as http;

class ApiService {
  static const String baseUrl = 'http://localhost:8080/api';

  static Map<String, String> _getHeaders(String token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  static Future<Map<String, dynamic>?> login(String username, String password) async {
    // In a real application, this would authenticate against AWS Cognito and return a JWT.
    // For this development/demo app, we returns the mock user details.
    return {
      'token': 'mock-$username',
      'username': username,
      'role': username.contains('manager') ? 'MANAGER' : 'WORKER',
    };
  }

  static Future<List<dynamic>> getTasks(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/tasks'),
      headers: _getHeaders(token),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load tasks');
    }
  }

  static Future<Map<String, dynamic>> updateTaskStatus(String token, int taskId, String status) async {
    final response = await http.put(
      Uri.parse('$baseUrl/tasks/$taskId/status'),
      headers: _getHeaders(token),
      body: jsonEncode({'status': status}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to update task status');
    }
  }

  static Future<bool> updateLocation(String token, double lat, double lng) async {
    final response = await http.post(
      Uri.parse('$baseUrl/location/update'),
      headers: _getHeaders(token),
      body: jsonEncode({
        'latitude': lat,
        'longitude': lng,
      }),
    );
    return response.statusCode == 201 || response.statusCode == 200;
  }
}

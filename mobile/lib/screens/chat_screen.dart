import 'dart:convert';
import 'package:flutter/material';
import 'package:http/http.as_http' as http;
import '../services/api_service.dart';
import '../services/socket_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final List<dynamic> _messages = [];
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  late int userId;
  late String username;
  late String token;
  int? conversationId;
  bool _isInit = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInit) {
      final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
      userId = args['userId'];
      username = args['username'];
      token = args['token'];
      _isInit = true;
      _initializeChat();
    }
  }

  void _initializeChat() async {
    // Connect to global socket instance events
    final socketService = SocketService();
    socketService.onMessageReceived = (data) {
      if (data['conversationId'] == conversationId) {
        setState(() {
          _messages.add(data);
        });
        _scrollToBottom();
      }
    };

    // Call API to get or create conversation with the manager (Manager has ID: 1 as per seed.sql)
    const int managerId = 1;
    try {
      final response = await http.post(
        Uri.parse('${ApiService.baseUrl}/chat/conversation'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'participantId': managerId}),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final conv = jsonDecode(response.body);
        conversationId = conv['id'];

        // Get past messages
        final msgResponse = await http.get(
          Uri.parse('${ApiService.baseUrl}/chat/conversation/$conversationId/messages'),
          headers: {
            'Authorization': 'Bearer $token',
          },
        );

        if (msgResponse.statusCode == 200) {
          final List<dynamic> history = jsonDecode(msgResponse.body);
          setState(() {
            _messages.addAll(history);
          });
          _scrollToBottom();
        }
      }
    } catch (e) {
      print('Error loading chat: $e');
    }
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty || conversationId == null) return;

    SocketService().sendMessage(conversationId!, userId, 1, text);
    _messageController.clear();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat with Dispatcher'),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isMe = msg['senderId'] == userId;
                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isMe ? const Color(0xFF6366F1) : const Color(0xFF151D30),
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(12),
                        topRight: const Radius.circular(12),
                        bottomLeft: isMe ? const Radius.circular(12) : Radius.zero,
                        bottomRight: isMe ? Radius.zero : const Radius.circular(12),
                      ),
                      border: isMe ? null : Border.all(color: const Color(0xFF2E3E60)),
                    ),
                    child: Text(
                      msg['messageText'] ?? '',
                      style: const TextStyle(fontSize: 15),
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: 'Enter message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send, color: Color(0xFF6366F1)),
                  onPressed: _sendMessage,
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  List<dynamic> _tasks = [];
  bool _isLoading = false;
  late int userId;
  late String username;
  late String token;
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
      _loadTasks();
      _listenToCalls();
    }
  }

  void _listenToCalls() {
    final socketService = SocketService();
    socketService.onCallIncoming = (data) {
      // Trigger incoming call dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('Incoming Call'),
          content: const Text('Manager Jane is calling you...'),
          actions: [
            TextButton(
              onPressed: () {
                socketService.socket?.emit('decline_call', {'to': data['from']});
                Navigator.of(ctx).pop();
              },
              child: const Text('Decline', style: TextStyle(color: Colors.red)),
            ),
            ElevatedButton(
              onPressed: () {
                socketService.acceptCall(data['from'], {'type': 'answer', 'sdp': 'mobile-sdp-answer'});
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Call Connected (Simulated)')),
                );
              },
              child: const Text('Accept', style: TextStyle(color: Colors.green)),
            ),
          ],
        ),
      );
    };
  }

  Future<void> _loadTasks() async {
    setState(() {
      _isLoading = true;
    });
    try {
      final tasks = await ApiService.getTasks(token);
      setState(() {
        _tasks = tasks.where((t) => t['assignedToId'] == userId).toList();
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load tasks: $e')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _updateStatus(int taskId, String status) async {
    try {
      await ApiService.updateTaskStatus(token, taskId, status);
      _loadTasks();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Task status updated to $status')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error updating task: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('My Tasks ($username)'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTasks,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _tasks.isEmpty
              ? const Center(
                  child: Text(
                    'No tasks assigned to you.',
                    style: TextStyle(fontSize: 16, color: Color(0xFF94A3B8)),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _tasks.length,
                  itemBuilder: (context, index) {
                    final task = _tasks[index];
                    return Card(
                      color: const Color(0xFF151D30),
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: Color(0xFF2E3E60), width: 1),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        key: ValueKey(task['id']),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.between,
                              children: [
                                Text(
                                  task['title'] ?? '',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: task['status'] == 'COMPLETED'
                                        ? Colors.green.withOpacity(0.2)
                                        : task['status'] == 'IN_PROGRESS'
                                            ? Colors.indigo.withOpacity(0.2)
                                            : Colors.orange.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    task['status'] ?? 'PENDING',
                                    style: TextStyle(
                                      color: task['status'] == 'COMPLETED'
                                          ? Colors.green
                                          : task['status'] == 'IN_PROGRESS'
                                              ? Colors.indigoAccent
                                              : Colors.orange,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              task['description'] ?? 'No description provided.',
                              style: const TextStyle(color: Color(0xFF94A3B8)),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                if (task['status'] == 'PENDING')
                                  ElevatedButton(
                                    onPressed: () => _updateStatus(task['id'], 'IN_PROGRESS'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF6366F1),
                                      foregroundColor: Colors.white,
                                    ),
                                    child: const Text('Start Work'),
                                  ),
                                if (task['status'] == 'IN_PROGRESS')
                                  ElevatedButton(
                                    onPressed: () => _updateStatus(task['id'], 'COMPLETED'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF10B981),
                                      foregroundColor: Colors.white,
                                    ),
                                    child: const Text('Mark Complete'),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: const Color(0xFF151D30),
        selectedItemColor: const Color(0xFF6366F1),
        unselectedItemColor: Colors.grey,
        currentIndex: 0,
        onTap: (index) {
          if (index == 1) {
            Navigator.pushNamed(context, '/map', arguments: {
              'userId': userId,
              'username': username,
              'token': token,
            });
          } else if (index == 2) {
            Navigator.pushNamed(context, '/chat', arguments: {
              'userId': userId,
              'username': username,
              'token': token,
            });
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.assignment),
            label: 'Tasks',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.map),
            label: 'Location',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.chat),
            label: 'Chat',
          ),
        ],
      ),
    );
  }
}

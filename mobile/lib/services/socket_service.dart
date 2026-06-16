import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  IO.Socket? socket;
  Function(dynamic)? onMessageReceived;
  Function(dynamic)? onCallIncoming;
  Function(dynamic)? onCallAccepted;
  Function(dynamic)? onIceCandidate;

  SocketService._internal();

  void connect(int userId) {
    socket = IO.io('http://localhost:8080', IO.OptionBuilder()
      .setTransports(['websocket'])
      .setPath('/socket.io')
      .build());

    socket?.onConnect((_) {
      print('Connected to Socket server');
      register(userId);
    });

    socket?.on('message_received', (data) {
      if (onMessageReceived != null) onMessageReceived!(data);
    });

    socket?.on('call_incoming', (data) {
      if (onCallIncoming != null) onCallIncoming!(data);
    });

    socket?.on('call_accepted', (data) {
      if (onCallAccepted != null) onCallAccepted!(data);
    });

    socket?.on('ice_candidate_received', (data) {
      if (onIceCandidate != null) onIceCandidate!(data);
    });

    socket?.connect();
  }

  void register(int userId) {
    socket?.emit('register', {'userId': userId});
  }

  void sendMessage(int conversationId, int senderId, int receiverId, String text) {
    socket?.emit('send_message', {
      'conversationId': conversationId,
      'senderId': senderId,
      'receiverId': receiverId,
      'text': text,
    });
  }

  void updateLocation(int userId, double latitude, double longitude) {
    socket?.emit('update_location', {
      'userId': userId,
      'latitude': latitude,
      'longitude': longitude,
    });
  }

  void makeCall(int toUserId, int fromUserId, dynamic offer) {
    socket?.emit('call_user', {
      'userToCall': toUserId,
      'from': fromUserId,
      'offer': offer,
    });
  }

  void acceptCall(int toUserId, dynamic answer) {
    socket?.emit('accept_call', {
      'to': toUserId,
      'answer': answer,
    });
  }

  void sendIceCandidate(int toUserId, dynamic candidate) {
    socket?.emit('ice_candidate', {
      'to': toUserId,
      'candidate': candidate,
    });
  }

  void disconnect() {
    socket?.disconnect();
  }
}

import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Active socket connections map: userId -> socketId
  private activeUsers = new Map<number, string>();

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Socket Client Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket Client Disconnected: ${client.id}`);
    for (const [userId, socketId] of this.activeUsers.entries()) {
      if (socketId === client.id) {
        this.activeUsers.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(@MessageBody() payload: { userId: number }, @ConnectedSocket() client: Socket) {
    this.activeUsers.set(payload.userId, client.id);
    console.log(`User #${payload.userId} registered socket: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() payload: { conversationId: number; senderId: number; receiverId: number; text: string },
  ) {
    const msg = await this.chatService.sendMessage(payload.conversationId, payload.senderId, payload.text);

    // Forward to sender
    const senderSocketId = this.activeUsers.get(payload.senderId);
    if (senderSocketId) {
      this.server.to(senderSocketId).emit('message_received', msg);
    }

    // Forward to receiver
    const receiverSocketId = this.activeUsers.get(payload.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('message_received', msg);
    }
  }

  @SubscribeMessage('update_location')
  async handleUpdateLocation(
    @MessageBody() payload: { userId: number; latitude: number; longitude: number },
  ) {
    const log = await this.chatService.saveLocation(payload.userId, payload.latitude, payload.longitude);
    this.server.emit('location_updated', log);
  }

  // WebRTC Signaling Events for Call System
  @SubscribeMessage('call_user')
  handleCallUser(
    @MessageBody() payload: { userToCall: number; from: number; offer: any },
  ) {
    const receiverSocketId = this.activeUsers.get(payload.userToCall);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('call_incoming', {
        from: payload.from,
        offer: payload.offer,
      });
    }
  }

  @SubscribeMessage('accept_call')
  handleAcceptCall(
    @MessageBody() payload: { to: number; answer: any },
  ) {
    const callerSocketId = this.activeUsers.get(payload.to);
    if (callerSocketId) {
      this.server.to(callerSocketId).emit('call_accepted', {
        answer: payload.answer,
      });
    }
  }

  @SubscribeMessage('ice_candidate')
  handleIceCandidate(
    @MessageBody() payload: { to: number; candidate: any },
  ) {
    const destSocketId = this.activeUsers.get(payload.to);
    if (destSocketId) {
      this.server.to(destSocketId).emit('ice_candidate_received', {
        candidate: payload.candidate,
      });
    }
  }
}

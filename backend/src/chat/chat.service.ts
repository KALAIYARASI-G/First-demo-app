import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateConversation(user1Id: number, user2Id: number) {
    const minId = Math.min(user1Id, user2Id);
    const maxId = Math.max(user1Id, user2Id);

    let conversation = await this.prisma.conversation.findUnique({
      where: {
        user1Id_user2Id: {
          user1Id: BigInt(minId),
          user2Id: BigInt(maxId),
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          user1Id: BigInt(minId),
          user2Id: BigInt(maxId),
        },
      });
    }

    return this.serialize(conversation);
  }

  async sendMessage(conversationId: number, senderId: number, text: string) {
    const msg = await this.prisma.message.create({
      data: {
        conversationId: BigInt(conversationId),
        senderId: BigInt(senderId),
        messageText: text,
      },
    });
    return this.serialize(msg);
  }

  async getMessages(conversationId: number) {
    const messages = await this.prisma.message.findMany({
      where: { conversationId: BigInt(conversationId) },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((m) => this.serialize(m));
  }

  async saveLocation(userId: number, lat: number, lng: number) {
    const log = await this.prisma.locationLog.create({
      data: {
        userId: BigInt(userId),
        latitude: lat,
        longitude: lng,
      },
    });
    return {
      id: Number(log.id),
      userId: Number(log.userId),
      latitude: log.latitude,
      longitude: log.longitude,
      timestamp: log.timestamp,
    };
  }

  private serialize(obj: any) {
    if (!obj) return null;
    const res = { ...obj };
    if (res.id) res.id = Number(res.id);
    if (res.user1Id) res.user1Id = Number(res.user1Id);
    if (res.user2Id) res.user2Id = Number(res.user2Id);
    if (res.conversationId) res.conversationId = Number(res.conversationId);
    if (res.senderId) res.senderId = Number(res.senderId);
    return res;
  }
}

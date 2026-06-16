import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async registerToken(userId: number, token: string, platform: 'ANDROID' | 'IOS' | 'WEB') {
    return this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId: BigInt(userId), platform },
      create: {
        userId: BigInt(userId),
        token,
        platform,
      },
    });
  }

  async sendPushNotification(userId: number, title: string, body: string) {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId: BigInt(userId) },
    });

    if (tokens.length === 0) return;

    // Simulate sending FCM pushes via Google FCM APIs
    console.log(`[FCM Notification] Sending to User #${userId}: ${title} - ${body}`);
    tokens.forEach((t) => {
      console.log(`  Sending payload to ${t.platform} token: ${t.token.substring(0, 10)}...`);
    });
  }
}

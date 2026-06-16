import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}

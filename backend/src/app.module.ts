import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { LocationModule } from './location/location.module';
import { AiModule } from './ai/ai.module';
import { TaskModule } from './task/task.module';
import { NotificationModule } from './notification/notification.module';
import { ChatModule } from './chat/chat.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [AuthModule, LocationModule, AiModule, TaskModule, NotificationModule, ChatModule],
  providers: [PrismaService],
})
export class AppModule {}

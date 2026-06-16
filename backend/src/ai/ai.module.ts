import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiController } from './ai.controller';

@Module({
  controllers: [AiController],
  providers: [PrismaService],
})
export class AiModule {}

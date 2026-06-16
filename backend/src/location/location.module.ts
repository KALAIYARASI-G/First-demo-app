import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LocationController } from './location.controller';

@Module({
  controllers: [LocationController],
  providers: [PrismaService],
})
export class LocationModule {}

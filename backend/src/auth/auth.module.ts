import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';
import { AuthController } from './auth.controller';
import { CognitoStrategy } from './cognito.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'cognito' })],
  controllers: [AuthController],
  providers: [CognitoStrategy, PrismaService],
  exports: [PassportModule, CognitoStrategy],
})
export class AuthModule {}

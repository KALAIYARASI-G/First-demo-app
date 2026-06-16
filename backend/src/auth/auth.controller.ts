import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JointAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('profile')
  @UseGuards(JointAuthGuard)
  getProfile(@Request() req) {
    return req.user;
  }

  @Get('users')
  @UseGuards(JointAuthGuard)
  async getUsers() {
    const users = await this.prisma.user.findMany();
    return users.map(user => ({
      ...user,
      id: Number(user.id)
    }));
  }
}

import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';

@Controller('api/notification')
@UseGuards(AuthGuard('cognito'))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('register')
  registerToken(
    @Request() req,
    @Body() body: { token: string; platform: 'ANDROID' | 'IOS' | 'WEB' },
  ) {
    const userId = req.user.id;
    return this.notificationService.registerToken(userId, body.token, body.platform);
  }
}

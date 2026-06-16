import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JointAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('api/chat')
@UseGuards(JointAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversation')
  async getOrCreateConversation(
    @Request() req,
    @Body() body: { participantId: number },
  ) {
    const userId = req.user.id;
    return this.chatService.getOrCreateConversation(userId, body.participantId);
  }

  @Get('conversation/:id/messages')
  async getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(Number(id));
  }
}

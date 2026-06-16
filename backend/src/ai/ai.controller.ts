import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { JointAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/ai')
@UseGuards(JointAuthGuard)
export class AiController {
  // In-memory store for AI Assistant chats: userId -> messages list
  private chatHistory = new Map<number, { id: number; sender: 'USER' | 'AI'; messageText: string; timestamp: Date }[]>();
  private messageIdCounter = 1;

  @Post('chat')
  async askAssistant(
    @Request() req,
    @Body() body: { message: string },
  ) {
    const userId = Number(req.user.id);
    const prompt = body.message;

    if (!prompt || prompt.trim() === '') {
      throw new Error('Message is empty.');
    }

    if (!this.chatHistory.has(userId)) {
      this.chatHistory.set(userId, []);
    }
    const userHistory = this.chatHistory.get(userId)!;

    // Log user chat message
    userHistory.push({
      id: this.messageIdCounter++,
      sender: 'USER',
      messageText: prompt,
      timestamp: new Date(),
    });

    let aiResponseText = 'Sorry, I could not reach the AI Assistant at this moment.';
    const geminiApiKey = process.env.GOOGLE_AI_API_KEY || '';

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          aiResponseText = text;
        }
      }
    } catch (error) {
      aiResponseText = `AI Service Error: ${error.message}`;
    }

    // Log AI chat message
    userHistory.push({
      id: this.messageIdCounter++,
      sender: 'AI',
      messageText: aiResponseText,
      timestamp: new Date(),
    });

    return { response: aiResponseText };
  }

  @Get('history')
  async getChatHistory(@Request() req) {
    const userId = Number(req.user.id);
    return this.chatHistory.get(userId) || [];
  }
}

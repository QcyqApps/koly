import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { ChatService } from './chat.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

class SendMessageDto {
  @IsString()
  message: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  sendMessage(@CurrentUser() user: User, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(user.id, dto.message, dto.sessionId);
  }

  @Get('history/:sessionId')
  getHistory(@CurrentUser() user: User, @Param('sessionId') sessionId: string) {
    return this.chatService.getHistory(user.id, sessionId);
  }

  @Get('sessions')
  getSessions(@CurrentUser() user: User) {
    return this.chatService.getSessions(user.id);
  }
}

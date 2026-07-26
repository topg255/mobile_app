import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Liste des conversations' })
  async getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.id);
  }

  @Get('messages/:userId')
  @ApiOperation({ summary: 'Messages avec un utilisateur' })
  async getMessages(@Request() req, @Param('userId') otherUserId: string) {
    return this.chatService.getMessages(req.user.id, otherUserId);
  }

  @Post('read/:senderId')
  @ApiOperation({ summary: 'Marquer les messages comme lus' })
  async markAsRead(@Request() req, @Param('senderId') senderId: string) {
    await this.chatService.markAsRead(req.user.id, senderId);
    return { message: 'Messages marqués comme lus' };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de messages non lus' })
  async getUnreadCount(@Request() req) {
    return this.chatService.getUnreadCount(req.user.id);
  }

  @Get('agents')
  @ApiOperation({ summary: 'Liste des agents/disponibles pour messagerie' })
  async getAllAgents(@Request() req) {
    return this.chatService.getAllAgents(req.user.id);
  }

  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Modifier un message' })
  async editMessage(
    @Request() req,
    @Param('messageId') messageId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.editMessage(req.user.id, messageId, content);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Supprimer un message' })
  async deleteMessage(@Request() req, @Param('messageId') messageId: string) {
    return this.chatService.deleteMessage(req.user.id, messageId);
  }
}

import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getAll(@Request() req) {
    return this.notificationService.getForUser(req.user.id);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.notificationService.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.notificationService.delete(id, req.user.id);
  }
}

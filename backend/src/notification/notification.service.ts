import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async create(userId: string, type: NotificationType, message: string, relatedId?: string) {
    const notification = this.notificationRepo.create({
      user: { id: userId } as User,
      type,
      message,
      relatedId: relatedId || null,
    });
    return this.notificationRepo.save(notification);
  }

  async createForUser(user: User, type: NotificationType, message: string, relatedId?: string) {
    return this.create(user.id, type, message, relatedId);
  }

  async getForUser(userId: string) {
    return this.notificationRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepo.count({
      where: { user: { id: userId }, isRead: false },
    });
    return { unreadCount: count };
  }

  async markAsRead(id: string, userId: string) {
    await this.notificationRepo.update(
      { id, user: { id: userId } },
      { isRead: true },
    );
    return { message: 'Notification lue' };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepo.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
    return { message: 'Toutes les notifications marquées comme lues' };
  }

  async delete(id: string, userId: string) {
    await this.notificationRepo.delete({ id, user: { id: userId } });
    return { message: 'Notification supprimée' };
  }
}

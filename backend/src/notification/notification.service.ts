import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../auth/entities/user.entity';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly gateway: NotificationGateway,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    message: string,
    relatedId?: string,
  ) {
    const notification = this.notificationRepo.create({
      user: { id: userId } as User,
      type,
      message,
      relatedId: relatedId || null,
    });
    const saved = await this.notificationRepo.save(notification);

    const unreadCount = await this.getUnreadCount(userId);
    this.gateway.sendToUser(userId, 'newNotification', saved);
    this.gateway.sendToUser(userId, 'unreadCount', unreadCount);

    return saved;
  }

  async createForUser(
    user: User,
    type: NotificationType,
    message: string,
    relatedId?: string,
  ) {
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
    const unreadCount = await this.getUnreadCount(userId);
    this.gateway.sendToUser(userId, 'unreadCount', unreadCount);
    return { message: 'Notification lue' };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepo.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
    this.gateway.sendToUser(userId, 'unreadCount', { unreadCount: 0 });
    return { message: 'Toutes les notifications marquées comme lues' };
  }

  async delete(id: string, userId: string) {
    await this.notificationRepo.delete({ id, user: { id: userId } });
    const unreadCount = await this.getUnreadCount(userId);
    this.gateway.sendToUser(userId, 'unreadCount', unreadCount);
    return { message: 'Notification supprimée' };
  }
}

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { User, UserRole } from '../auth/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getConversations(userId: string) {
    const messages = await this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.receiver', 'receiver')
      .where('(sender.id = :userId OR receiver.id = :userId) AND message.is_deleted = false', { userId })
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    const conversationMap = new Map<string, { user: User; lastMessage: Message; unreadCount: number }>();

    for (const msg of messages) {
      const otherUserId = msg.sender.id === userId ? msg.receiver.id : msg.sender.id;
      const otherUser = msg.sender.id === userId ? msg.receiver : msg.sender;

      if (!conversationMap.has(otherUserId)) {
        const unreadCount = await this.messageRepo.count({
          where: {
            sender: { id: otherUserId },
            receiver: { id: userId },
            isRead: false,
            isDeleted: false,
          },
        });
        conversationMap.set(otherUserId, {
          user: otherUser,
          lastMessage: msg,
          unreadCount,
        });
      }
    }

    return Array.from(conversationMap.values());
  }

  async getMessages(userId: string, otherUserId: string) {
    const messages = await this.messageRepo.find({
      where: [
        { sender: { id: userId }, receiver: { id: otherUserId }, isDeleted: false },
        { sender: { id: otherUserId }, receiver: { id: userId }, isDeleted: false },
      ],
      relations: { sender: true, receiver: true },
      order: { createdAt: 'ASC' },
    });
    return messages;
  }

  async markAsRead(userId: string, senderId: string) {
    await this.messageRepo.update(
      { sender: { id: senderId }, receiver: { id: userId }, isRead: false, isDeleted: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string) {
    const count = await this.messageRepo.count({
      where: { receiver: { id: userId }, isRead: false, isDeleted: false },
    });
    return { unreadCount: count };
  }

  async editMessage(userId: string, messageId: string, content: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { sender: true, receiver: true },
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    if (message.sender.id !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres messages');
    }

    message.content = content.trim();
    message.isEdited = true;
    await this.messageRepo.save(message);

    return message;
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { sender: true, receiver: true },
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    if (message.sender.id !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages');
    }

    message.isDeleted = true;
    await this.messageRepo.save(message);

    return { deletedMessageId: messageId, receiverId: message.receiver.id };
  }

  async getAllAgents(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return [];

    let agents: User[];
    if (user.role === UserRole.SUPERVISEUR_QUALITE) {
      agents = await this.userRepo.find({
        where: { role: UserRole.AGENT_QUALITE, isApproved: true },
        select: { id: true, firstName: true, lastName: true, matricule: true, profileImage: true, role: true },
      });
    } else {
      agents = await this.userRepo.find({
        where: { role: UserRole.SUPERVISEUR_QUALITE, isApproved: true },
        select: { id: true, firstName: true, lastName: true, matricule: true, profileImage: true, role: true },
      });
    }
    return agents;
  }
}

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Message } from './entities/message.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    private notificationService: NotificationService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token as string);
      const userId = payload.sub;
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        client.disconnect();
        return;
      }
      client.data.userId = userId;
      client.data.user = user;
      this.userSockets.set(userId, client.id);
      console.log(`[WS] ${user.firstName} ${user.lastName} connected (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      this.userSockets.delete(userId);
      console.log(`[WS] User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; content: string },
  ) {
    const senderId = client.data.userId;
    if (!senderId || !data.receiverId || !data.content?.trim()) return;

    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    const receiver = await this.userRepo.findOne({ where: { id: data.receiverId } });
    if (!sender || !receiver) return;

    const message = this.messageRepo.create({
      sender,
      receiver,
      content: data.content.trim(),
    });
    await this.messageRepo.save(message);

    const savedMessage = await this.messageRepo.findOne({
      where: { id: message.id },
      relations: { sender: true, receiver: true },
    });

    const senderSocketId = this.userSockets.get(senderId);
    if (senderSocketId) {
      this.server.to(senderSocketId).emit('newMessage', savedMessage);
    }

    const receiverSocketId = this.userSockets.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('newMessage', savedMessage);
    }

    // Create notification for receiver
    await this.notificationService.create(
      data.receiverId,
      NotificationType.MESSAGE,
      `${sender.firstName} ${sender.lastName} vous a envoyé un message`,
      savedMessage?.id,
    );
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.content?.trim()) return;

    const message = await this.messageRepo.findOne({
      where: { id: data.messageId },
      relations: { sender: true, receiver: true },
    });
    if (!message || message.sender.id !== userId) return;

    message.content = data.content.trim();
    message.isEdited = true;
    await this.messageRepo.save(message);

    const updatedMessage = await this.messageRepo.findOne({
      where: { id: message.id },
      relations: { sender: true, receiver: true },
    });

    const senderSocketId = this.userSockets.get(userId);
    if (senderSocketId) {
      this.server.to(senderSocketId).emit('messageEdited', updatedMessage);
    }

    const receiverSocketId = this.userSockets.get(message.receiver.id);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('messageEdited', updatedMessage);
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId) return;

    const message = await this.messageRepo.findOne({
      where: { id: data.messageId },
      relations: { sender: true, receiver: true },
    });
    if (!message || message.sender.id !== userId) return;

    message.isDeleted = true;
    await this.messageRepo.save(message);

    const senderSocketId = this.userSockets.get(userId);
    if (senderSocketId) {
      this.server.to(senderSocketId).emit('messageDeleted', { messageId: data.messageId });
    }

    const receiverSocketId = this.userSockets.get(message.receiver.id);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('messageDeleted', { messageId: data.messageId });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { senderId: string },
  ) {
    const receiverId = client.data.userId;
    if (!receiverId || !data.senderId) return;

    await this.messageRepo.update(
      { sender: { id: data.senderId }, receiver: { id: receiverId }, isRead: false, isDeleted: false },
      { isRead: true },
    );

    const senderSocketId = this.userSockets.get(data.senderId);
    if (senderSocketId) {
      this.server.to(senderSocketId).emit('messagesRead', { readerId: receiverId });
    }

    const unreadCount = await this.messageRepo.count({
      where: { receiver: { id: receiverId }, isRead: false, isDeleted: false },
    });
    const receiverSocketId = this.userSockets.get(receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('unreadCount', { unreadCount });
    }
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUserIds = Array.from(this.userSockets.keys());
    client.emit('onlineUsers', onlineUserIds);
  }

  async sendUnreadCount(userId: string) {
    const unreadCount = await this.messageRepo.count({
      where: { receiver: { id: userId }, isRead: false, isDeleted: false },
    });
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('unreadCount', { unreadCount });
    }
  }
}

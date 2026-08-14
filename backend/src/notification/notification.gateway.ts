import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notifications' })
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  afterInit() {
    console.log('[Notif-WS] Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        console.log('[Notif-WS] No token, disconnecting');
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        console.log('[Notif-WS] User not found, disconnecting');
        client.disconnect();
        return;
      }
      client.data.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      console.log(
        `[Notif-WS] ${user.firstName} ${user.lastName} connected (${client.id}), total users: ${this.userSockets.size}`,
      );
    } catch (err) {
      console.log('[Notif-WS] Connection error:', err.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      console.log(
        `[Notif-WS] User ${userId} disconnected, remaining users: ${this.userSockets.size}`,
      );
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0 && this.server) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }
}

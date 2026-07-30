import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import { LoginLog } from '../auth/entities/login-log.entity';
import { Message } from '../chat/entities/message.entity';
import { ControleDate } from '../quality/entities/controle-date.entity';
import { LigneControle } from '../quality/entities/ligne-controle.entity';
import { Notification } from '../notification/entities/notification.entity';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(LoginLog) private readonly loginLogRepository: Repository<LoginLog>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @InjectRepository(ControleDate) private readonly controleDateRepository: Repository<ControleDate>,
    @InjectRepository(LigneControle) private readonly ligneControleRepository: Repository<LigneControle>,
    @InjectRepository(Notification) private readonly notificationRepository: Repository<Notification>,
  ) {}

  async getAllUsers() {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map(({ password, resetToken, resetTokenExpires, ...user }) => user);
  }

  async getUsersByRole(role: UserRole) {
    const users = await this.userRepository.find({
      where: { role },
      order: { createdAt: 'DESC' },
    });
    return users.map(({ password, resetToken, resetTokenExpires, ...user }) => user);
  }

  async getPendingUsers() {
    const users = await this.userRepository.find({
      where: { isApproved: false, role: UserRole.SUPERVISEUR_QUALITE },
      order: { createdAt: 'DESC' },
    });
    return users.map(({ password, resetToken, resetTokenExpires, ...user }) => user);
  }

  async approveUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ConflictException('Impossible de modifier le Super Admin');
    }

    if (user.role === UserRole.AGENT_QUALITE) {
      throw new ConflictException('Les agents sont approuves par leur superviseur, pas par le Super Admin');
    }

    user.isApproved = true;
    await this.userRepository.save(user);

    return {
      message: `Compte de ${user.firstName} ${user.lastName} approuve avec succes`,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        matricule: user.matricule,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
    };
  }

  async disapproveUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ConflictException('Impossible de modifier le Super Admin');
    }

    if (user.role === UserRole.AGENT_QUALITE) {
      throw new ConflictException('Les agents sont geres par leur superviseur, pas par le Super Admin');
    }

    user.isApproved = false;
    await this.userRepository.save(user);

    return {
      message: `Compte de ${user.firstName} ${user.lastName} desapprouve`,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        matricule: user.matricule,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
    };
  }

  async deleteUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ConflictException('Impossible de supprimer le Super Admin');
    }

    await this.ligneControleRepository.delete({ agent: { id: userId } });
    await this.controleDateRepository.delete({ createdBy: { id: userId } });
    await this.notificationRepository.delete({ user: { id: userId } });
    await this.messageRepository.delete({ sender: { id: userId } });
    await this.messageRepository.delete({ receiver: { id: userId } });
    await this.loginLogRepository.delete({ user: { id: userId } });
    await this.userRepository.remove(user);

    return {
      message: `Utilisateur ${user.firstName} ${user.lastName} supprimé avec succès`,
    };
  }

  async getAllLoginLogs(page: number = 1, limit: number = 50) {
    const [logs, total] = await this.loginLogRepository.findAndCount({
      relations: { user: true },
      order: { loggedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      logs: logs.map((log) => ({
        id: log.id,
        user: log.user ? {
          id: log.user.id,
          firstName: log.user.firstName,
          lastName: log.user.lastName,
          matricule: log.user.matricule,
          role: log.user.role,
        } : null,
        action: log.action,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        loggedAt: log.loggedAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLoginLogsByUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const logs = await this.loginLogRepository.find({
      where: { user: { id: userId } },
      order: { loggedAt: 'DESC' },
      take: 100,
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        matricule: user.matricule,
      },
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        ipAddress: log.ipAddress,
        loggedAt: log.loggedAt,
      })),
    };
  }

  async getStats() {
    const totalUsers = await this.userRepository.count();
    const totalAgents = await this.userRepository.count({ where: { role: UserRole.AGENT_QUALITE } });
    const totalSuperviseurs = await this.userRepository.count({ where: { role: UserRole.SUPERVISEUR_QUALITE } });
    const pendingUsers = await this.userRepository.count({ where: { isApproved: false } });
    const approvedUsers = await this.userRepository.count({ where: { isApproved: true } });
    const totalLogs = await this.loginLogRepository.count();

    return {
      totalUsers,
      totalAgents,
      totalSuperviseurs,
      pendingUsers,
      approvedUsers,
      totalLogs,
    };
  }
}

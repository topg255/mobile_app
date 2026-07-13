import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../auth/entities/user.entity';
import { LoginLog } from '../auth/entities/login-log.entity';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LoginLog)
    private readonly loginLogRepository: Repository<LoginLog>,
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
      where: { isApproved: false },
      order: { createdAt: 'DESC' },
    });
    return users.map(({ password, resetToken, resetTokenExpires, ...user }) => user);
  }

  async approveUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ConflictException('Impossible de modifier le Super Admin');
    }

    user.isApproved = true;
    await this.userRepository.save(user);

    return {
      message: `Compte de ${user.firstName} ${user.lastName} approuvé avec succès`,
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
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ConflictException('Impossible de modifier le Super Admin');
    }

    user.isApproved = false;
    await this.userRepository.save(user);

    return {
      message: `Compte de ${user.firstName} ${user.lastName} désapprouvé`,
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

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity';
import { LoginLog, LoginAction } from './entities/login-log.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../mail/mail.service';
import { join } from 'path';
import { unlink } from 'fs/promises';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LoginLog)
    private readonly loginLogRepository: Repository<LoginLog>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private async generateSuperviseurCode(): Promise<string> {
    let code: string;
    let exists = true;
    while (exists) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let suffix = '';
      for (let i = 0; i < 5; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `SUPERV-QLT-${suffix}`;
      const existing = await this.userRepository.findOne({ where: { superviseurCode: code } });
      exists = !!existing;
    }
    return code!;
  }

  async signup(signupDto: SignupDto, role: UserRole, file?: Express.Multer.File) {
    const { firstName, lastName, matricule, email, password, superviseurCode } = signupDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ matricule }, { email }],
    });

    if (existingUser) {
      if (existingUser.matricule === matricule) {
        throw new ConflictException('Ce matricule est deja utilise');
      }
      throw new ConflictException('Cet email est deja utilise');
    }

    let superviseur: User | null = null;

    if (role === UserRole.AGENT_QUALITE) {
      if (!superviseurCode) {
        throw new BadRequestException('Le code superviseur est requis pour inscrire un agent');
      }
      superviseur = await this.userRepository.findOne({
        where: { superviseurCode, role: UserRole.SUPERVISEUR_QUALITE },
      });
      if (!superviseur) {
        throw new BadRequestException('Code superviseur invalide ou superviseur non trouve');
      }
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      firstName,
      lastName,
      matricule,
      email,
      password: hashedPassword,
      role,
      isApproved: false,
      profileImage: file ? `/uploads/${file.filename}` : null,
      superviseurId: superviseur?.id || null,
      isApprovedBySuperviseur: false,
    });

    if (role === UserRole.SUPERVISEUR_QUALITE) {
      user.superviseurCode = await this.generateSuperviseurCode();
    }

    await this.userRepository.save(user);

    const response: any = {
      message: role === UserRole.SUPERVISEUR_QUALITE
        ? `Inscription reussie. Votre code superviseur est : ${user.superviseurCode}. Vous le trouverez dans votre profil. En attente d'approbation par le Super Admin.`
        : 'Inscription reussie. En attente d\'approbation par le Super Admin.',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        matricule: user.matricule,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };

    if (role === UserRole.SUPERVISEUR_QUALITE && user.superviseurCode) {
      response.user.superviseurCode = user.superviseurCode;
    }

    return response;
  }

  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
    const { matricule, password } = loginDto;

    let user = await this.userRepository.findOne({
      where: { matricule },
    });

    if (!user) {
      user = await this.userRepository.findOne({
        where: { email: matricule },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Matricule ou mot de passe incorrect');
    }

    if (user.role !== UserRole.SUPER_ADMIN && !user.isApproved) {
      throw new ForbiddenException(
        'Votre compte n\'a pas encore ete approuve par le Super Admin. Veuillez patienter.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Matricule ou mot de passe incorrect');
    }

    const payload = {
      sub: user.id,
      matricule: user.matricule,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    await this.logAction(user, LoginAction.LOGIN, ip, userAgent);

    return {
      message: 'Connexion reussie',
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        matricule: user.matricule,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        profileImage: user.profileImage,
        superviseurCode: user.superviseurCode,
        superviseurId: user.superviseurId,
        isApprovedBySuperviseur: user.isApprovedBySuperviseur,
      },
    };
  }

  async logout(userId: string, ip?: string, userAgent?: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (user) {
      await this.logAction(user, LoginAction.LOGOUT, ip, userAgent);
    }

    return { message: 'Deconnexion reussie' };
  }

  private async logAction(
    user: User,
    action: LoginAction,
    ip?: string,
    userAgent?: string,
  ) {
    const log = this.loginLogRepository.create({
      user,
      action,
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
    await this.loginLogRepository.save(log);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Aucun compte associe a cet email');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 12);
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.resetToken = resetTokenHash;
    user.resetTokenExpires = resetTokenExpires;
    await this.userRepository.save(user);

    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    await this.mailService.sendResetPasswordEmail(user.email, user.firstName, resetLink);

    return {
      message: 'Un email de reinitialisation a ete envoye',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.reset_token IS NOT NULL')
      .andWhere('user.reset_token_expires > NOW()')
      .getOne();

    if (!user) {
      throw new BadRequestException('Token invalide ou expire');
    }

    const isTokenValid = user.resetToken
      ? await bcrypt.compare(token, user.resetToken)
      : false;

    if (!isTokenValid) {
      throw new BadRequestException('Token invalide ou expire');
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await this.userRepository.save(user);

    return {
      message: 'Mot de passe reinitialise avec succes',
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { superviseur: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    const { password, resetToken, resetTokenExpires, superviseur, ...rest } = user;

    const superviseurData = superviseur ? {
      id: superviseur.id,
      firstName: superviseur.firstName,
      lastName: superviseur.lastName,
      matricule: superviseur.matricule,
      email: superviseur.email,
    } : null;

    return {
      ...rest,
      superviseur: superviseurData,
    };
  }

  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }
    if (!file) {
      throw new BadRequestException('Aucun fichier uploade');
    }
    if (user.profileImage) {
      const filename = user.profileImage.split('/').pop();
      if (filename) {
        try { await unlink(join(process.cwd(), 'uploads', filename)); } catch {}
      }
    }
    user.profileImage = `/uploads/${file.filename}`;
    await this.userRepository.save(user);
    return {
      message: 'Photo de profil mise a jour',
      profileImage: user.profileImage,
    };
  }

  async approveAgentBySuperviseur(superviseurId: string, agentId: string) {
    const superviseur = await this.userRepository.findOne({ where: { id: superviseurId } });
    if (!superviseur || superviseur.role !== UserRole.SUPERVISEUR_QUALITE) {
      throw new ForbiddenException('Action reservee aux superviseurs');
    }

    const agent = await this.userRepository.findOne({ where: { id: agentId } });
    if (!agent || agent.role !== UserRole.AGENT_QUALITE) {
      throw new NotFoundException('Agent non trouve');
    }

    if (agent.superviseurId !== superviseurId) {
      throw new ForbiddenException('Cet agent n\'appartient pas a votre equipe');
    }

    agent.isApprovedBySuperviseur = true;
    await this.userRepository.save(agent);

    return {
      message: `Agent ${agent.firstName} ${agent.lastName} approuve`,
      agent: {
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        matricule: agent.matricule,
        email: agent.email,
        role: agent.role,
        isApproved: agent.isApproved,
        isApprovedBySuperviseur: agent.isApprovedBySuperviseur,
      },
    };
  }

  async rejectAgentBySuperviseur(superviseurId: string, agentId: string) {
    const superviseur = await this.userRepository.findOne({ where: { id: superviseurId } });
    if (!superviseur || superviseur.role !== UserRole.SUPERVISEUR_QUALITE) {
      throw new ForbiddenException('Action reservee aux superviseurs');
    }

    const agent = await this.userRepository.findOne({ where: { id: agentId } });
    if (!agent || agent.role !== UserRole.AGENT_QUALITE) {
      throw new NotFoundException('Agent non trouve');
    }

    if (agent.superviseurId !== superviseurId) {
      throw new ForbiddenException('Cet agent n\'appartient pas a votre equipe');
    }

    agent.isApprovedBySuperviseur = false;
    await this.userRepository.save(agent);

    return {
      message: `Agent ${agent.firstName} ${agent.lastName} rejete`,
      agent: {
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        matricule: agent.matricule,
        email: agent.email,
        role: agent.role,
        isApproved: agent.isApproved,
        isApprovedBySuperviseur: agent.isApprovedBySuperviseur,
      },
    };
  }

  async getAgentsBySuperviseur(superviseurId: string) {
    const superviseur = await this.userRepository.findOne({ where: { id: superviseurId } });
    if (!superviseur || superviseur.role !== UserRole.SUPERVISEUR_QUALITE) {
      throw new ForbiddenException('Action reservee aux superviseurs');
    }

    const agents = await this.userRepository.find({
      where: { superviseurId, role: UserRole.AGENT_QUALITE },
      order: { createdAt: 'DESC' },
    });

    return agents.map(({ password, resetToken, resetTokenExpires, ...agent }) => agent);
  }
}

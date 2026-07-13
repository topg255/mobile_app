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

  async signup(signupDto: SignupDto, role: UserRole) {
    const { firstName, lastName, matricule, email, password } = signupDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ matricule }, { email }],
    });

    if (existingUser) {
      if (existingUser.matricule === matricule) {
        throw new ConflictException('Ce matricule est déjà utilisé');
      }
      throw new ConflictException('Cet email est déjà utilisé');
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
    });

    await this.userRepository.save(user);

    return {
      message: 'Inscription réussie. En attente d\'approbation par le Super Admin.',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        matricule: user.matricule,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
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
        'Votre compte n\'a pas encore été approuvé par le Super Admin. Veuillez patienter.',
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
      message: 'Connexion réussie',
      accessToken,
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

  async logout(userId: string, ip?: string, userAgent?: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (user) {
      await this.logAction(user, LoginAction.LOGOUT, ip, userAgent);
    }

    return { message: 'Déconnexion réussie' };
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
      throw new NotFoundException('Aucun compte associé à cet email');
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
      message: 'Un email de réinitialisation a été envoyé',
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
      throw new BadRequestException('Token invalide ou expiré');
    }

    const isTokenValid = user.resetToken
      ? await bcrypt.compare(token, user.resetToken)
      : false;

    if (!isTokenValid) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await this.userRepository.save(user);

    return {
      message: 'Mot de passe réinitialisé avec succès',
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const { password, resetToken, resetTokenExpires, ...userWithoutSensitiveData } = user;

    return userWithoutSensitiveData;
  }
}

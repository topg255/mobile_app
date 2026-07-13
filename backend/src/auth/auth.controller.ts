import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserRole } from './entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup/agent-qualite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inscription d\'un Agent Qualité',
    description:
      'Crée un nouveau compte pour un **Agent Qualité**.\n\n' +
      'Le rôle `agent_qualite` est attribué automatiquement.\n\n' +
      '**Important :** Le compte sera en attente d\'approbation par le Super Admin.',
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: 'Inscription réussie. En attente d\'approbation.',
  })
  async signupAgent(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto, UserRole.AGENT_QUALITE);
  }

  @Post('signup/superviseur-qualite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inscription d\'un Superviseur Qualité',
    description:
      'Crée un nouveau compte pour un **Superviseur Qualité**.\n\n' +
      'Le rôle `superviseur_qualite` est attribué automatiquement.\n\n' +
      '**Important :** Le compte sera en attente d\'approbation par le Super Admin.',
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: 'Inscription réussie. En attente d\'approbation.',
  })
  async signupSuperviseur(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto, UserRole.SUPERVISEUR_QUALITE);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion utilisateur',
    description:
      'Authentifie un utilisateur avec son matricule et mot de passe.\n\n' +
      '**Condition :** Le compte doit être approuvé par le Super Admin (sauf le Super Admin lui-même).\n\n' +
      'Retourne un **token JWT** valable 24 heures.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie.',
  })
  @ApiResponse({
    status: 401,
    description: 'Identifiants incorrects',
  })
  @ApiResponse({
    status: 403,
    description: 'Compte non approuvé par le Super Admin',
  })
  async login(@Body() loginDto: LoginDto, @Request() req) {
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Déconnexion utilisateur',
    description: 'Enregistre la déconnexion et retourne un message de confirmation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Déconnexion réussie.',
  })
  async logout(@Request() req) {
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.logout(req.user.id, ip, userAgent);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demander la réinitialisation du mot de passe',
    description:
      'Envoie un email contenant un lien de réinitialisation du mot de passe.\n\n' +
      'Le lien expire après **15 minutes**.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Email de réinitialisation envoyé avec succès',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Réinitialiser le mot de passe',
    description: 'Réinitialise le mot de passe avec un nouveau mot de passe.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe réinitialisé avec succès',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Récupérer le profil utilisateur connecté',
    description: 'Retourne les informations du profil de l\'utilisateur authentifié.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil utilisateur retourné avec succès',
  })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }
}

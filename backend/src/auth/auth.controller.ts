import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Patch,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

const imageStorage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + uniqueSuffix + extname(file.originalname));
  },
});

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
    cb(new Error('Seules les images sont acceptees'), false);
  } else {
    cb(null, true);
  }
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup/agent-qualite')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Inscription d'un Agent Qualite" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        matricule: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        superviseurCode: {
          type: 'string',
          description: 'Code SUPERV-QLT-XXXXX du superviseur',
        },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Inscription reussie. En attente d'approbation.",
  })
  async signupAgent(
    @Body() signupDto: SignupDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.authService.signup(signupDto, UserRole.AGENT_QUALITE, file);
  }

  @Post('signup/superviseur-qualite')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Inscription d'un Superviseur Qualite" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        matricule: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Inscription reussie. En attente d'approbation.",
  })
  async signupSuperviseur(
    @Body() signupDto: SignupDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.authService.signup(
      signupDto,
      UserRole.SUPERVISEUR_QUALITE,
      file,
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion utilisateur',
    description:
      'Authentifie un utilisateur avec son matricule et mot de passe.\n\n' +
      '**Condition :** Le compte doit etre approuve par le Super Admin (sauf le Super Admin lui-meme).\n\n' +
      'Retourne un **token JWT** valable 24 heures.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Connexion reussie.' })
  @ApiResponse({ status: 401, description: 'Identifiants incorrects' })
  @ApiResponse({
    status: 403,
    description: 'Compte non approuve par le Super Admin',
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
  @ApiOperation({ summary: 'Deconnexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Deconnexion reussie.' })
  async logout(@Request() req) {
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.logout(req.user.id, ip, userAgent);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demander la reinitialisation du mot de passe' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Email de reinitialisation envoye avec succes',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reinitialiser le mot de passe' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe reinitialise avec succes',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Recuperer le profil utilisateur connecte' })
  @ApiResponse({
    status: 200,
    description: 'Profil utilisateur retourne avec succes',
  })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader une photo de profil' })
  @ApiResponse({
    status: 201,
    description: 'Photo de profil uploadee avec succes',
  })
  async uploadProfileImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.authService.uploadProfileImage(req.user.id, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISEUR_QUALITE)
  @Get('agents')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Liste des agents du superviseur' })
  async getAgentsBySuperviseur(@Request() req) {
    return this.authService.getAgentsBySuperviseur(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISEUR_QUALITE)
  @Post('agents/:agentId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Approuver un agent par le superviseur' })
  async approveAgent(@Request() req, @Param('agentId') agentId: string) {
    return this.authService.approveAgentBySuperviseur(req.user.id, agentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISEUR_QUALITE)
  @Post('agents/:agentId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rejeter un agent par le superviseur' })
  async rejectAgent(@Request() req, @Param('agentId') agentId: string) {
    return this.authService.rejectAgentBySuperviseur(req.user.id, agentId);
  }
}

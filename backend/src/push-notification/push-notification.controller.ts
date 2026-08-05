import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PushNotifierService } from './push-notifier.service';
import { PushEscalationService } from './push-escalation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { RateLimitGuard } from './guards/rate-limit.guard';
import {
  SubscribePushDto,
  UnsubscribePushDto,
  UpdatePreferencesDto,
} from './dto/subscribe-push.dto';
import {
  SendPushDto,
  PushStatusDto,
  UpdateEscalationDto,
} from './dto/push.dto';
import { PushPriority } from './entities/push-notification-history.entity';

@ApiTags('Push Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('push')
export class PushNotificationController {
  constructor(
    private readonly notifier: PushNotifierService,
    private readonly escalation: PushEscalationService,
  ) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Cle publique VAPID pour l\'abonnement navigateur' })
  async getVapidPublicKey() {
    return { publicKey: this.notifier.getVapidPublicKey() };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @ApiOperation({
    summary: 'Enregistrer un abonnement push (appele par le Service Worker)',
  })
  @ApiResponse({ status: 201, description: 'Abonnement enregistre' })
  async subscribe(@Request() req, @Body() dto: SubscribePushDto) {
    return this.notifier.subscribe(
      req.user,
      dto.endpoint,
      dto.p256dh,
      dto.auth,
      { browser: dto.browser, device: dto.device, platform: dto.platform },
    );
  }

  @Post('unsubscribe')
  @ApiOperation({ summary: 'Desactiver un abonnement push (ou tous)' })
  async unsubscribe(@Request() req, @Body() dto: UnsubscribePushDto) {
    return this.notifier.unsubscribe(req.user, dto.endpoint);
  }

  @Post('test')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @ApiOperation({ summary: 'Envoyer une notification de test' })
  async sendTest(@Request() req) {
    return this.notifier.sendTest(req.user);
  }

  @Post('send')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @ApiOperation({ summary: 'Diffusion ciblee (Super Admin uniquement)' })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Role des destinataires si userIds absent',
  })
  async send(@Request() req, @Body() dto: SendPushDto) {
    let userIds = dto.userIds ?? [];
    if (dto.role) {
      const users = await this.notifier.usersByRole(dto.role as UserRole);
      userIds = users.map((u) => u.id);
    }
    if (userIds.length === 0) {
      return {
        message: 'Aucun destinataire cible',
        sentCount: 0,
        reachedCount: 0,
      };
    }
    return this.notifier.broadcast(userIds, {
      title: dto.title,
      body: dto.body,
      category: dto.category,
      priority: dto.priority ?? PushPriority.MEDIUM,
      data: dto.data,
    });
  }

  @Get('history')
  @ApiOperation({ summary: 'Historique des notifications push' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getHistory(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifier.getHistory(
      req.user,
      Number(page) || 1,
      Number(limit) || 25,
    );
  }

  @Get('settings')
  @ApiOperation({
    summary: 'Preferences de notification et appareils enregistres',
  })
  async getSettings(@Request() req) {
    const [preferences, subscriptions] = await Promise.all([
      this.notifier.getOrCreatePreferences(req.user.id),
      this.notifier.getSubscriptions(req.user),
    ]);
    return { preferences, subscriptions };
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Mettre a jour les preferences de notification' })
  async updateSettings(@Request() req, @Body() dto: UpdatePreferencesDto) {
    return this.notifier.updatePreferences(req.user.id, dto);
  }

  @Post('status')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @ApiOperation({
    summary:
      'Statut de livraison/ouverture/clic (appele par le Service Worker)',
  })
  async updateStatus(@Request() req, @Body() dto: PushStatusDto) {
    return this.notifier.updateStatus(req.user, dto.historyId, dto.status);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Statistiques de notifications (Super Admin: toutes les donnees)',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Nombre de jours (defaut 14)',
  })
  async getAnalytics(@Request() req, @Query('days') days?: string) {
    return this.notifier.getAnalytics(req.user, Number(days) || 14);
  }

  @Get('escalation')
  @ApiOperation({ summary: "Config systeme d'escalade" })
  async getEscalationConfig() {
    return this.escalation.getOrCreateConfig();
  }

  @Patch('escalation')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: "Mettre a jour la config d'escalade (Super Admin uniquement)",
  })
  async updateEscalationConfig(@Body() dto: UpdateEscalationDto) {
    return this.escalation.updateConfig(dto);
  }

  @Post('escalation/run')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: "Declencher manuellement l'escalade (Super Admin uniquement)",
  })
  @ApiResponse({ status: 200, description: 'Escalade executee' })
  async runEscalation() {
    return this.escalation.runEscalation();
  }
}

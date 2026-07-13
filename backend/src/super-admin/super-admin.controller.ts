import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Super Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Statistiques globales',
    description: 'Retourne les statistiques de la plateforme : nombre d\'utilisateurs, agents, superviseurs, en attente, etc.',
  })
  @ApiResponse({ status: 200, description: 'Statistiques retournées' })
  async getStats() {
    return this.superAdminService.getStats();
  }

  @Get('users')
  @ApiOperation({
    summary: 'Lister tous les utilisateurs',
    description: 'Retourne la liste de tous les utilisateurs de la plateforme.',
  })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  async getAllUsers() {
    return this.superAdminService.getAllUsers();
  }

  @Get('users/pending')
  @ApiOperation({
    summary: 'Utilisateurs en attente d\'approbation',
    description: 'Retourne tous les utilisateurs qui n\'ont pas encore été approuvés.',
  })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs en attente' })
  async getPendingUsers() {
    return this.superAdminService.getPendingUsers();
  }

  @Post('users/:userId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approuver un utilisateur',
    description: 'Approuve le compte d\'un agent ou superviseur. L\'utilisateur pourra alors se connecter.',
  })
  @ApiResponse({ status: 200, description: 'Utilisateur approuvé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async approveUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.superAdminService.approveUser(userId);
  }

  @Post('users/:userId/disapprove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Désapprouver un utilisateur',
    description: 'Désapprouve le compte d\'un agent ou superviseur. L\'utilisateur ne pourra plus se connecter.',
  })
  @ApiResponse({ status: 200, description: 'Utilisateur désapprouvé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async disapproveUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.superAdminService.disapproveUser(userId);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer un utilisateur',
    description: 'Supprime définitivement un utilisateur de la plateforme.',
  })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async deleteUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.superAdminService.deleteUser(userId);
  }

  @Get('logs')
  @ApiOperation({
    summary: 'Historique des connexions/déconnexions',
    description: 'Retourne l\'historique de toutes les connexions et déconnexions avec date, heure et détails.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiResponse({ status: 200, description: 'Historique des logs' })
  async getAllLoginLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.superAdminService.getAllLoginLogs(page || 1, limit || 50);
  }

  @Get('logs/user/:userId')
  @ApiOperation({
    summary: 'Historique des connexions d\'un utilisateur',
    description: 'Retourne l\'historique de connexion/déconnexion d\'un utilisateur spécifique.',
  })
  @ApiResponse({ status: 200, description: 'Historique de l\'utilisateur' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async getLoginLogsByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.superAdminService.getLoginLogsByUser(userId);
  }
}

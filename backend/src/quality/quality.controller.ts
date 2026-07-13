import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { QualityService } from './quality.service';
import { CreateControleDateDto } from './dto/create-controle-date.dto';
import { CreateLigneControleDto } from './dto/create-ligne-controle.dto';
import { RapportDto } from './dto/rapport.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Quality - Contrôle Qualité')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quality')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  // ==================== CONTROLES DATES ====================

  @Post('controle-dates')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.AGENT_QUALITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une date de contrôle',
    description:
      'Ajoute une nouvelle date de contrôle.\n\n' +
      '**Règles :**\n' +
      '- Seules les dates d\'aujourd\'hui ou futures sont acceptées\n' +
      '- Les dates passées sont bloquées\n' +
      '- Chaque date doit être unique',
  })
  @ApiBody({ type: CreateControleDateDto })
  @ApiResponse({
    status: 201,
    description: 'Date de contrôle créée avec succès',
    schema: {
      example: {
        message: 'Date de contrôle créée avec succès',
        controleDate: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          dateControle: '2026-07-13',
          isActive: true,
          createdAt: '2026-07-13T15:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Date passée ou date déjà existante',
    schema: {
      example: {
        statusCode: 400,
        message: 'Vous ne pouvez pas ajouter une date passée.',
        error: 'Bad Request',
      },
    },
  })
  async createControleDate(
    @Body() dto: CreateControleDateDto,
    @Request() req,
  ) {
    return this.qualityService.createControleDate(dto, req.user);
  }

  @Get('controle-dates')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.AGENT_QUALITE)
  @ApiOperation({
    summary: 'Lister toutes les dates de contrôle',
    description: 'Retourne la liste de toutes les dates de contrôle triées par date décroissante.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des dates de contrôle',
  })
  async getAllControleDates() {
    return this.qualityService.getAllControleDates();
  }

  // ==================== LIGNES CONTROLE ====================

  @Post('lignes')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.AGENT_QUALITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ajouter une ligne de contrôle',
    description:
      'Ajoute une nouvelle ligne de contrôle rattachée à une date de contrôle.\n\n' +
      '**Champs :**\n' +
      '- `note` : vert, jaune ou rouge\n' +
      '- `delais` : délai en minutes\n' +
      '- `responsable` : nom du responsable\n' +
      '- `details` : description de la ligne\n' +
      '- `controleDateId` : UUID de la date de contrôle',
  })
  @ApiBody({ type: CreateLigneControleDto })
  @ApiResponse({
    status: 201,
    description: 'Ligne de contrôle ajoutée avec succès',
    schema: {
      example: {
        message: 'Ligne de contrôle ajoutée avec succès',
        ligne: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          note: 'vert',
          delais: '30',
          responsable: 'Ahmed Trabelsi',
          details: 'Arrêt machine pour maintenance préventive',
          createdAt: '2026-07-13T15:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Date de contrôle non trouvée',
  })
  async createLigneControle(
    @Body() dto: CreateLigneControleDto,
    @Request() req,
  ) {
    return this.qualityService.createLigneControle(dto, req.user);
  }

  @Get('lignes/mes-lignes')
  @Roles(UserRole.AGENT_QUALITE)
  @ApiOperation({
    summary: 'Voir mes lignes de contrôle',
    description:
      'Retourne les lignes de contrôle de l\'agent connecté.\n\n' +
      '**Agent Qualité** : ne peut voir que ses propres lignes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des lignes de l\'agent',
  })
  async getMesLignes(@Request() req) {
    return this.qualityService.getMesLignes(req.user);
  }

  @Get('lignes/agent/:agentId')
  @Roles(UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({
    summary: 'Voir les lignes d\'un agent qualité',
    description:
      'Retourne les lignes de contrôle d\'un agent spécifique.\n\n' +
      '**Superviseur Qualité uniquement** : accès à l\'historique de chaque agent.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des lignes de l\'agent',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - non superviseur',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent non trouvé',
  })
  async getLignesAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Request() req,
  ) {
    return this.qualityService.getLignesAgent(agentId, req.user);
  }

  @Get('lignes')
  @Roles(UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({
    summary: 'Voir toutes les lignes de contrôle',
    description:
      'Retourne toutes les lignes de contrôle de tous les agents.\n\n' +
      '**Superviseur Qualité uniquement**.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste de toutes les lignes',
  })
  async getAllLignes(@Request() req) {
    return this.qualityService.getAllLignes(req.user);
  }

  @Get('historique-agents')
  @Roles(UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({
    summary: 'Historique complet de tous les agents',
    description:
      'Retourne l\'historique de chaque agent qualité avec le nombre total de lignes et les détails.\n\n' +
      '**Superviseur Qualité uniquement**.',
  })
  @ApiResponse({
    status: 200,
    description: 'Historique de tous les agents',
    schema: {
      example: [
        {
          agent: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            firstName: 'Ahmed',
            lastName: 'Trabelsi',
            matricule: 'AGT-2024-001',
          },
          totalLignes: 15,
          lignes: [],
        },
      ],
    },
  })
  async getHistoriqueAgents(@Request() req) {
    return this.qualityService.getHistoriqueAgents(req.user);
  }

  // ==================== RAPPORT ====================

  @Post('rapport')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.AGENT_QUALITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Générer un rapport qualité',
    description:
      'Génère un rapport pour une période donnée avec :\n\n' +
      '- **Répartition en pourcentage** : vert, jaune, rouge\n' +
      '- **Minutes d\'arrêt cumulées**\n' +
      '- **Détails de chaque ligne**\n\n' +
      '**Conditions d\'accès :**\n' +
      '- **Agent Qualité** : voit uniquement ses propres données\n' +
      '- **Superviseur Qualité** : voit toutes les données ou peut filtrer par agent',
  })
  @ApiBody({ type: RapportDto })
  @ApiResponse({
    status: 200,
    description: 'Rapport généré avec succès',
    schema: {
      example: {
        periode: { debut: '2026-07-01', fin: '2026-07-13' },
        totalLignes: 10,
        repartition: { vert: 5, jaune: 3, rouge: 2 },
        repartitionPourcentage: { vert: 50, jaune: 30, rouge: 20 },
        minutesArretCumulees: 150,
        details: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            note: 'vert',
            delais: '30',
            responsable: 'Ahmed Trabelsi',
            details: 'Arrêt machine pour maintenance',
            dateControle: '2026-07-10',
            agent: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              firstName: 'Ahmed',
              lastName: 'Trabelsi',
              matricule: 'AGT-2024-001',
            },
            createdAt: '2026-07-10T15:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Date de début après date de fin',
  })
  async getRapport(@Body() dto: RapportDto, @Request() req) {
    return this.qualityService.getRapport(dto, req.user);
  }
}

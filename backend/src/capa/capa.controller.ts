import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { CapaService } from './capa.service';
import { CapaStatus, CapaPriority, CapaType } from './entities/capa.entity';
import { ActionType, ActionStatus } from './entities/capa-action.entity';

@ApiTags('CAPA')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('capa')
export class CapaController {
  constructor(private readonly capaService: CapaService) {}

  @Post()
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un CAPA' })
  async createCapa(
    @Request() req,
    @Body()
    body: {
      titre: string;
      description: string;
      type: CapaType;
      priority: CapaPriority;
      dateEcheance: string;
      ligneControleId?: string;
      nomLigne?: string;
      causeRacine?: string;
      coutEstime?: number;
    },
  ) {
    return this.capaService.createCapa(req.user.id, {
      ...body,
      dateEcheance: new Date(body.dateEcheance),
    });
  }

  @Get()
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister les CAPAs' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'ligneControleId', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  async getAll(
    @Request() req,
    @Query('status') status?: CapaStatus,
    @Query('priority') priority?: CapaPriority,
    @Query('type') type?: CapaType,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('ligneControleId') ligneControleId?: string,
    @Query('agentId') agentId?: string,
  ) {
    if (agentId) {
      return this.capaService.getCapasForAgent(agentId);
    }
    return this.capaService.getAllCapas(req.user.id, {
      status,
      priority,
      type,
      dateFrom,
      dateTo,
      ligneControleId,
    });
  }

  @Get('stats')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Statistiques CAPA' })
  async getStats(@Request() req) {
    return this.capaService.getStats(req.user.id);
  }

  @Get('agents')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Agents du superviseur (pour assignation)' })
  async getAgents(@Request() req) {
    return this.capaService.getAgentsOfSuperviseur(req.user.id);
  }

  @Get(':id')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Détail d\'un CAPA' })
  async getById(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.capaService.getCapaById(id, req.user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Changer le statut d\'un CAPA' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() body: { status: CapaStatus; note?: string },
  ) {
    return this.capaService.updateCapaStatus(id, req.user.id, body.status, body.note);
  }

  @Post(':id/actions')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ajouter une action à un CAPA' })
  async addAction(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body()
    body: {
      titre: string;
      description: string;
      type: ActionType;
      responsableId: string;
      responsableName: string;
      dateEcheance: string;
    },
  ) {
    return this.capaService.addAction(id, req.user.id, {
      ...body,
      dateEcheance: new Date(body.dateEcheance),
    });
  }

  @Patch(':id/actions/:actionId')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour une action' })
  async updateAction(
    @Param('id', ParseIntPipe) id: number,
    @Param('actionId', ParseIntPipe) actionId: number,
    @Request() req,
    @Body()
    body: {
      titre?: string;
      description?: string;
      status?: ActionStatus;
      preuve?: string;
    },
  ) {
    return this.capaService.updateAction(actionId, req.user.id, body);
  }

  @Patch('actions/:actionId/complete')
  @Roles(UserRole.AGENT_QUALITE)
  @ApiOperation({ summary: 'Agent : marquer action terminée' })
  async completeAction(
    @Param('actionId', ParseIntPipe) actionId: number,
    @Request() req,
    @Body() body: { preuve: string },
  ) {
    return this.capaService.completeActionByAgent(actionId, req.user.id, body.preuve);
  }

  @Post(':id/commentaires')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN, UserRole.AGENT_QUALITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ajouter un commentaire' })
  async addCommentaire(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() body: { contenu: string },
  ) {
    return this.capaService.addCommentaire(id, req.user.id, body.contenu);
  }

  @Get(':id/pdf')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Générer le PDF du CAPA' })
  async getPdf(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Res() res: Response,
  ) {
    const buffer = await this.capaService.generateCapaPdf(id, req.user.id);
    const capa = await this.capaService.getCapaById(id, req.user.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${capa.reference}.pdf"`,
    });
    res.send(buffer);
  }
}
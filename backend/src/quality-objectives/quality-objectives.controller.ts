import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
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
import { QualityObjectivesService } from './quality-objectives.service';
import { CreateQualityObjectiveDto } from './dto/create-quality-objective.dto';
import { UpdateQualityObjectiveDto } from './dto/update-quality-objective.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import {
  ObjectiveCategory,
  ObjectiveStatus,
} from './entities/quality-objective.entity';

@ApiTags('Quality Objectives')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quality-objectives')
export class QualityObjectivesController {
  constructor(private readonly objectivesService: QualityObjectivesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Creer un objectif qualite' })
  @ApiResponse({ status: 201, description: 'Objectif cree' })
  @ApiResponse({ status: 400, description: 'Validation echouee' })
  async create(@Request() req, @Body() dto: CreateQualityObjectiveDto) {
    return this.objectivesService.create(req.user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les objectifs (scope par role)' })
  @ApiQuery({ name: 'status', required: false, enum: ObjectiveStatus })
  @ApiQuery({ name: 'category', required: false, enum: ObjectiveCategory })
  @ApiQuery({ name: 'superviseurId', required: false, description: 'Super Admin uniquement' })
  async findAll(
    @Request() req,
    @Query('status') status?: ObjectiveStatus,
    @Query('category') category?: ObjectiveCategory,
    @Query('superviseurId') superviseurId?: string,
  ) {
    return this.objectivesService.findAll(req.user, status, category, superviseurId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord des objectifs (KPIs, evolution, risques, badges)' })
  @ApiQuery({ name: 'superviseurId', required: false, description: 'Super Admin uniquement' })
  async getDashboard(@Request() req, @Query('superviseurId') superviseurId?: string) {
    return this.objectivesService.getDashboard(req.user, superviseurId);
  }

  @Get('predictions')
  @ApiOperation({ summary: 'Predictions de reussite de tous les objectifs' })
  @ApiQuery({ name: 'superviseurId', required: false, description: 'Super Admin uniquement' })
  async getPredictions(@Request() req, @Query('superviseurId') superviseurId?: string) {
    return this.objectivesService.getPredictions(req.user, superviseurId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historique journalier (tous ou un objectif)' })
  @ApiQuery({ name: 'objectiveId', required: false })
  async getHistory(@Request() req, @Query('objectiveId') objectiveId?: string) {
    return this.objectivesService.getHistory(req.user, objectiveId);
  }

  @Get('badges')
  @ApiOperation({ summary: 'Badges debloques (scope par role)' })
  @ApiQuery({ name: 'superviseurId', required: false, description: 'Super Admin uniquement' })
  async getBadges(@Request() req, @Query('superviseurId') superviseurId?: string) {
    return this.objectivesService.getBadges(req.user, superviseurId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail d\'un objectif' })
  @ApiResponse({ status: 404, description: 'Objectif introuvable' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.objectivesService.findOne(req.user, id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Modifier un objectif' })
  @ApiResponse({ status: 403, description: 'Acces refuse' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateQualityObjectiveDto,
  ) {
    return this.objectivesService.update(req.user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Supprimer un objectif' })
  @ApiResponse({ status: 200, description: 'Objectif supprime' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.objectivesService.remove(req.user, id);
  }
}

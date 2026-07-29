import {
  Controller,
  Get,
  Post,
  Param,
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
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('AI Report Service')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('generate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Générer les rapports IA manuellement' })
  @ApiQuery({ name: 'date', required: false, description: 'Date YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Rapports générés' })
  @ApiResponse({ status: 400, description: 'Erreur de validation' })
  async manualGenerate(@Query('date') date?: string) {
    try {
      const reports = await this.reportService.manualGenerate(date || undefined);
      return {
        message: `${reports.length} rapport(s) généré(s) avec succès`,
        reports,
      };
    } catch (error) {
      return { message: `Erreur: ${error.message}`, reports: [] };
    }
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Historique des rapports IA' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'superviseurId', required: false })
  async getReports(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('superviseurId') superviseurId?: string,
  ) {
    const effectiveId = req.user.role === UserRole.SUPERVISEUR_QUALITE
      ? req.user.id
      : superviseurId;
    return this.reportService.getReports(
      effectiveId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Statistiques des rapports' })
  async getReportStats() {
    return this.reportService.getReportStats();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Détail d\'un rapport' })
  async getReportById(@Param('id') id: string) {
    return this.reportService.getReportById(id);
  }
}

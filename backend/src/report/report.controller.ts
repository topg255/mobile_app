import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  Body,
  UseGuards,
  Request,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportService } from './report.service';
import { CreateReportRecipientDto } from './dto/create-report-recipient.dto';
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
  @ApiOperation({ summary: 'Generer les rapports IA manuellement' })
  @ApiQuery({ name: 'date', required: false, description: 'Date YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Rapports generes' })
  @ApiResponse({ status: 400, description: 'Erreur de validation' })
  async manualGenerate(@Query('date') date?: string) {
    try {
      const reports = await this.reportService.manualGenerate(date || undefined);
      return {
        message: `${reports.length} rapport(s) genere(s) avec succes`,
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

  @Get('recipients')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Liste des destinataires additionnels du rapport' })
  @ApiResponse({ status: 200, description: 'Liste des destinataires' })
  async getRecipients(@Request() req) {
    return this.reportService.getRecipients(req.user);
  }

  @Post('recipients')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Ajouter un destinataire additionnel au rapport IA' })
  @ApiQuery({ name: 'superviseurId', required: false, description: 'ID du superviseur (Super Admin uniquement)' })
  @ApiResponse({ status: 201, description: 'Destinataire ajoute' })
  @ApiResponse({ status: 400, description: 'Email invalide ou email du superviseur' })
  @ApiResponse({ status: 409, description: 'Email deja present' })
  async addRecipient(
    @Request() req,
    @Body() dto: CreateReportRecipientDto,
    @Query('superviseurId') superviseurId?: string,
  ) {
    return this.reportService.addRecipient(req.user, dto.email, superviseurId);
  }

  @Delete('recipients/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Supprimer un destinataire additionnel' })
  @ApiResponse({ status: 200, description: 'Destinataire supprime' })
  @ApiResponse({ status: 404, description: 'Destinataire non trouve' })
  async removeRecipient(@Request() req, @Param('id') id: string) {
    return this.reportService.removeRecipient(id, req.user);
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Statistiques des rapports' })
  async getReportStats() {
    return this.reportService.getReportStats();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Detail d\'un rapport' })
  async getReportById(@Param('id') id: string) {
    return this.reportService.getReportById(id);
  }

  @Get(':id/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Telecharger le PDF d\'un rapport' })
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.reportService.downloadReportPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-qualite-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISEUR_QUALITE)
  @ApiOperation({ summary: 'Supprimer un rapport' })
  async deleteReport(@Param('id') id: string) {
    await this.reportService.deleteReport(id);
    return { message: 'Rapport supprime avec succes' };
  }
}

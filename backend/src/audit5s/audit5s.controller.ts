import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { Audit5SService } from './audit5s.service';
import { Pilier5S } from './entities/critere5s.entity';

@ApiTags('Audit 5S')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit5s')
export class Audit5SController {
  constructor(private readonly audit5sService: Audit5SService) {}

  @Get('criteres')
  @ApiOperation({ summary: 'Obtenir les critères 5S' })
  async getCriteres(@Request() req: any) {
    const superviseurId = req.user.superviseurId || req.user.id;
    return this.audit5sService.getCriteres(superviseurId);
  }

  @Post('submit')
  @Roles(UserRole.AGENT_QUALITE, UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soumettre un audit 5S' })
  async submitAudit(
    @Request() req: any,
    @Body() body: {
      ligneControleId: string;
      reponses: Record<string, boolean>;
      commentaireAgent?: string;
      dureeSecondes?: number;
    },
  ) {
    return this.audit5sService.submitAudit(req.user.id, body.ligneControleId, {
      reponses: body.reponses,
      commentaireAgent: body.commentaireAgent,
      dureeSecondes: body.dureeSecondes,
    });
  }

  @Get('historique/:ligneControleId')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Historique des audits d'une ligne" })
  async getHistorique(@Param('ligneControleId') ligneControleId: string) {
    return this.audit5sService.getHistoriqueAudit(ligneControleId);
  }

  @Get('stats')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Statistiques 5S du superviseur' })
  async getStats(@Request() req: any) {
    return this.audit5sService.getStatsAudit5S(req.user.id);
  }

  @Get(':id/pdf')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.AGENT_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Télécharger le PDF du rapport 5S' })
  async getPdf(@Param('id') id: number, @Res() res: Response) {
    const pdfBuffer = await this.audit5sService.generateAuditPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="audit-5s-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Put('criteres')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Personnaliser les critères 5S' })
  async updateCriteres(
    @Request() req: any,
    @Body() body: {
      criteres: { pilier: Pilier5S; label: string; points: number; ordre: number }[];
    },
  ) {
    await this.audit5sService.updateCriteres(req.user.id, body);
    return { message: 'Critères mis à jour avec succès' };
  }
}

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { SignatureService } from './signature.service';
import { ReportService } from '../report/report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Signature numérique')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('signature')
export class SignatureController {
  constructor(
    private readonly signatureService: SignatureService,
    private readonly reportService: ReportService,
  ) {}

  @Post('sign/:reportId')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signer numériquement un rapport PDF' })
  @ApiResponse({ status: 200, description: 'PDF signé retourné' })
  @ApiResponse({ status: 404, description: 'Rapport non trouvé' })
  async signReport(
    @Param('reportId') reportId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportService.downloadReportPdf(reportId);
    const result = await this.signatureService.signReport(
      reportId,
      pdfBuffer,
      req.user.id,
      req.ip,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-${reportId}-signe.pdf"`,
      'Content-Length': result.signedPdf.length,
      'X-Signature-Hash': result.signatureHash,
      'X-Audit-Id': result.auditId,
      'X-Signed-At': result.signedAt,
      'X-Certificate-Thumbprint': result.certificateThumbprint,
    });
    res.end(result.signedPdf);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('pdf', {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        pdf: { type: 'string', format: 'binary' },
        reportId: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: "Vérifier la signature d'un PDF téléversé" })
  async verifyPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('reportId') reportId?: string,
  ) {
    if (!file) {
      return {
        isValid: false,
        details: ['Aucun fichier PDF fourni (champ "pdf" requis)'],
        timestampValid: false,
      };
    }
    return this.signatureService.verifySignature(file.buffer, reportId);
  }

  @Get('audit/:reportId')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Piste d'audit des signatures d'un rapport" })
  async getAuditTrail(@Param('reportId') reportId: string) {
    const audits = await this.signatureService.getAuditTrail(reportId);
    return {
      reportId,
      count: audits.length,
      items: audits,
    };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { SignaturePadService } from './signature-pad.service';
import { UploadSignatureDto } from './dto/signature-pad.dto';

@ApiTags('Signature Pad')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('signature-pad')
export class SignaturePadController {
  constructor(private readonly signaturePadService: SignaturePadService) {}

  @Post('upload')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('signature', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Enregistrer la signature manuscrite (multipart champ "signature" ou body JSON imageBase64)',
  })
  @ApiResponse({ status: 201, description: 'Signature enregistree' })
  async upload(
    @Request() req,
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: UploadSignatureDto,
  ) {
    const imageBase64 =
      file && file.buffer && file.buffer.length > 0
        ? file.buffer.toString('base64')
        : (body?.imageBase64 ?? '');

    const result = await this.signaturePadService.saveRawSignature(
      req.user.id,
      imageBase64,
      body?.width ?? 520,
      body?.height ?? 180,
    );
    return {
      id: result.id,
      superviseurId: result.superviseurId,
      processingStatus: result.processingStatus,
    };
  }

  @Get('me')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Signature actuelle du superviseur connecte' })
  @ApiResponse({ status: 200, description: 'Signature (ou null)' })
  async getMySignature(@Request() req) {
    return this.signaturePadService.getSignature(req.user.id);
  }

  @Get('status/:id')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Statut de traitement d une signature' })
  async getStatus(@Param('id', ParseIntPipe) id: number) {
    return this.signaturePadService.getProcessingStatus(id);
  }

  @Delete('me')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactiver la signature du superviseur connecte' })
  async deleteMySignature(@Request() req) {
    return this.signaturePadService.deleteSignature(req.user.id);
  }
}
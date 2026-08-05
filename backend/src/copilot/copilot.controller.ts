import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CopilotService } from './copilot.service';
import { ChatRequestDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Copilote IA')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('copilot')
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Post('chat')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Chat avec le copilote IA (Groq)' })
  @ApiResponse({ status: 200, description: 'Reponse du copilote avec suggestions' })
  @ApiResponse({ status: 400, description: 'Erreur de validation ou IA indisponible' })
  async chat(@Request() req, @Body() dto: ChatRequestDto) {
    return this.copilotService.chat(
      req.user.id,
      `${req.user.firstName} ${req.user.lastName}`,
      dto.messages,
    );
  }
}

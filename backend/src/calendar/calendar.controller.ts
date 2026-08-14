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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto, MyTasksQueryDto } from './dto/query-events.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Calendar')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister les evenements du calendrier (tenant)' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Borne inferieure (ISO)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'Borne superieure (ISO)' })
  async getEvents(@Request() req, @Query() query: QueryEventsDto) {
    return this.calendarService.getEvents(req.user.id, query);
  }

  @Post('events')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Creer un evenement / assigner une tache' })
  @ApiResponse({ status: 201, description: 'Evenement cree' })
  async createEvent(@Request() req, @Body() dto: CreateEventDto) {
    return this.calendarService.createEvent(req.user.id, dto);
  }

  @Get('events/stats')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Statistiques du mois courant' })
  async getStats(@Request() req) {
    return this.calendarService.getStats(req.user.id);
  }

  @Get('events/my-tasks')
  @Roles(UserRole.AGENT_QUALITE, UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Taches assignees a l utilisateur connecte' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Borne inferieure (ISO)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'Borne superieure (ISO)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'in_progress', 'completed'] })
  async getMyTasks(@Request() req, @Query() query: MyTasksQueryDto) {
    const events = await this.calendarService.getMyAssignedEvents(
      req.user.id,
      query.startDate,
      query.endDate,
      query.status,
    );
    const names = await this.calendarService.getSupervisionNames(
      [...new Set(events.map((e) => e.superviseurId))],
    );
    return events.map((e) => ({
      ...e,
      supervisorName: names[e.superviseurId],
    }));
  }

  @Get('events/:id')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Detail d un evenement' })
  async getEventById(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.calendarService.getEventById(id, req.user.id);
  }

  @Patch('events/:id')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifier un evenement' })
  async updateEvent(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendarService.updateEvent(id, req.user.id, dto);
  }

  @Patch('events/:id/complete')
  @Roles(UserRole.AGENT_QUALITE, UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Marquer une tache comme terminee (agent)' })
  async completeEvent(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { completedNote?: string },
  ) {
    return this.calendarService.completeEvent(
      id,
      req.user.id,
      body.completedNote,
    );
  }

  @Delete('events/:id')
  @Roles(UserRole.SUPERVISEUR_QUALITE, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer un evenement (et ses occurrences)' })
  async deleteEvent(@Request() req, @Param('id', ParseIntPipe) id: number) {
    await this.calendarService.deleteEvent(id, req.user.id);
    return { message: 'Evenement supprime' };
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Notifications du calendrier (50 dernieres)' })
  async getNotifications(@Request() req) {
    return this.calendarService.getNotifications(req.user.id);
  }

  @Patch('notifications/read')
  @ApiOperation({ summary: 'Marquer les notifications comme lues' })
  async markNotificationsRead(
    @Request() req,
    @Body() body: { notifIds?: number[] },
  ) {
    await this.calendarService.markNotificationsRead(req.user.id, body.notifIds);
    return { message: 'Notifications marquees comme lues' };
  }
}
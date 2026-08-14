import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Brackets,
  In,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { CalendarEvent, CalendarEventType, EventPriority, EventStatus } from './entities/calendar-event.entity';
import { EventNotification, NotifType } from './entities/event-notification.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';

export interface CalendarStats {
  totalEvents: number;
  assignedToAgents: number;
  personalTasks: number;
  completedCount: number;
  pendingCount: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  upcomingToday: CalendarEvent[];
}

const DAY_MS = 86400000;
const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(CalendarEvent)
    private readonly eventRepo: Repository<CalendarEvent>,
    @InjectRepository(EventNotification)
    private readonly notifRepo: Repository<EventNotification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async getTenantAgentIds(superviseurId: string): Promise<string[]> {
    const agents = await this.userRepo.find({
      where: { superviseurId, role: UserRole.AGENT_QUALITE },
      select: { id: true },
    });
    return agents.map((a) => a.id);
  }

  private async assertTenantEvent(
    event: CalendarEvent,
    superviseurId: string,
    agentIds: string[],
  ): Promise<void> {
    const isTenant =
      event.superviseurId === superviseurId ||
      (event.assignedToId !== null && agentIds.includes(event.assignedToId!));
    if (!isTenant) {
      throw new NotFoundException('Evenement introuvable');
    }
  }

  async getEventById(id: number, superviseurId: string): Promise<CalendarEvent> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Evenement introuvable');
    }
    const agentIds = await this.getTenantAgentIds(superviseurId);
    await this.assertTenantEvent(event, superviseurId, agentIds);
    return event;
  }

  async getEvents(
    superviseurId: string,
    query: QueryEventsDto,
  ): Promise<CalendarEvent[]> {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);
    const agentIds = await this.getTenantAgentIds(superviseurId);

    const qb = this.eventRepo
      .createQueryBuilder('e')
      .where('e.startDate <= :end', { end })
      .andWhere('e.endDate >= :start', { start })
      .andWhere(
        new Brackets((sub) => {
          sub.where('e.superviseurId = :sup', { sup: superviseurId });
          if (agentIds.length > 0) {
            sub.orWhere('e.assignedToId IN (:...agentIds)', { agentIds });
          }
        }),
      );

    if (query.type) {
      const types = query.type.split(',').filter(Boolean);
      if (types.length > 0) qb.andWhere('e.type IN (:...types)', { types });
    }
    if (query.priority) {
      const priorities = query.priority.split(',').filter(Boolean);
      if (priorities.length > 0) qb.andWhere('e.priority IN (:...priorities)', { priorities });
    }
    if (query.status) qb.andWhere('e.status = :status', { status: query.status });
    if (query.assignedToId) qb.andWhere('e.assignedToId = :aid', { aid: query.assignedToId });
    if (query.myEventsOnly) {
      qb.andWhere('e.assignedToId IS NULL').andWhere('e.superviseurId = :sup', {
        sup: superviseurId,
      });
    }

    qb.orderBy('e.startDate', 'ASC');
    return qb.getMany();
  }

  async createEvent(
    superviseurId: string,
    dto: CreateEventDto,
  ): Promise<CalendarEvent> {
    let assignedToId: string | null = null;
    let assignedToName: string | null = null;

    if (dto.assignedToId) {
      const agent = await this.userRepo.findOne({
        where: {
          id: dto.assignedToId,
          superviseurId,
          role: UserRole.AGENT_QUALITE,
        },
      });
      if (!agent) {
        throw new ForbiddenException("Cet agent n'appartient pas a votre tenant");
      }
      assignedToId = agent.id;
      assignedToName = `${agent.firstName} ${agent.lastName}`;
    }

    const event = this.eventRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      customType: dto.type === CalendarEventType.AUTRE ? (dto.customType ?? null) : null,
      priority: dto.priority ?? EventPriority.MEDIUM,
      startDate: dto.startDate,
      endDate: dto.endDate,
      allDay: dto.allDay ?? false,
      location: dto.location ?? null,
      superviseurId,
      assignedToId,
      assignedToName,
      isRecurring: dto.isRecurring ?? false,
      recurrenceRule: dto.recurrenceRule ?? null,
      reminderMinutes: dto.reminderMinutes ?? null,
      color: dto.color ?? null,
      attachmentNote: dto.attachmentNote ?? null,
    });

    const saved = await this.eventRepo.save(event);

    if (assignedToId) {
      await this.createNotification(
        saved.id,
        assignedToId,
        NotifType.ASSIGNED,
        `Nouvelle tache assignee : ${saved.title}`,
      );
    }

    if (saved.isRecurring && saved.recurrenceRule) {
      await this.createOccurrences(saved);
    }

    return saved;
  }

  async updateEvent(
    id: number,
    superviseurId: string,
    dto: UpdateEventDto,
  ): Promise<CalendarEvent> {
    const event = await this.getEventById(id, superviseurId);

    const dateOrTitleChanged =
      (dto.title !== undefined && dto.title !== event.title) ||
      (dto.startDate !== undefined && +dto.startDate !== +event.startDate) ||
      (dto.endDate !== undefined && +dto.endDate !== +event.endDate);
    const assignedChanged =
      dto.assignedToId !== undefined &&
      dto.assignedToId !== event.assignedToId;

    if (assignedChanged) {
      if (dto.assignedToId) {
        const agent = await this.userRepo.findOne({
          where: {
            id: dto.assignedToId,
            superviseurId,
            role: UserRole.AGENT_QUALITE,
          },
        });
        if (!agent) {
          throw new ForbiddenException(
            "Cet agent n'appartient pas a votre tenant",
          );
        }
        event.assignedToId = agent.id;
        event.assignedToName = `${agent.firstName} ${agent.lastName}`;
      } else {
        event.assignedToId = null;
        event.assignedToName = null;
      }
    }

    if (dto.title !== undefined) event.title = dto.title;
    if (dto.description !== undefined) event.description = dto.description ?? null;
    if (dto.type !== undefined) event.type = dto.type;
    if (dto.customType !== undefined) {
      event.customType = event.type === CalendarEventType.AUTRE ? dto.customType ?? null : null;
    }
    if (dto.priority !== undefined) event.priority = dto.priority;
    if (dto.startDate !== undefined) event.startDate = dto.startDate;
    if (dto.endDate !== undefined) event.endDate = dto.endDate;
    if (dto.allDay !== undefined) event.allDay = dto.allDay;
    if (dto.location !== undefined) event.location = dto.location ?? null;
    if (dto.isRecurring !== undefined) event.isRecurring = dto.isRecurring;
    if (dto.recurrenceRule !== undefined) event.recurrenceRule = dto.recurrenceRule ?? null;
    if (dto.reminderMinutes !== undefined) event.reminderMinutes = dto.reminderMinutes ?? null;
    if (dto.color !== undefined) event.color = dto.color ?? null;
    if (dto.attachmentNote !== undefined) event.attachmentNote = dto.attachmentNote ?? null;

    if (dto.status === EventStatus.COMPLETED && event.status !== EventStatus.COMPLETED) {
      event.status = EventStatus.COMPLETED;
      event.completedAt = new Date();
      if (dto.completedNote !== undefined) event.completedNote = dto.completedNote;
    } else if (dto.status !== undefined) {
      event.status = dto.status;
    }

    const saved = await this.eventRepo.save(event);

    if (assignedChanged && saved.assignedToId) {
      await this.createNotification(
        saved.id,
        saved.assignedToId,
        NotifType.ASSIGNED,
        `Nouvelle tache assignee : ${saved.title}`,
      );
    } else if (dateOrTitleChanged && saved.assignedToId) {
      await this.createNotification(
        saved.id,
        saved.assignedToId,
        NotifType.UPDATED,
        `Tache mise a jour : ${saved.title}`,
      );
    }

    return saved;
  }

  async deleteEvent(id: number, superviseurId: string): Promise<void> {
    const event = await this.getEventById(id, superviseurId);

    await this.eventRepo.delete({ recurrenceParentId: id });

    if (event.assignedToId) {
      await this.createNotification(
        event.id,
        event.assignedToId,
        NotifType.CANCELLED,
        `Tache annulee : ${event.title}`,
      );
    }

    await this.eventRepo.delete(id);
  }

  async completeEvent(
    id: number,
    agentId: string,
    completedNote?: string,
  ): Promise<CalendarEvent> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException('Evenement introuvable');
    }
    if (event.assignedToId !== agentId) {
      throw new ForbiddenException(
        'Vous ne pouvez completer que vos propres taches',
      );
    }

    event.status = EventStatus.COMPLETED;
    event.completedAt = new Date();
    if (completedNote !== undefined && completedNote !== null) {
      event.completedNote = completedNote;
    }
    const saved = await this.eventRepo.save(event);

    await this.createNotification(
      saved.id,
      saved.superviseurId,
      NotifType.COMPLETED,
      `Tache terminee : ${saved.title}`,
    );

    return saved;
  }

  async getMyAssignedEvents(
    agentId: string,
    startDate: string,
    endDate: string,
    status?: EventStatus,
  ): Promise<CalendarEvent[]> {
    const where: Record<string, unknown> = {
      assignedToId: agentId,
      startDate: LessThanOrEqual(new Date(endDate)),
      endDate: MoreThanOrEqual(new Date(startDate)),
    };
    if (status) where.status = status;
    return this.eventRepo.find({
      where,
      order: { startDate: 'ASC' },
    });
  }

  async getSupervisionNames(
    superviseurIds: string[],
  ): Promise<Record<string, string>> {
    if (superviseurIds.length === 0) return {};
    const users = await this.userRepo.find({
      where: { id: In(superviseurIds) },
      select: { id: true, firstName: true, lastName: true },
    });
    const map: Record<string, string> = {};
    for (const u of users) {
      map[u.id] = `${u.firstName} ${u.lastName}`;
    }
    return map;
  }

  async getNotifications(userId: string): Promise<EventNotification[]> {
    return this.notifRepo.find({
      where: { recipientId: userId },
      order: { sentAt: 'DESC' },
      take: 50,
    });
  }

  async markNotificationsRead(
    userId: string,
    notifIds?: number[],
  ): Promise<void> {
    if (notifIds && notifIds.length > 0) {
      await this.notifRepo.update(
        { recipientId: userId, id: In(notifIds) },
        { isRead: true },
      );
    } else {
      await this.notifRepo.update({ recipientId: userId }, { isRead: true });
    }
  }

  async getStats(superviseurId: string): Promise<CalendarStats> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const events = await this.getEvents(superviseurId, {
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
    });

    const totalEvents = events.length;
    const assignedToAgents = events.filter((e) => e.assignedToId !== null).length;
    const personalTasks = events.filter((e) => e.assignedToId === null).length;
    const completedCount = events.filter(
      (e) => e.status === EventStatus.COMPLETED,
    ).length;
    const pendingCount = events.filter(
      (e) =>
        e.status === EventStatus.PENDING || e.status === EventStatus.IN_PROGRESS,
    ).length;

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    for (const e of events) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      byPriority[e.priority] = (byPriority[e.priority] ?? 0) + 1;
    }

    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingToday = events
      .filter((e) => e.endDate >= now && e.startDate <= in24h)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return {
      totalEvents,
      assignedToAgents,
      personalTasks,
      completedCount,
      pendingCount,
      byType,
      byPriority,
      upcomingToday,
    };
  }

  private async createNotification(
    eventId: number,
    recipientId: string,
    type: NotifType,
    message: string,
  ): Promise<void> {
    const notif = this.notifRepo.create({ eventId, recipientId, type, message });
    await this.notifRepo.save(notif);
  }

  private async createOccurrences(parent: CalendarEvent): Promise<void> {
    const rule = parent.recurrenceRule ?? '';
    const freq = (rule.match(/FREQ=(\w+)/)?.[1] ?? 'WEEKLY').toUpperCase();
    const bydayRaw = rule.match(/BYDAY=([^;]+)/)?.[1] ?? '';
    const byday = bydayRaw
      .split(',')
      .map((d) => d.trim().toUpperCase())
      .filter((d) => DAY_MAP[d] !== undefined)
      .map((d) => DAY_MAP[d]);

    const horizon = new Date(parent.startDate.getTime() + 3 * 30 * DAY_MS);
    const delta = parent.endDate.getTime() - parent.startDate.getTime();
    const occurrences: Partial<CalendarEvent>[] = [];

    if (freq === 'DAILY') {
      let d = new Date(parent.startDate.getTime() + DAY_MS);
      let count = 0;
      while (d <= horizon && count < 90) {
        occurrences.push(this.buildOccurrence(parent, d, delta));
        d = new Date(d.getTime() + DAY_MS);
        count++;
      }
    } else if (freq === 'MONTHLY') {
      let d = new Date(parent.startDate);
      for (let m = 1; m <= 3 && occurrences.length < 90; m++) {
        d = new Date(parent.startDate.getFullYear(), parent.startDate.getMonth() + m, parent.startDate.getDate());
        if (d > horizon) break;
        occurrences.push(this.buildOccurrence(parent, d, delta));
      }
    } else {
      const weekDays = byday.length > 0 ? byday : [parent.startDate.getDay()];
      let d = new Date(parent.startDate.getTime() + DAY_MS);
      let count = 0;
      while (d <= horizon && count < 90) {
        if (
          weekDays.includes(d.getDay()) &&
          ((parent.allDay && d > parent.startDate) || true)
        ) {
          occurrences.push(this.buildOccurrence(parent, d, delta));
          count++;
        }
        d = new Date(d.getTime() + DAY_MS);
      }
    }

    for (const occ of occurrences) {
      await this.eventRepo.save(this.eventRepo.create(occ));
    }
  }

  private buildOccurrence(
    parent: CalendarEvent,
    start: Date,
    deltaMs: number,
  ): Partial<CalendarEvent> {
    return {
      title: parent.title,
      description: parent.description,
      type: parent.type,
      customType: parent.customType,
      priority: parent.priority,
      startDate: start,
      endDate: new Date(start.getTime() + deltaMs),
      allDay: parent.allDay,
      location: parent.location,
      superviseurId: parent.superviseurId,
      assignedToId: parent.assignedToId,
      assignedToName: parent.assignedToName,
      isRecurring: false,
      recurrenceRule: null,
      recurrenceParentId: parent.id,
      reminderMinutes: parent.reminderMinutes,
      color: parent.color,
      attachmentNote: parent.attachmentNote,
    };
  }
}
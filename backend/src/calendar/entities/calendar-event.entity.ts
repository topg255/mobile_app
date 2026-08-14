import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CalendarEventType {
  INSPECTION = 'inspection',
  REUNION = 'reunion',
  AUDIT = 'audit',
  FORMATION = 'formation',
  MAINTENANCE = 'maintenance',
  AUTRE = 'autre',
}

export enum EventPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum EventStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

@Entity('calendar_events')
export class CalendarEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: CalendarEventType })
  type: CalendarEventType;

  @Column({ type: 'enum', enum: EventPriority, default: EventPriority.MEDIUM })
  priority: EventPriority;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'all_day', type: 'boolean', default: false })
  allDay: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Index()
  @Column({ name: 'superviseur_id', type: 'uuid' })
  superviseurId: string;

  @Index()
  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId: string | null;

  @Column({ name: 'assigned_to_name', type: 'varchar', length: 255, nullable: true })
  assignedToName: string | null;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.PENDING })
  status: EventStatus;

  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurrence_rule', type: 'varchar', length: 255, nullable: true })
  recurrenceRule: string | null;

  @Column({ name: 'recurrence_parent_id', type: 'int', nullable: true })
  recurrenceParentId: number | null;

  @Column({ name: 'reminder_minutes', type: 'int', nullable: true })
  reminderMinutes: number | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ name: 'attachment_note', type: 'text', nullable: true })
  attachmentNote: string | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'completed_note', type: 'text', nullable: true })
  completedNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
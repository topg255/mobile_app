import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum PushCategory {
  QUALITY_CRITICAL = 'quality_critical',
  QUALITY_WARNING = 'quality_warning',
  PRODUCTION_STOP = 'production_stop',
  AI_REPORT = 'ai_report',
  OBJECTIVE_RISK = 'objective_risk',
  OBJECTIVE_COMPLETED = 'objective_completed',
  CHAT_MESSAGE = 'chat_message',
  AGENT_REGISTRATION = 'agent_registration',
  AGENT_APPROVED = 'agent_approved',
  BENCHMARK = 'benchmark',
  AI_RISK = 'ai_risk',
  CAPA = 'capa',
  SYSTEM = 'system',
}

export enum PushPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum DeliveryStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  DISMISSED = 'dismissed',
  FAILED = 'failed',
}

export enum EscalationLevel {
  NONE = 0,
  PRODUCTION_MANAGER = 1,
  QUALITY_MANAGER = 2,
  PLANT_DIRECTOR = 3,
}

@Entity('push_notification_history')
export class PushNotificationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: PushCategory })
  category: PushCategory;

  @Column({ type: 'enum', enum: PushPriority, default: PushPriority.MEDIUM })
  priority: PushPriority;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @Column({
    name: 'delivery_status',
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.SENT,
  })
  deliveryStatus: DeliveryStatus;

  @Index()
  @Column({ name: 'group_key', type: 'varchar', length: 200, nullable: true })
  groupKey: string | null;

  @Column({ name: 'group_count', type: 'int', default: 1 })
  groupCount: number;

  @Column({
    name: 'sent_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  sentAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt: Date | null;

  @Column({ name: 'clicked_at', type: 'timestamp', nullable: true })
  clickedAt: Date | null;

  @Column({ name: 'dismissed_at', type: 'timestamp', nullable: true })
  dismissedAt: Date | null;

  @Column({ name: 'escalated_at', type: 'timestamp', nullable: true })
  escalatedAt: Date | null;

  @Column({
    name: 'escalation_level',
    type: 'enum',
    enum: EscalationLevel,
    default: EscalationLevel.NONE,
  })
  escalationLevel: EscalationLevel;

  @Column({
    name: 'device_platform',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  devicePlatform: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

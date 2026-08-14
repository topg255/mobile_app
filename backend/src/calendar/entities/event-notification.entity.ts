import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum NotifType {
  ASSIGNED = 'ASSIGNED',
  REMINDER = 'REMINDER',
  UPDATED = 'UPDATED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('event_notifications')
export class EventNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'event_id', type: 'int' })
  eventId: number;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @Column({ type: 'enum', enum: NotifType })
  type: NotifType;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;

  @Column({ type: 'text' })
  message: string;
}
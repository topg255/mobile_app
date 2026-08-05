import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum NotificationType {
  MESSAGE = 'message',
  LIGNE_ADDED = 'ligne_added',
  LIGNE_UPDATED = 'ligne_updated',
  REPORT_GENERATED = 'report_generated',
  OBJECTIVE_AT_RISK = 'objective_at_risk',
  OBJECTIVE_COMPLETED = 'objective_completed',
  OBJECTIVE_FAILED = 'objective_failed',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'related_id', type: 'varchar', nullable: true })
  relatedId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

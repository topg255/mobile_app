import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('notification_analytics')
@Unique(['user', 'date'])
export class NotificationAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', default: 0 })
  sent: number;

  @Column({ type: 'int', default: 0 })
  delivered: number;

  @Column({ type: 'int', default: 0 })
  opened: number;

  @Column({ type: 'int', default: 0 })
  clicked: number;

  @Column({ type: 'int', default: 0 })
  dismissed: number;

  @Column({ type: 'int', default: 0 })
  failed: number;

  @Column({ name: 'avg_response_ms', type: 'int', default: 0 })
  avgResponseMs: number;

  @Column({ name: 'critical_response_ms', type: 'int', default: 0 })
  criticalResponseMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

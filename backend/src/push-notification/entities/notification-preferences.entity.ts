import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('notification_preferences')
export class NotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'critical_alerts', type: 'boolean', default: true })
  criticalAlerts: boolean;

  @Column({ name: 'ai_reports', type: 'boolean', default: true })
  aiReports: boolean;

  @Column({ name: 'objectives', type: 'boolean', default: true })
  objectives: boolean;

  @Column({ name: 'messages', type: 'boolean', default: true })
  messages: boolean;

  @Column({ name: 'benchmark_alerts', type: 'boolean', default: true })
  benchmarkAlerts: boolean;

  @Column({ name: 'weekly_reports', type: 'boolean', default: true })
  weeklyReports: boolean;

  @Column({ name: 'system_notifications', type: 'boolean', default: true })
  systemNotifications: boolean;

  @Column({ name: 'capa_alerts', type: 'boolean', default: true })
  capaAlerts: boolean;

  @Column({ name: 'sound_enabled', type: 'boolean', default: true })
  soundEnabled: boolean;

  @Column({ name: 'vibration_enabled', type: 'boolean', default: true })
  vibrationEnabled: boolean;

  @Column({ name: 'dnd_enabled', type: 'boolean', default: false })
  dndEnabled: boolean;

  @Column({ name: 'dnd_start', type: 'varchar', length: 5, default: '22:00' })
  dndStart: string;

  @Column({ name: 'dnd_end', type: 'varchar', length: 5, default: '07:00' })
  dndEnd: string;

  @Column({ name: 'last_benchmark_rank', type: 'int', nullable: true })
  lastBenchmarkRank: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum ReportStatus {
  GENERATED = 'generated',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('daily_reports')
export class DailyReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'superviseur_id' })
  superviseur: User;

  @Column({ name: 'report_date', type: 'date' })
  reportDate: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'jsonb' })
  kpis: {
    totalLignes: number;
    vertCount: number;
    jauneCount: number;
    rougeCount: number;
    vertPercent: number;
    jaunePercent: number;
    rougePercent: number;
    totalMinutes: number;
    agentsActifs: number;
    topAgent: string;
    criticalLignes: { nom: string; agent: string; delais: string }[];
    hourlyBreakdown: { heure: string; count: number }[];
  };

  @Column({ type: 'text', nullable: true })
  aiAnalysis: string;

  @Column({ type: 'text', nullable: true })
  recommendations: string;

  @Column({ type: 'varchar', length: 20, default: ReportStatus.GENERATED })
  status: ReportStatus;

  @Column({ name: 'email_sent_at', type: 'timestamp', nullable: true })
  emailSentAt: Date | null;

  @Column({ name: 'email_recipient', type: 'varchar', length: 255, nullable: true })
  emailRecipient: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

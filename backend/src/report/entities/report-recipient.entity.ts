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

@Entity('report_recipients')
@Unique('UQ_report_recipients_superviseur_email', ['superviseurId', 'email'])
export class ReportRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'superviseur_id', type: 'uuid' })
  superviseurId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'superviseur_id' })
  superviseur: User;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

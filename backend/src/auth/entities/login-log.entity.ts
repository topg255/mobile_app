import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum LoginAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
}

@Entity('login_logs')
export class LoginLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: LoginAction })
  action: LoginAction;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true, length: 45 })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'logged_at' })
  loggedAt: Date;
}

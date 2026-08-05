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
import { QualityObjective } from './quality-objective.entity';

export enum BadgeCode {
  GOAL_ACHIEVED = 'goal_achieved',
  THREE_MONTHS_SUCCESS = 'three_months_success',
  BEST_PERFORMANCE = 'best_performance',
  FAST_RECOVERY = 'fast_recovery',
  QUALITY_CHAMPION = 'quality_champion',
}

@Entity('objective_badges')
@Unique(['user', 'code'])
export class ObjectiveBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: BadgeCode })
  code: BadgeCode;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 300 })
  description: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => QualityObjective, { nullable: true, eager: false })
  @JoinColumn({ name: 'objective_id' })
  objective: QualityObjective | null;

  @CreateDateColumn({ name: 'unlocked_at' })
  unlockedAt: Date;
}

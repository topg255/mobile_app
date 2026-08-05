import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { QualityObjective } from './quality-objective.entity';

@Entity('objective_history')
@Unique(['objective', 'recordedAt'])
export class ObjectiveHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => QualityObjective, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'objective_id' })
  objective: QualityObjective;

  @Column({ type: 'float' })
  value: number;

  @Column({ type: 'float' })
  progress: number;

  @Column({ type: 'float', nullable: true })
  probability: number | null;

  @Index()
  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;
}

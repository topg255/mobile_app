import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum ObjectiveCategory {
  COMPLIANCE = 'compliance',
  CRITICAL_INCIDENTS = 'critical_incidents',
  DOWNTIME = 'downtime',
  RESOLUTION_TIME = 'resolution_time',
  INSPECTIONS = 'inspections',
  PRODUCTIVITY = 'productivity',
  PHOTOS = 'photos',
  TRAINING = 'training',
  CUSTOM = 'custom',
}

export enum ObjectiveStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  AT_RISK = 'at_risk',
}

export enum ObjectivePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('quality_objectives')
export class QualityObjective {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ObjectiveCategory })
  category: ObjectiveCategory;

  @Column({ name: 'target_value', type: 'float' })
  targetValue: number;

  @Column({ name: 'current_value', type: 'float', default: 0 })
  currentValue: number;

  @Column({ type: 'varchar', length: 50, default: '' })
  unit: string;

  @Column({ name: 'higher_is_better', type: 'boolean', default: true })
  higherIsBetter: boolean;

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({
    type: 'enum',
    enum: ObjectiveStatus,
    default: ObjectiveStatus.ACTIVE,
  })
  status: ObjectiveStatus;

  @Column({
    type: 'enum',
    enum: ObjectivePriority,
    default: ObjectivePriority.MEDIUM,
  })
  priority: ObjectivePriority;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'prediction_probability', type: 'float', nullable: true })
  predictionProbability: number | null;

  @Column({ name: 'predicted_value', type: 'float', nullable: true })
  predictedValue: number | null;

  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.LOW,
  })
  riskLevel: RiskLevel;

  @Column({
    name: 'last_risk_level',
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.LOW,
  })
  lastRiskLevel: RiskLevel;

  @Column({ type: 'text', nullable: true })
  recommendation: string | null;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

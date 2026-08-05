import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('push_system_config')
export class PushSystemConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'critical_escalation_min', type: 'int', default: 10 })
  criticalEscalationMin: number;

  @Column({ name: 'high_escalation_min', type: 'int', default: 20 })
  highEscalationMin: number;

  @Column({ name: 'medium_escalation_min', type: 'int', default: 30 })
  mediumEscalationMin: number;

  @Column({ name: 'grouping_window_min', type: 'int', default: 10 })
  groupingWindowMin: number;

  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled: boolean;
}

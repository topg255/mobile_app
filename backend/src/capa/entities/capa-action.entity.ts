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
import { Capa } from './capa.entity';

export enum ActionType {
  CORRECTIVE = 'corrective',
  PREVENTIVE = 'preventive',
}

export enum ActionStatus {
  A_FAIRE = 'a_faire',
  EN_COURS = 'en_cours',
  TERMINEE = 'terminee',
  BLOQUEE = 'bloquee',
}

@Entity('capa_action')
export class CapaAction {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'capa_id', type: 'int' })
  capaId: number;

  @ManyToOne(() => Capa, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'capa_id' })
  capa: Capa;

  @Column({ type: 'varchar', length: 255 })
  titre: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ActionType, default: ActionType.CORRECTIVE })
  type: ActionType;

  @Column({ name: 'responsable_id', type: 'varchar', length: 36 })
  responsableId: string;

  @Column({ name: 'responsable_name', type: 'varchar', length: 200 })
  responsableName: string;

  @Column({ name: 'date_echeance', type: 'timestamp' })
  dateEcheance: Date;

  @Column({ type: 'enum', enum: ActionStatus, default: ActionStatus.A_FAIRE })
  status: ActionStatus;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  preuve: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
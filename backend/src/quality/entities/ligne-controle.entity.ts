import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ControleDate } from './controle-date.entity';

export enum NoteQualite {
  VERT = 'vert',
  JAUNE = 'jaune',
  ROUGE = 'rouge',
}

@Entity('lignes_controle')
export class LigneControle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NoteQualite })
  note: NoteQualite;

  @Column({ type: 'varchar', length: 50 })
  delais: string;

  @Column({ type: 'varchar', length: 255 })
  nomLigne: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  heure: string;

  @Column({ type: 'varchar', length: 255 })
  responsable: string;

  @Column({ type: 'text' })
  details: string;

  @ManyToOne(() => ControleDate, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'controle_date_id' })
  controleDate: ControleDate;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

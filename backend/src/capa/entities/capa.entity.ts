import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CapaStatus {
  OUVERT = 'ouvert',
  EN_ANALYSE = 'en_analyse',
  EN_COURS = 'en_cours',
  EN_VERIFICATION = 'en_verification',
  CLOTURE = 'cloture',
  ANNULE = 'annule',
}

export enum CapaPriority {
  FAIBLE = 'faible',
  MOYENNE = 'moyenne',
  HAUTE = 'haute',
  CRITIQUE = 'critique',
}

export enum CapaType {
  CORRECTIVE = 'corrective',
  PREVENTIVE = 'preventive',
  LES_DEUX = 'les_deux',
}

@Entity('capa')
export class Capa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 30 })
  reference: string;

  @Index()
  @Column({ name: 'ligne_controle_id', type: 'varchar', length: 36, nullable: true })
  ligneControleId: string | null;

  @Column({ name: 'nom_ligne', type: 'varchar', length: 255 })
  nomLigne: string;

  @Index()
  @Column({ name: 'superviseur_id', type: 'varchar', length: 36 })
  superviseurId: string;

  @Column({ name: 'superviseur_name', type: 'varchar', length: 200 })
  superviseurName: string;

  @Column({ type: 'varchar', length: 255 })
  titre: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: CapaStatus, default: CapaStatus.OUVERT })
  status: CapaStatus;

  @Column({ type: 'enum', enum: CapaPriority, default: CapaPriority.MOYENNE })
  priority: CapaPriority;

  @Column({ type: 'enum', enum: CapaType, default: CapaType.CORRECTIVE })
  type: CapaType;

  @Column({ name: 'cause_racine', type: 'text', nullable: true })
  causeRacine: string | null;

  @Column({ name: 'cause_racine_ia', type: 'text', nullable: true })
  causeRacineIA: string | null;

  @Column({ name: 'date_echeance', type: 'timestamp' })
  dateEcheance: Date;

  @Column({ name: 'date_ouverture', type: 'timestamp', default: () => 'NOW()' })
  dateOuverture: Date;

  @Column({ name: 'date_cloture', type: 'timestamp', nullable: true })
  dateCloture: Date | null;

  @Column({ name: 'efficacite_verifiee', type: 'boolean', default: false })
  efficaciteVerifiee: boolean;

  @Column({ name: 'note_efficacite', type: 'text', nullable: true })
  noteEfficacite: string | null;

  @Column({ name: 'cout_estime', type: 'decimal', precision: 12, scale: 2, nullable: true })
  coutEstime: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
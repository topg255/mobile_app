import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum NoteCalculee {
  VERT = 'vert',
  ORANGE = 'orange',
  ROUGE = 'rouge',
}

@Entity('audit5s')
export class Audit5S {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'ligne_controle_id', type: 'varchar', length: 36 })
  ligneControleId: string;

  @Column({ name: 'nom_ligne', type: 'varchar', length: 255 })
  nomLigne: string;

  @Index()
  @Column({ name: 'agent_id', type: 'varchar', length: 36 })
  agentId: string;

  @Column({ name: 'agent_name', type: 'varchar', length: 200 })
  agentName: string;

  @Index()
  @Column({ name: 'superviseur_id', type: 'varchar', length: 36 })
  superviseurId: string;

  @Column({ name: 'score_global', type: 'int' })
  scoreGlobal: number;

  @Column({ name: 'note_calculee', type: 'enum', enum: NoteCalculee })
  noteCalculee: NoteCalculee;

  @Column({ name: 'score_s1', type: 'int' })
  scoreS1: number;

  @Column({ name: 'score_s2', type: 'int' })
  scoreS2: number;

  @Column({ name: 'score_s3', type: 'int' })
  scoreS3: number;

  @Column({ name: 'score_s4', type: 'int' })
  scoreS4: number;

  @Column({ name: 'score_s5', type: 'int' })
  scoreS5: number;

  @Column({ name: 'reponses_json', type: 'text' })
  reponsesJson: string;

  @Column({ name: 'analyse_ia', type: 'text', nullable: true })
  analyseIA: string | null;

  @Column({ name: 'pilier_plus_faible', type: 'varchar', length: 100, nullable: true })
  pilierPlusFaible: string | null;

  @Column({ name: 'capa_declenche', type: 'boolean', default: false })
  capaDeclenche: boolean;

  @Column({ name: 'capa_id', type: 'int', nullable: true })
  capaId: number | null;

  @Column({ name: 'duree_remplissage_secondes', type: 'int', nullable: true })
  dureeRemplissageSecondes: number | null;

  @Column({ name: 'commentaire_agent', type: 'text', nullable: true })
  commentaireAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum CommentaireType {
  COMMENTAIRE = 'commentaire',
  CHANGEMENT_STATUT = 'changement_statut',
  ACTION_AJOUTEE = 'action_ajoutee',
  VERIFICATION = 'verification',
}

@Entity('capa_commentaire')
export class CapaCommentaire {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'capa_id', type: 'int' })
  capaId: number;

  @Column({ name: 'auteur_id', type: 'varchar', length: 36 })
  auteurId: string;

  @Column({ name: 'auteur_name', type: 'varchar', length: 200 })
  auteurName: string;

  @Column({ type: 'text' })
  contenu: string;

  @Column({ type: 'enum', enum: CommentaireType, default: CommentaireType.COMMENTAIRE })
  type: CommentaireType;

  @Column({ name: 'ancien_statut', type: 'varchar', length: 30, nullable: true })
  ancienStatut: string | null;

  @Column({ name: 'nouveau_statut', type: 'varchar', length: 30, nullable: true })
  nouveauStatut: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
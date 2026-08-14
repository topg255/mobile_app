import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SignatureProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('superviseur_signature')
export class SuperviseurSignature {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'superviseur_id', type: 'uuid' })
  superviseurId: string;

  @Column({ name: 'original_image_base64', type: 'text' })
  originalImageBase64: string;

  @Column({ name: 'enhanced_image_base64', type: 'text', nullable: true })
  enhancedImageBase64: string | null;

  @Column({ name: 'svg_path', type: 'text', nullable: true })
  svgPath: string | null;

  @Column({ type: 'int', default: 520 })
  width: number;

  @Column({ type: 'int', default: 180 })
  height: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true })
  quality: number | null;

  @Column({ type: 'text', nullable: true })
  improvements: string | null;

  @Column({
    name: 'processing_status',
    type: 'varchar',
    length: 20,
    default: SignatureProcessingStatus.PENDING,
  })
  processingStatus: SignatureProcessingStatus;

  @Column({ name: 'processing_error', type: 'text', nullable: true })
  processingError: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
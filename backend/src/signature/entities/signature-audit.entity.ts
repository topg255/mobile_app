import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SignatureAction {
  SIGN = 'SIGN',
  VERIFY = 'VERIFY',
  REVOKE = 'REVOKE',
}

@Entity('signature_audit')
export class SignatureAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'report_id', type: 'uuid' })
  reportId: string;

  @Column({ name: 'superviseur_id', type: 'uuid' })
  superviseurId: string;

  @Column({ name: 'signer_name', length: 255 })
  signerName: string;

  @Column({ name: 'pdf_hash_original', type: 'varchar', length: 64 })
  pdfHashOriginal: string;

  @Column({ name: 'pdf_hash_signed', type: 'varchar', length: 64 })
  pdfHashSigned: string;

  @Column({ type: 'text' })
  signature: string;

  @Column({ name: 'timestamp_token', type: 'text' })
  timestampToken: string;

  @Column({ name: 'certificate_thumbprint', type: 'varchar', length: 128 })
  certificateThumbprint: string;

  @Column({ name: 'signed_at', type: 'timestamp' })
  signedAt: Date;

  @Column({ type: 'varchar', length: 20, default: SignatureAction.SIGN })
  action: SignatureAction;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

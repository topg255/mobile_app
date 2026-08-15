import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum Pilier5S {
  S1 = 's1',
  S2 = 's2',
  S3 = 's3',
  S4 = 's4',
  S5 = 's5',
}

@Entity('critere5s')
export class Critere5S {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @Column({ type: 'enum', enum: Pilier5S })
  pilier: Pilier5S;

  @Column({ type: 'varchar', length: 500 })
  label: string;

  @Column({ type: 'int' })
  points: number;

  @Column({ type: 'int' })
  ordre: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

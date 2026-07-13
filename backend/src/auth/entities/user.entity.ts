import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  SUPERVISEUR_QUALITE = 'superviseur_qualite',
  AGENT_QUALITE = 'agent_qualite',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ unique: true, length: 50 })
  matricule: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'is_approved', type: 'boolean', default: false })
  isApproved: boolean;

  @Column({ name: 'reset_token', type: 'varchar', nullable: true, length: 255 })
  resetToken: string | null;

  @Column({ name: 'reset_token_expires', type: 'timestamp', nullable: true })
  resetTokenExpires: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

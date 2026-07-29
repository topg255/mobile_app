import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ImageFolder } from './image-folder.entity';

@Entity('library_images')
export class LibraryImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column()
  filename: string;

  @Column({ name: 'original_name', nullable: true })
  originalName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number;

  @Column({ name: 'width', type: 'int', nullable: true })
  width: number;

  @Column({ name: 'height', type: 'int', nullable: true })
  height: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @ManyToOne(() => ImageFolder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'folder_id' })
  folder: ImageFolder | null;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

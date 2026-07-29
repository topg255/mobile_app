import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LibraryImage } from './entities/library-image.entity';
import { ImageFolder } from './entities/image-folder.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { UpdateImageDto, MoveImagesDto } from './dto/library.dto';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(LibraryImage) private readonly imageRepo: Repository<LibraryImage>,
    @InjectRepository(ImageFolder) private readonly folderRepo: Repository<ImageFolder>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async uploadImage(file: Express.Multer.File, user: User, description?: string) {
    const image = this.imageRepo.create({
      url: `/uploads/library/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      description: description || undefined,
      uploadedBy: user,
      folder: undefined,
    });
    return this.imageRepo.save(image);
  }

  async getImages(user: User, folderId?: string | null) {
    const where: any = { isDeleted: false };

    if (user.role === UserRole.AGENT_QUALITE) {
      where.uploadedBy = { id: user.id };
    }

    if (folderId === 'null' || folderId === '') {
      where.folder = null;
    } else if (folderId) {
      where.folder = { id: folderId };
    }

    return this.imageRepo.find({
      where,
      relations: { uploadedBy: true, folder: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getTrash(user: User) {
    const where: any = { isDeleted: true };
    if (user.role === UserRole.AGENT_QUALITE) {
      where.uploadedBy = { id: user.id };
    }
    return this.imageRepo.find({
      where,
      relations: { uploadedBy: true, folder: true },
      order: { deletedAt: 'DESC' },
    });
  }

  async updateImage(id: string, dto: UpdateImageDto, user: User) {
    const image = await this.imageRepo.findOne({ where: { id }, relations: { uploadedBy: true, folder: true } });
    if (!image) throw new NotFoundException('Image non trouvée');
    if (user.role === UserRole.AGENT_QUALITE && image.uploadedBy.id !== user.id) {
      throw new ForbiddenException('Non autorisé');
    }
    if (dto.description !== undefined) image.description = dto.description;
    if (dto.folderId !== undefined) {
      image.folder = dto.folderId ? ({ id: dto.folderId } as any) : null;
    }
    return this.imageRepo.save(image);
  }

  async softDelete(id: string, user: User) {
    const image = await this.imageRepo.findOne({ where: { id }, relations: { uploadedBy: true } });
    if (!image) throw new NotFoundException('Image non trouvée');
    if (user.role === UserRole.AGENT_QUALITE && image.uploadedBy.id !== user.id) {
      throw new ForbiddenException('Non autorisé');
    }
    image.isDeleted = true;
    image.deletedAt = new Date();
    return this.imageRepo.save(image);
  }

  async restore(id: string, user: User) {
    const image = await this.imageRepo.findOne({ where: { id }, relations: { uploadedBy: true } });
    if (!image) throw new NotFoundException('Image non trouvée');
    if (user.role === UserRole.AGENT_QUALITE && image.uploadedBy.id !== user.id) {
      throw new ForbiddenException('Non autorisé');
    }
    image.isDeleted = false;
    image.deletedAt = null;
    return this.imageRepo.save(image);
  }

  async permanentDelete(id: string, user: User) {
    const image = await this.imageRepo.findOne({ where: { id }, relations: { uploadedBy: true } });
    if (!image) throw new NotFoundException('Image non trouvée');
    if (user.role === UserRole.AGENT_QUALITE && image.uploadedBy.id !== user.id) {
      throw new ForbiddenException('Non autorisé');
    }
    try {
      await unlink(join(process.cwd(), 'uploads', 'library', image.filename));
    } catch {}
    await this.imageRepo.remove(image);
    return { message: 'Image supprimée définitivement' };
  }

  async moveImages(dto: MoveImagesDto, user: User) {
    const where: any = { id: In(dto.imageIds) };
    if (user.role === UserRole.AGENT_QUALITE) {
      where.uploadedBy = { id: user.id };
    }
    const images = await this.imageRepo.find({ where });
    const folder = dto.folderId ? await this.folderRepo.findOne({ where: { id: dto.folderId } }) : null;
    for (const img of images) {
      img.folder = folder || null;
    }
    await this.imageRepo.save(images);
    return { message: `${images.length} image(s) déplacée(s)` };
  }

  async createFolder(name: string, user: User) {
    const existing = await this.folderRepo.findOne({ where: { name, createdBy: { id: user.id } } });
    if (existing) return existing;
    const folder = this.folderRepo.create({ name, createdBy: user });
    return this.folderRepo.save(folder);
  }

  async getFolders(user: User) {
    return this.folderRepo.find({
      where: { createdBy: { id: user.id } },
      order: { name: 'ASC' },
    });
  }

  async deleteFolder(id: string, user: User) {
    const folder = await this.folderRepo.findOne({ where: { id }, relations: { createdBy: true } });
    if (!folder) throw new NotFoundException('Dossier non trouvé');
    if (folder.createdBy.id !== user.id) throw new ForbiddenException('Non autorisé');

    await this.imageRepo.update({ folder: { id } }, { folder: null });
    await this.folderRepo.remove(folder);
    return { message: 'Dossier supprimé' };
  }

  async renameFolder(id: string, name: string, user: User) {
    const folder = await this.folderRepo.findOne({ where: { id }, relations: { createdBy: true } });
    if (!folder) throw new NotFoundException('Dossier non trouvé');
    if (folder.createdBy.id !== user.id) throw new ForbiddenException('Non autorisé');
    folder.name = name;
    return this.folderRepo.save(folder);
  }

  async getStats(user: User) {
    const where: any = { isDeleted: false };
    if (user.role === UserRole.AGENT_QUALITE) {
      where.uploadedBy = { id: user.id };
    }
    const total = await this.imageRepo.count({ where });
    const trashCount = await this.imageRepo.count({
      where: { isDeleted: true, ...(user.role === UserRole.AGENT_QUALITE ? { uploadedBy: { id: user.id } } : {}) },
    });
    const folderCount = await this.folderRepo.count({
      where: { createdBy: { id: user.id } },
    });
    return { total, trashCount, folderCount };
  }

  async saveLigneImage(file: Express.Multer.File, user: User, ligneNom: string, description?: string) {
    let folder = await this.folderRepo.findOne({ where: { name: ligneNom, createdBy: { id: user.id } } });
    if (!folder) {
      folder = this.folderRepo.create({ name: ligneNom, createdBy: user });
      await this.folderRepo.save(folder);
    }

    const image = this.imageRepo.create({
      url: `/uploads/library/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      description: description || `Image ligne ${ligneNom}`,
      uploadedBy: user,
      folder,
    });
    return this.imageRepo.save(image);
  }
}

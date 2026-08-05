import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ControleDate } from './entities/controle-date.entity';
import { LigneControle, NoteQualite } from './entities/ligne-controle.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { CreateControleDateDto } from './dto/create-controle-date.dto';
import { CreateLigneControleDto } from './dto/create-ligne-controle.dto';
import { RapportDto } from './dto/rapport.dto';
import { unlink, copyFile } from 'fs/promises';
import { join } from 'path';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';
import { LibraryService } from '../library/library.service';
import { PushNotifierService } from '../push-notification/push-notifier.service';

@Injectable()
export class QualityService {
  constructor(
    @InjectRepository(ControleDate)
    private readonly controleDateRepo: Repository<ControleDate>,
    @InjectRepository(LigneControle)
    private readonly ligneControleRepo: Repository<LigneControle>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationService: NotificationService,
    private readonly libraryService: LibraryService,
    private readonly pushNotifier: PushNotifierService,
  ) {}

  async createControleDate(dto: CreateControleDateDto, user: User) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requestedDate = new Date(dto.dateControle);
    requestedDate.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      throw new BadRequestException(
        "Vous ne pouvez pas ajouter une date passee. Seules les dates d'aujourd'hui ou futures sont acceptees.",
      );
    }

    const existing = await this.controleDateRepo.findOne({
      where: { dateControle: dto.dateControle },
    });

    if (existing) {
      throw new BadRequestException(
        `La date de controle ${dto.dateControle} existe deja.`,
      );
    }

    const controleDate = this.controleDateRepo.create({
      dateControle: dto.dateControle,
      isActive: true,
      createdBy: user,
    });

    await this.controleDateRepo.save(controleDate);

    return {
      message: 'Date de controle creee avec succes',
      controleDate,
    };
  }

  async getAllControleDates() {
    return this.controleDateRepo.find({
      order: { dateControle: 'DESC' },
      relations: { createdBy: true },
    });
  }

  async createLigneControle(dto: CreateLigneControleDto, user: User) {
    const controleDate = await this.controleDateRepo.findOne({
      where: { id: dto.controleDateId },
    });

    if (!controleDate) {
      throw new NotFoundException('Date de controle non trouvee');
    }

    const ligne = this.ligneControleRepo.create({
      nomLigne: dto.nomLigne,
      heure: dto.heure,
      note: dto.note,
      delais: dto.delais,
      responsable: dto.responsable,
      details: dto.details,
      controleDate,
      agent: user,
    });

    await this.ligneControleRepo.save(ligne);

    // Notify only the agent's superviseur
    if (user.superviseurId) {
      const superviseur = await this.userRepo.findOne({
        where: { id: user.superviseurId },
      });
      if (superviseur && superviseur.isApproved) {
        await this.notificationService.create(
          superviseur.id,
          NotificationType.LIGNE_ADDED,
          `${user.firstName} ${user.lastName} a ajoute la ligne "${ligne.nomLigne}"`,
          ligne.id,
        );
        await this.pushNotifier.notifyQualityIncident(
          superviseur.id,
          ligne,
          user,
        );
      }
    }

    return {
      message: 'Ligne de controle ajoutee avec succes',
      ligne,
    };
  }

  async updateLigneControle(
    id: string,
    dto: Partial<CreateLigneControleDto>,
    user: User,
  ) {
    const ligne = await this.ligneControleRepo.findOne({
      where: { id },
      relations: { agent: true },
    });

    if (!ligne) {
      throw new NotFoundException('Ligne de controle non trouvee');
    }

    if (ligne.agent.id !== user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres lignes',
      );
    }

    if (dto.nomLigne !== undefined) ligne.nomLigne = dto.nomLigne;
    if (dto.heure !== undefined) ligne.heure = dto.heure;
    if (dto.note !== undefined) ligne.note = dto.note;
    if (dto.delais !== undefined) ligne.delais = dto.delais;
    if (dto.responsable !== undefined) ligne.responsable = dto.responsable;
    if (dto.details !== undefined) ligne.details = dto.details;

    await this.ligneControleRepo.save(ligne);

    // Notify only the agent's superviseur
    if (user.superviseurId) {
      const superviseur = await this.userRepo.findOne({
        where: { id: user.superviseurId },
      });
      if (superviseur && superviseur.isApproved) {
        await this.notificationService.create(
          superviseur.id,
          NotificationType.LIGNE_UPDATED,
          `${user.firstName} ${user.lastName} a modifie la ligne "${ligne.nomLigne}"`,
          ligne.id,
        );
        await this.pushNotifier.notifyQualityIncident(
          superviseur.id,
          ligne,
          user,
        );
      }
    }

    return {
      message: 'Ligne modifiee avec succes',
      ligne,
    };
  }

  async deleteLigneControle(id: string, user: User) {
    const ligne = await this.ligneControleRepo.findOne({
      where: { id },
      relations: { agent: true },
    });
    if (!ligne) throw new NotFoundException('Ligne de controle non trouvee');
    if (user.role === UserRole.AGENT_QUALITE && ligne.agent.id !== user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres lignes',
      );
    }
    if (user.role === UserRole.SUPERVISEUR_QUALITE) {
      // Superviseur can only delete lines from their own agents
      const agent = await this.userRepo.findOne({
        where: { id: ligne.agent.id },
      });
      if (!agent || agent.superviseurId !== user.id) {
        throw new ForbiddenException(
          'Vous ne pouvez supprimer que les lignes de vos agents',
        );
      }
    }
    if (ligne.image) {
      const filename = ligne.image.split('/').pop();
      if (filename) {
        const oldPath = join(process.cwd(), 'uploads', filename);
        try {
          await unlink(oldPath);
        } catch {}
      }
    }
    await this.ligneControleRepo.remove(ligne);
    return { message: 'Ligne supprimee avec succes' };
  }

  async deleteControleDate(id: string) {
    const date = await this.controleDateRepo.findOne({ where: { id } });
    if (!date) throw new NotFoundException('Date de controle non trouvee');
    const lignes = await this.ligneControleRepo.find({
      where: { controleDate: { id } },
    });
    for (const l of lignes) {
      if (l.image) {
        const filename = l.image.split('/').pop();
        if (filename) {
          try {
            await unlink(join(process.cwd(), 'uploads', filename));
          } catch {}
        }
      }
    }
    if (lignes.length > 0) await this.ligneControleRepo.remove(lignes);
    await this.controleDateRepo.remove(date);
    return { message: 'Date de controle supprimee avec succes' };
  }

  async uploadLigneImage(id: string, file: Express.Multer.File, user: User) {
    const ligne = await this.ligneControleRepo.findOne({
      where: { id },
      relations: { agent: true },
    });

    if (!ligne) {
      throw new NotFoundException('Ligne de controle non trouvee');
    }

    if (user.role === UserRole.AGENT_QUALITE && ligne.agent.id !== user.id) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres lignes',
      );
    }

    if (!file) {
      throw new BadRequestException('Aucun fichier uploade');
    }

    if (ligne.image) {
      const filename = ligne.image.split('/').pop();
      if (filename) {
        const oldPath = join(process.cwd(), 'uploads', filename);
        try {
          await unlink(oldPath);
        } catch {}
      }
    }

    ligne.image = `/uploads/${file.filename}`;
    await this.ligneControleRepo.save(ligne);

    const libraryUser = ligne.agent;
    const libraryDest = join(
      process.cwd(),
      'uploads',
      'library',
      file.filename,
    );
    try {
      await copyFile(
        join(process.cwd(), 'uploads', file.filename),
        libraryDest,
      );
      await this.libraryService.saveLigneImage(
        {
          ...file,
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        libraryUser,
        ligne.nomLigne,
        `Image ligne "${ligne.nomLigne}"`,
      );
    } catch (e) {
      console.error('Library save error:', e);
    }

    return {
      message: 'Image uploadée avec succes',
      ligne,
    };
  }

  async getMesLignes(user: User) {
    return this.ligneControleRepo.find({
      where: { agent: { id: user.id } },
      order: { createdAt: 'DESC' },
      relations: { controleDate: true, agent: true },
    });
  }

  async getLignesAgent(agentId: string, requestor: User) {
    if (requestor.role !== UserRole.SUPERVISEUR_QUALITE) {
      throw new ForbiddenException(
        "Seuls les superviseurs qualite peuvent consulter les lignes d'un agent.",
      );
    }

    const agent = await this.userRepo.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException('Agent qualite non trouve');
    }

    if (agent.superviseurId !== requestor.id) {
      throw new ForbiddenException("Cet agent n'appartient pas a votre equipe");
    }

    return this.ligneControleRepo.find({
      where: { agent: { id: agentId } },
      order: { createdAt: 'DESC' },
      relations: { controleDate: true, agent: true },
    });
  }

  async getAllLignes(requestor: User) {
    if (requestor.role !== UserRole.SUPERVISEUR_QUALITE) {
      throw new ForbiddenException(
        'Seuls les superviseurs qualite peuvent consulter toutes les lignes.',
      );
    }

    // Include lines from agents belonging to this superviseur AND the superviseur's own lines
    const agents = await this.userRepo.find({
      where: { superviseurId: requestor.id, role: UserRole.AGENT_QUALITE },
    });
    const agentIds = agents.map((a) => a.id);
    agentIds.push(requestor.id); // Also include superviseur's own lines

    return this.ligneControleRepo.find({
      where: { agent: { id: In(agentIds) } },
      order: { createdAt: 'DESC' },
      relations: { controleDate: true, agent: true },
    });
  }

  async getHistoriqueAgents(requestor: User) {
    if (requestor.role !== UserRole.SUPERVISEUR_QUALITE) {
      throw new ForbiddenException(
        "Seuls les superviseurs qualite peuvent voir l'historique des agents.",
      );
    }

    // Include agents belonging to this superviseur AND the superviseur themselves
    const agents = await this.userRepo.find({
      where: { superviseurId: requestor.id, role: UserRole.AGENT_QUALITE },
    });

    const allUsers = [...agents, requestor]; // Include superviseur's own history

    const historique = await Promise.all(
      allUsers.map(async (agent) => {
        const lignes = await this.ligneControleRepo.find({
          where: { agent: { id: agent.id } },
          order: { createdAt: 'DESC' },
          relations: { controleDate: true },
        });
        return {
          agent: {
            id: agent.id,
            firstName: agent.firstName,
            lastName: agent.lastName,
            matricule: agent.matricule,
            profileImage: agent.profileImage,
          },
          totalLignes: lignes.length,
          lignes,
        };
      }),
    );

    return historique;
  }

  async getRapport(dto: RapportDto, user: User) {
    const debutDate = new Date(dto.debutDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    if (debutDate > endDate) {
      throw new BadRequestException(
        'La date de debut doit etre anterieure a la date de fin.',
      );
    }

    const controleDates = await this.controleDateRepo.find({
      where: {
        dateControle: In(this.getDatesBetween(dto.debutDate, dto.endDate)),
      },
    });

    if (controleDates.length === 0) {
      return {
        message: 'Aucune date de controle trouvee pour cette periode',
        rapport: {
          periode: { debut: dto.debutDate, fin: dto.endDate },
          totalLignes: 0,
          repartition: { vert: 0, jaune: 0, rouge: 0 },
          repartitionPourcentage: { vert: 0, jaune: 0, rouge: 0 },
          minutesArretCumulees: 0,
          details: [],
        },
      };
    }

    const controleDateIds = controleDates.map((cd) => cd.id);

    const whereCondition: any = {
      controleDate: { id: In(controleDateIds) },
    };

    if (user.role === UserRole.AGENT_QUALITE) {
      whereCondition.agent = { id: user.id };
    } else if (user.role === UserRole.SUPERVISEUR_QUALITE) {
      // Scope to superviseur's agents AND the superviseur's own lines
      const agents = await this.userRepo.find({
        where: { superviseurId: user.id, role: UserRole.AGENT_QUALITE },
      });
      const agentIds = agents.map((a) => a.id);
      agentIds.push(user.id); // Also include superviseur's own lines

      if (dto.agentId) {
        // Verify the requested agent belongs to this superviseur (or is the superviseur themselves)
        if (!agentIds.includes(dto.agentId)) {
          throw new ForbiddenException(
            "Cet agent n'appartient pas a votre equipe",
          );
        }
        whereCondition.agent = { id: dto.agentId };
      } else {
        whereCondition.agent = { id: In(agentIds) };
      }
    }

    const lignes = await this.ligneControleRepo.find({
      where: whereCondition,
      relations: { controleDate: true, agent: true },
    });

    const totalLignes = lignes.length;

    if (totalLignes === 0) {
      return {
        message: 'Aucune ligne de controle trouvee pour cette periode',
        rapport: {
          periode: { debut: dto.debutDate, fin: dto.endDate },
          totalLignes: 0,
          repartition: { vert: 0, jaune: 0, rouge: 0 },
          repartitionPourcentage: { vert: 0, jaune: 0, rouge: 0 },
          minutesArretCumulees: 0,
          details: [],
        },
      };
    }

    const vertCount = lignes.filter((l) => l.note === NoteQualite.VERT).length;
    const jauneCount = lignes.filter(
      (l) => l.note === NoteQualite.JAUNE,
    ).length;
    const rougeCount = lignes.filter(
      (l) => l.note === NoteQualite.ROUGE,
    ).length;

    let totalMinutesArret = 0;
    lignes.forEach((l) => {
      const minutes = parseInt(l.delais, 10);
      if (!isNaN(minutes)) {
        totalMinutesArret += minutes;
      }
    });

    const rapport = {
      periode: { debut: dto.debutDate, fin: dto.endDate },
      totalLignes,
      repartition: {
        vert: vertCount,
        jaune: jauneCount,
        rouge: rougeCount,
      },
      repartitionPourcentage: {
        vert: Math.round((vertCount / totalLignes) * 100 * 100) / 100,
        jaune: Math.round((jauneCount / totalLignes) * 100 * 100) / 100,
        rouge: Math.round((rougeCount / totalLignes) * 100 * 100) / 100,
      },
      minutesArretCumulees: totalMinutesArret,
      details: lignes.map((l) => ({
        id: l.id,
        nomLigne: l.nomLigne,
        heure: l.heure,
        note: l.note,
        delais: l.delais,
        responsable: l.responsable,
        details: l.details,
        dateControle: l.controleDate.dateControle,
        agent: {
          id: l.agent.id,
          firstName: l.agent.firstName,
          lastName: l.agent.lastName,
          matricule: l.agent.matricule,
        },
        createdAt: l.createdAt,
      })),
    };

    return rapport;
  }

  private getDatesBetween(start: string, end: string): string[] {
    const dates: string[] = [];
    const current = new Date(start);
    const last = new Date(end);

    while (current <= last) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }
}

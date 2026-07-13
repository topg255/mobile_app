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

@Injectable()
export class QualityService {
  constructor(
    @InjectRepository(ControleDate)
    private readonly controleDateRepo: Repository<ControleDate>,
    @InjectRepository(LigneControle)
    private readonly ligneControleRepo: Repository<LigneControle>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createControleDate(dto: CreateControleDateDto, user: User) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requestedDate = new Date(dto.dateControle);
    requestedDate.setHours(0, 0, 0, 0);

    if (requestedDate < today) {
      throw new BadRequestException(
        'Vous ne pouvez pas ajouter une date passée. Seules les dates d\'aujourd\'hui ou futures sont acceptées.',
      );
    }

    const existing = await this.controleDateRepo.findOne({
      where: { dateControle: dto.dateControle },
    });

    if (existing) {
      throw new BadRequestException(
        `La date de contrôle ${dto.dateControle} existe déjà.`,
      );
    }

    const controleDate = this.controleDateRepo.create({
      dateControle: dto.dateControle,
      isActive: true,
      createdBy: user,
    });

    await this.controleDateRepo.save(controleDate);

    return {
      message: 'Date de contrôle créée avec succès',
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
      throw new NotFoundException('Date de contrôle non trouvée');
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

    return {
      message: 'Ligne de contrôle ajoutée avec succès',
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
        'Seuls les superviseurs qualité peuvent consulter les lignes d\'un agent.',
      );
    }

    const agent = await this.userRepo.findOne({ where: { id: agentId } });
    if (!agent) {
      throw new NotFoundException('Agent qualité non trouvé');
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
        'Seuls les superviseurs qualité peuvent consulter toutes les lignes.',
      );
    }

    return this.ligneControleRepo.find({
      order: { createdAt: 'DESC' },
      relations: { controleDate: true, agent: true },
    });
  }

  async getHistoriqueAgents(requestor: User) {
    if (requestor.role !== UserRole.SUPERVISEUR_QUALITE) {
      throw new ForbiddenException(
        'Seuls les superviseurs qualité peuvent voir l\'historique des agents.',
      );
    }

    const agents = await this.userRepo.find({
      where: { role: UserRole.AGENT_QUALITE },
    });

    const historique = await Promise.all(
      agents.map(async (agent) => {
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
        'La date de début doit être antérieure à la date de fin.',
      );
    }

    const controleDates = await this.controleDateRepo.find({
      where: {
        dateControle: In(
          this.getDatesBetween(dto.debutDate, dto.endDate),
        ),
      },
    });

    if (controleDates.length === 0) {
      return {
        message: 'Aucune date de contrôle trouvée pour cette période',
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
    } else if (user.role === UserRole.SUPERVISEUR_QUALITE && dto.agentId) {
      whereCondition.agent = { id: dto.agentId };
    }

    const lignes = await this.ligneControleRepo.find({
      where: whereCondition,
      relations: { controleDate: true, agent: true },
    });

    const totalLignes = lignes.length;

    if (totalLignes === 0) {
      return {
        message: 'Aucune ligne de contrôle trouvée pour cette période',
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
    const jauneCount = lignes.filter((l) => l.note === NoteQualite.JAUNE).length;
    const rougeCount = lignes.filter((l) => l.note === NoteQualite.ROUGE).length;

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

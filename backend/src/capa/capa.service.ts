import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, Not } from 'typeorm';
import { Mistral } from '@mistralai/mistralai';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Capa, CapaStatus, CapaPriority, CapaType } from './entities/capa.entity';
import { CapaAction, ActionStatus, ActionType } from './entities/capa-action.entity';
import {
  CapaCommentaire,
  CommentaireType,
} from './entities/capa-commentaire.entity';
import { User } from '../auth/entities/user.entity';
import { LigneControle } from '../quality/entities/ligne-controle.entity';
import { EmailService } from '../report/email.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  [CapaStatus.OUVERT]: [CapaStatus.EN_ANALYSE, CapaStatus.ANNULE],
  [CapaStatus.EN_ANALYSE]: [CapaStatus.EN_COURS, CapaStatus.ANNULE],
  [CapaStatus.EN_COURS]: [CapaStatus.EN_VERIFICATION, CapaStatus.ANNULE],
  [CapaStatus.EN_VERIFICATION]: [CapaStatus.CLOTURE, CapaStatus.EN_COURS, CapaStatus.ANNULE],
  [CapaStatus.CLOTURE]: [],
  [CapaStatus.ANNULE]: [],
};

export interface CapaStats {
  totalCapas: number;
  ouverts: number;
  enCours: number;
  cloturesThisMois: number;
  tauxResolution: number;
  delaiMoyenResolution: number;
  capasEnRetard: Capa[];
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  topLignesProblematiques: { nomLigne: string; count: number }[];
}

@Injectable()
export class CapaService {
  private readonly logger = new Logger(CapaService.name);
  private readonly mistralApiKey: string | undefined;

  constructor(
    @InjectRepository(Capa)
    private readonly capaRepo: Repository<Capa>,
    @InjectRepository(CapaAction)
    private readonly actionRepo: Repository<CapaAction>,
    @InjectRepository(CapaCommentaire)
    private readonly commentaireRepo: Repository<CapaCommentaire>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(LigneControle)
    private readonly ligneRepo: Repository<LigneControle>,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {
    this.mistralApiKey = this.configService.get<string>('MISTRAL_API_KEY');
  }

  async generateReference(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.capaRepo.count({
      where: { reference: `CAPA-${year}-%` } as any,
    });
    const num = String(count + 1).padStart(3, '0');
    return `CAPA-${year}-${num}`;
  }

  async createCapa(
    superviseurId: string,
    dto: {
      titre: string;
      description: string;
      type: CapaType;
      priority: CapaPriority;
      dateEcheance: Date;
      ligneControleId?: string;
      nomLigne?: string;
      causeRacine?: string;
      coutEstime?: number;
    },
  ): Promise<Capa> {
    const superviseur = await this.userRepo.findOne({
      where: { id: superviseurId },
    });
    if (!superviseur) throw new NotFoundException('Superviseur non trouvé');

    let nomLigne = dto.nomLigne || 'Non spécifiée';
    if (dto.ligneControleId) {
      const ligne = await this.ligneRepo.findOne({
        where: { id: dto.ligneControleId },
      } as any);
      if (ligne) nomLigne = ligne.nomLigne;
    }

    const reference = await this.generateReference();

    const capa = this.capaRepo.create({
      reference,
      superviseurId,
      superviseurName: `${superviseur.firstName} ${superviseur.lastName}`,
      titre: dto.titre,
      description: dto.description,
      type: dto.type,
      priority: dto.priority,
      dateEcheance: dto.dateEcheance,
      ligneControleId: dto.ligneControleId || null,
      nomLigne,
      causeRacine: dto.causeRacine || null,
      coutEstime: dto.coutEstime || null,
      status: CapaStatus.OUVERT,
    });

    const saved = await this.capaRepo.save(capa);

    await this.addCommentaireInternal(
      saved.id,
      superviseurId,
      `${superviseur.firstName} ${superviseur.lastName}`,
      `CAPA créé avec le statut "Ouvert"`,
      CommentaireType.CHANGEMENT_STATUT,
      null,
      CapaStatus.OUVERT,
    );

    this.sendCreationEmail(saved, superviseur).catch(() => {});

    this.generateCauseRacineIA(saved.id).catch(() => {});

    return saved;
  }

  private async sendCreationEmail(capa: Capa, superviseur: User): Promise<void> {
    const dateStr = new Date(capa.dateEcheance).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const priorityColors: Record<string, string> = {
      [CapaPriority.FAIBLE]: '#6B7280',
      [CapaPriority.MOYENNE]: '#3B82F6',
      [CapaPriority.HAUTE]: '#F59E0B',
      [CapaPriority.CRITIQUE]: '#DC2626',
    };
    const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
<tr><td style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 36px;text-align:center">
<h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Nouveau CAPA créé</h1>
<p style="margin:8px 0 0;color:#94a3b8;font-size:13px">${capa.reference}</p>
</td></tr>
<tr><td style="padding:28px 36px">
<h2 style="margin:0 0 8px;font-size:16px;color:#1e293b">${capa.titre}</h2>
<p style="margin:0 0 16px;font-size:13px;color:#64748b">Ligne : ${capa.nomLigne} | Échéance : ${dateStr}</p>
<p style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.6">${capa.description}</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px">
<div style="font-size:10px;color:#94a3b8;text-transform:uppercase">Priorité</div>
<div style="font-size:14px;font-weight:700;color:${priorityColors[capa.priority] || '#334155'};margin-top:4px">${capa.priority.toUpperCase()}</div>
</td>
<td style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px;border-left:1px solid #e2e8f0">
<div style="font-size:10px;color:#94a3b8;text-transform:uppercase">Type</div>
<div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:4px">${capa.type}</div>
</td>
</tr></table>
</td></tr>
<tr><td style="padding:0 36px 24px">
<p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">LEONI Qualité IA — Système de Management Qualité</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
    await this.emailService.sendEmail({
      to: superviseur.email,
      subject: `[CAPA] ${capa.reference} — ${capa.titre}`,
      html,
    });
  }

  async generateCauseRacineIA(capaId: number): Promise<void> {
    if (!this.mistralApiKey) {
      this.logger.warn('MISTRAL_API_KEY absente — analyse de cause racine IA ignorée');
      return;
    }

    const capa = await this.capaRepo.findOne({ where: { id: capaId } });
    if (!capa) return;

    try {
      const client = new Mistral({ apiKey: this.mistralApiKey });
      const prompt = `Tu es un expert qualité industrielle LEONI spécialisé en analyse de causes racines.
Voici un problème qualité : ${capa.titre} — ${capa.description}
Ligne concernée : ${capa.nomLigne}

Génère une analyse de cause racine structurée en JSON :
{
  "causesRacines": ["cause 1", "cause 2", "cause 3"],
  "cinqPourquoi": ["pourquoi 1", "pourquoi 2", "pourquoi 3", "pourquoi 4", "pourquoi 5"],
  "actionsRecommandees": [{ "titre": "string", "type": "corrective"|"preventive", "priorite": "haute"|"moyenne"|"faible" }],
  "risqueSiNonTraite": "string",
  "delaiRecommande": 30
}
Réponds UNIQUEMENT avec le JSON valide, sans markdown.`;

      const completion = await client.chat.complete({
        model: 'mistral-large-latest',
        maxTokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = (completion as any)?.choices?.[0]?.message?.content;
      if (!raw) return;

      const cleaned = (raw as string)
        .replace(/```json/gi, '```')
        .replace(/```/g, '')
        .trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1 || end === -1) return;

      const parsed = JSON.parse(cleaned.substring(start, end + 1));
      capa.causeRacineIA = JSON.stringify(parsed);
      await this.capaRepo.save(capa);
    } catch (err: any) {
      this.logger.warn(`Analyse IA impossible pour CAPA ${capaId}: ${err?.message}`);
    }
  }

  async getAllCapas(
    superviseurId: string,
    filters?: {
      status?: CapaStatus;
      priority?: CapaPriority;
      type?: CapaType;
      dateFrom?: string;
      dateTo?: string;
      ligneControleId?: string;
    },
  ): Promise<any[]> {
    const qb = this.capaRepo.createQueryBuilder('capa');
    qb.where('capa.superviseur_id = :superviseurId', { superviseurId });

    if (filters?.status) qb.andWhere('capa.status = :status', { status: filters.status });
    if (filters?.priority) qb.andWhere('capa.priority = :priority', { priority: filters.priority });
    if (filters?.type) qb.andWhere('capa.type = :type', { type: filters.type });
    if (filters?.ligneControleId)
      qb.andWhere('capa.ligne_controle_id = :ligneId', { ligneId: filters.ligneControleId });
    if (filters?.dateFrom)
      qb.andWhere('capa.date_echeance >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters?.dateTo)
      qb.andWhere('capa.date_echeance <= :dateTo', { dateTo: filters.dateTo });

    qb.orderBy('capa.date_echeance', 'ASC');

    const capas = await qb.getMany();

    const result = await Promise.all(
      capas.map(async (capa) => {
        const actions = await this.actionRepo.find({ where: { capaId: capa.id } });
        const totalActions = actions.length;
        const terminees = actions.filter((a) => a.status === ActionStatus.TERMINEE).length;
        const enRetard =
          capa.status !== CapaStatus.CLOTURE &&
          capa.status !== CapaStatus.ANNULE &&
          new Date(capa.dateEcheance) < new Date();
        return { ...capa, totalActions, terminees, enRetard };
      }),
    );

    return result;
  }

  async getCapaById(id: number, superviseurId: string): Promise<any> {
    const capa = await this.capaRepo.findOne({ where: { id } });
    if (!capa) throw new NotFoundException('CAPA non trouvé');
    if (capa.superviseurId !== superviseurId) throw new ForbiddenException('Accès refusé');

    const actions = await this.actionRepo.find({ where: { capaId: id } });
    const commentaires = await this.commentaireRepo.find({
      where: { capaId: id },
      order: { createdAt: 'ASC' },
    });

    return { ...capa, actions, commentaires };
  }

  async updateCapaStatus(
    id: number,
    superviseurId: string,
    newStatus: CapaStatus,
    note?: string,
  ): Promise<Capa> {
    const capa = await this.capaRepo.findOne({ where: { id } });
    if (!capa) throw new NotFoundException('CAPA non trouvé');
    if (capa.superviseurId !== superviseurId) throw new ForbiddenException('Accès refusé');

    const allowed = STATUS_TRANSITIONS[capa.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transition ${capa.status} → ${newStatus} non autorisée`,
      );
    }

    if (newStatus === CapaStatus.ANNULE && !note) {
      throw new BadRequestException('Une note est requise pour annuler un CAPA');
    }

    const ancienStatut = capa.status;
    capa.status = newStatus;

    if (newStatus === CapaStatus.CLOTURE) {
      capa.dateCloture = new Date();
      capa.efficaciteVerifiee = true;
      if (note) capa.noteEfficacite = note;
    }

    const saved = await this.capaRepo.save(capa);

    await this.addCommentaireInternal(
      id,
      superviseurId,
      capa.superviseurName,
      note || `Statut changé de "${ancienStatut}" vers "${newStatus}"`,
      CommentaireType.CHANGEMENT_STATUT,
      ancienStatut,
      newStatus,
    );

    return saved;
  }

  async addAction(
    capaId: number,
    superviseurId: string,
    dto: {
      titre: string;
      description: string;
      type: ActionType;
      responsableId: string;
      responsableName: string;
      dateEcheance: Date;
    },
  ): Promise<CapaAction> {
    const capa = await this.capaRepo.findOne({ where: { id: capaId } });
    if (!capa) throw new NotFoundException('CAPA non trouvé');
    if (capa.superviseurId !== superviseurId) throw new ForbiddenException('Accès refusé');

    const action = this.actionRepo.create({
      capaId,
      titre: dto.titre,
      description: dto.description,
      type: dto.type,
      responsableId: dto.responsableId,
      responsableName: dto.responsableName,
      dateEcheance: dto.dateEcheance,
      status: ActionStatus.A_FAIRE,
    });

    const saved = await this.actionRepo.save(action);

    await this.addCommentaireInternal(
      capaId,
      superviseurId,
      capa.superviseurName,
      `Action ajoutée : "${dto.titre}" assignée à ${dto.responsableName}`,
      CommentaireType.ACTION_AJOUTEE,
      null,
      null,
    );

    return saved;
  }

  async updateAction(
    actionId: number,
    superviseurId: string,
    dto: {
      titre?: string;
      description?: string;
      status?: ActionStatus;
      preuve?: string;
    },
  ): Promise<CapaAction> {
    const action = await this.actionRepo.findOne({ where: { id: actionId } });
    if (!action) throw new NotFoundException('Action non trouvée');

    const capa = await this.capaRepo.findOne({ where: { id: action.capaId } });
    if (!capa || capa.superviseurId !== superviseurId)
      throw new ForbiddenException('Accès refusé');

    if (dto.titre !== undefined) action.titre = dto.titre;
    if (dto.description !== undefined) action.description = dto.description;
    if (dto.preuve !== undefined) action.preuve = dto.preuve;

    if (dto.status) {
      action.status = dto.status;
      if (dto.status === ActionStatus.TERMINEE) {
        action.completedAt = new Date();
      }
    }

    return this.actionRepo.save(action);
  }

  async completeActionByAgent(
    actionId: number,
    agentId: string,
    preuve: string,
  ): Promise<CapaAction> {
    const action = await this.actionRepo.findOne({ where: { id: actionId } });
    if (!action) throw new NotFoundException('Action non trouvée');
    if (action.responsableId !== agentId)
      throw new ForbiddenException('Cette action ne vous est pas assignée');

    action.status = ActionStatus.TERMINEE;
    action.completedAt = new Date();
    action.preuve = preuve;

    const saved = await this.actionRepo.save(action);

    const capa = await this.capaRepo.findOne({ where: { id: action.capaId } });
    if (capa) {
      const allActions = await this.actionRepo.find({ where: { capaId: capa.id } });
      const allDone = allActions.every((a) => a.status === ActionStatus.TERMINEE);
      if (allDone) {
        await this.notificationService.create(
          capa.superviseurId,
          NotificationType.SYSTEM,
          `Toutes les actions du CAPA ${capa.reference} sont terminées`,
          String(capa.id),
        );
      }
    }

    return saved;
  }

  async addCommentaire(
    capaId: number,
    auteurId: string,
    contenu: string,
  ): Promise<CapaCommentaire> {
    const capa = await this.capaRepo.findOne({ where: { id: capaId } });
    if (!capa) throw new NotFoundException('CAPA non trouvé');

    const auteur = await this.userRepo.findOne({ where: { id: auteurId } });
    const auteurName = auteur ? `${auteur.firstName} ${auteur.lastName}` : 'Utilisateur';

    return this.addCommentaireInternal(
      capaId,
      auteurId,
      auteurName,
      contenu,
      CommentaireType.COMMENTAIRE,
      null,
      null,
    );
  }

  private async addCommentaireInternal(
    capaId: number,
    auteurId: string,
    auteurName: string,
    contenu: string,
    type: CommentaireType,
    ancienStatut: string | null,
    nouveauStatut: string | null,
  ): Promise<CapaCommentaire> {
    const commentaire = this.commentaireRepo.create({
      capaId,
      auteurId,
      auteurName,
      contenu,
      type,
      ancienStatut,
      nouveauStatut,
    });
    return this.commentaireRepo.save(commentaire);
  }

  async getStats(superviseurId: string): Promise<CapaStats> {
    const allCapas = await this.capaRepo.find({
      where: { superviseurId },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const ouverts = allCapas.filter((c) => c.status === CapaStatus.OUVERT).length;
    const enCours = allCapas.filter(
      (c) =>
        c.status === CapaStatus.EN_ANALYSE ||
        c.status === CapaStatus.EN_COURS ||
        c.status === CapaStatus.EN_VERIFICATION,
    ).length;
    const cloturesThisMois = allCapas.filter(
      (c) =>
        c.status === CapaStatus.CLOTURE &&
        c.dateCloture &&
        new Date(c.dateCloture) >= startOfMonth,
    ).length;

    const clotures = allCapas.filter((c) => c.status === CapaStatus.CLOTURE);
    const totalThisMois = allCapas.filter(
      (c) => new Date(c.createdAt) >= startOfMonth,
    ).length;
    const tauxResolution =
      totalThisMois > 0 ? Math.round((cloturesThisMois / totalThisMois) * 100) : 0;

    let delaiMoyenResolution = 0;
    if (clotures.length > 0) {
      const delais = clotures
        .filter((c) => c.dateCloture)
        .map(
          (c) =>
            (new Date(c.dateCloture!).getTime() - new Date(c.dateOuverture).getTime()) /
            (1000 * 60 * 60 * 24),
        );
      delaiMoyenResolution =
        delais.length > 0
          ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length)
          : 0;
    }

    const capasEnRetard = allCapas.filter(
      (c) =>
        c.status !== CapaStatus.CLOTURE &&
        c.status !== CapaStatus.ANNULE &&
        new Date(c.dateEcheance) < now,
    );

    const byPriority: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const c of allCapas) {
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
      byType[c.type] = (byType[c.type] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    }

    const ligneCounts: Record<string, number> = {};
    for (const c of allCapas) {
      if (c.nomLigne) {
        ligneCounts[c.nomLigne] = (ligneCounts[c.nomLigne] || 0) + 1;
      }
    }
    const topLignesProblematiques = Object.entries(ligneCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([nomLigne, count]) => ({ nomLigne, count }));

    return {
      totalCapas: allCapas.length,
      ouverts,
      enCours,
      cloturesThisMois,
      tauxResolution,
      delaiMoyenResolution,
      capasEnRetard,
      byPriority,
      byType,
      byStatus,
      topLignesProblematiques,
    };
  }

  async generateCapaPdf(
    capaId: number,
    superviseurId: string,
  ): Promise<Buffer> {
    const capa = await this.getCapaById(capaId, superviseurId);

    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const font = await doc.embedStandardFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedStandardFont(StandardFonts.HelveticaBold);

    const navy = rgb(0.06, 0.09, 0.16);
    const gray = rgb(0.41, 0.47, 0.55);
    const lightGray = rgb(0.85, 0.87, 0.9);
    const white = rgb(1, 1, 1);

    let y = height - 50;

    page.drawText('LEONI QUALITE IA', { x: 40, y, size: 18, font: fontBold, color: navy });
    page.drawText(`RAPPORT CAPA — ${capa.reference}`, {
      x: 40,
      y: y - 22,
      size: 12,
      font,
      color: gray,
    });
    y -= 50;

    page.drawLine({
      start: { x: 40, y },
      end: { x: width - 40, y },
      thickness: 1,
      color: lightGray,
    });
    y -= 25;

    const infoItems = [
      ['Référence', capa.reference],
      ['Statut', capa.status],
      ['Priorité', capa.priority],
      ['Type', capa.type],
      ['Ligne', capa.nomLigne],
      ['Superviseur', capa.superviseurName],
      [
        'Date d\'ouverture',
        new Date(capa.dateOuverture).toLocaleDateString('fr-FR'),
      ],
      [
        'Date d\'échéance',
        new Date(capa.dateEcheance).toLocaleDateString('fr-FR'),
      ],
      ...(capa.dateCloture
        ? [
            [
              'Date de clôture',
              new Date(capa.dateCloture).toLocaleDateString('fr-FR'),
            ],
          ]
        : []),
      ...(capa.coutEstime
        ? [['Coût estimé', `${capa.coutEstime} €`]]
        : []),
    ];

    for (const [label, value] of infoItems) {
      page.drawText(`${label} :`, { x: 40, y, size: 9, font: fontBold, color: navy });
      page.drawText(String(value), { x: 180, y, size: 9, font, color: gray });
      y -= 16;
    }
    y -= 10;

    page.drawText('DESCRIPTION DU PROBLEME', {
      x: 40,
      y,
      size: 11,
      font: fontBold,
      color: navy,
    });
    y -= 18;
    y = this.drawTextBlock(page, capa.description, 40, y, width - 80, font, gray, 9);
    y -= 15;

    if (capa.causeRacine) {
      page.drawText('CAUSE RACINE (ANALYSE MANUELLE)', {
        x: 40,
        y,
        size: 11,
        font: fontBold,
        color: navy,
      });
      y -= 18;
      y = this.drawTextBlock(page, capa.causeRacine, 40, y, width - 80, font, gray, 9);
      y -= 15;
    }

    if (capa.causeRacineIA) {
      try {
        const ia = JSON.parse(capa.causeRacineIA);
        page.drawText('ANALYSE IA — 5 POURQUOI', {
          x: 40,
          y,
          size: 11,
          font: fontBold,
          color: navy,
        });
        y -= 18;
        if (ia.cinqPourquoi) {
          for (const [i, p] of (ia.cinqPourquoi as string[]).entries()) {
            y = this.drawTextBlock(
              page,
              `${i + 1}. ${p}`,
              50,
              y,
              width - 100,
              font,
              gray,
              9,
            );
            y -= 4;
          }
        }
        y -= 10;
      } catch {}
    }

    if (capa.actions && capa.actions.length > 0) {
      page.drawText('ACTIONS', {
        x: 40,
        y,
        size: 11,
        font: fontBold,
        color: navy,
      });
      y -= 20;

      const headers = ['Titre', 'Responsable', 'Échéance', 'Statut'];
      const colX = [40, 220, 340, 440];
      const colW = [180, 120, 100, 120];

      page.drawRectangle({
        x: 38,
        y: y - 2,
        width: width - 76,
        height: 18,
        color: rgb(0.96, 0.97, 0.98),
      });
      headers.forEach((h, i) => {
        page.drawText(h, { x: colX[i], y, size: 8, font: fontBold, color: navy });
      });
      y -= 20;

      for (const action of capa.actions) {
        if (y < 100) {
          const newPage = doc.addPage([595.28, 841.89]);
          y = newPage.getSize().height - 50;
        }
        page.drawText(action.titre.substring(0, 25), {
          x: colX[0],
          y,
          size: 8,
          font,
          color: gray,
        });
        page.drawText(action.responsableName.substring(0, 18), {
          x: colX[1],
          y,
          size: 8,
          font,
          color: gray,
        });
        page.drawText(
          new Date(action.dateEcheance).toLocaleDateString('fr-FR'),
          { x: colX[2], y, size: 8, font, color: gray },
        );
        page.drawText(action.status, { x: colX[3], y, size: 8, font, color: gray });
        y -= 16;
      }
      y -= 15;
    }

    if (capa.commentaires && capa.commentaires.length > 0) {
      if (y < 150) {
        const newPage = doc.addPage([595.28, 841.89]);
        y = newPage.getSize().height - 50;
      }
      page.drawText('HISTORIQUE', {
        x: 40,
        y,
        size: 11,
        font: fontBold,
        color: navy,
      });
      y -= 18;
      for (const c of capa.commentaires.slice(-10)) {
        const dateStr = new Date(c.createdAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        y = this.drawTextBlock(
          page,
          `[${dateStr}] ${c.auteurName}: ${c.contenu}`,
          50,
          y,
          width - 100,
          font,
          gray,
          8,
        );
        y -= 8;
      }
    }

    const footerY = 35;
    page.drawLine({
      start: { x: 40, y: footerY },
      end: { x: width - 40, y: footerY },
      thickness: 0.3,
      color: lightGray,
    });
    page.drawText(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} | Conforme ISO 9001 | LEONI Qualité IA`,
      {
        x: 40,
        y: footerY - 14,
        size: 7,
        font,
        color: gray,
      },
    );

    return Buffer.from(await doc.save());
  }

  private drawTextBlock(
    page: any,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    font: any,
    color: any,
    size: number,
  ): number {
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const w = font.widthOfTextAtSize(test, size);
      if (w > maxWidth && line) {
        page.drawText(line, { x, y, size, font, color });
        y -= size + 4;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x, y, size, font, color });
      y -= size + 4;
    }
    return y;
  }

  async getAgentsOfSuperviseur(superviseurId: string): Promise<User[]> {
    return this.userRepo.find({
      where: { superviseurId, role: 'agent_qualite' as any } as any,
    });
  }

  async getCapasForAgent(agentId: string): Promise<any[]> {
    const actions = await this.actionRepo.find({
      where: { responsableId: agentId },
      order: { dateEcheance: 'ASC' },
    });

    const result = await Promise.all(
      actions.map(async (action) => {
        const capa = await this.capaRepo.findOne({ where: { id: action.capaId } });
        return { ...action, capa };
      }),
    );

    return result;
  }
}
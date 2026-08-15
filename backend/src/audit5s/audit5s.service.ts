import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mistral } from '@mistralai/mistralai';
import { ConfigService } from '@nestjs/config';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Audit5S, NoteCalculee } from './entities/audit5s.entity';
import { Critere5S, Pilier5S } from './entities/critere5s.entity';
import { DEFAULT_CRITERIA, PILIER_LABELS, DefaultCritere } from './data/default-criteria';
import { User } from '../auth/entities/user.entity';
import { LigneControle, NoteQualite } from '../quality/entities/ligne-controle.entity';
import { CapaService } from '../capa/capa.service';
import { CapaPriority } from '../capa/entities/capa.entity';

export interface CriteresParPilier {
  s1: { label: string; criteria: { id: number; label: string; points: number; ordre: number }[] };
  s2: { label: string; criteria: { id: number; label: string; points: number; ordre: number }[] };
  s3: { label: string; criteria: { id: number; label: string; points: number; ordre: number }[] };
  s4: { label: string; criteria: { id: number; label: string; points: number; ordre: number }[] };
  s5: { label: string; criteria: { id: number; label: string; points: number; ordre: number }[] };
}

export interface ScoreResult {
  scoreGlobal: number;
  noteCalculee: NoteCalculee;
  scoreS1: number;
  scoreS2: number;
  scoreS3: number;
  scoreS4: number;
  scoreS5: number;
  pilierPlusFaible: string;
}

export interface Stats5S {
  moyenneScore: number;
  repartitionNotes: { vert: number; orange: number; rouge: number };
  evolutionScoreParJour: { date: string; moyenne: number }[];
  piliersPlusFaibles: { pilier: string; scoreMoyen: number }[];
  lignesMeilleureScore: { nomLigne: string; scoreMoyen: number }[];
  lignesPireScore: { nomLigne: string; scoreMoyen: number }[];
  totalAuditsEffectues: number;
}

@Injectable()
export class Audit5SService {
  private readonly logger = new Logger(Audit5SService.name);

  constructor(
    @InjectRepository(Audit5S)
    private readonly auditRepo: Repository<Audit5S>,
    @InjectRepository(Critere5S)
    private readonly critereRepo: Repository<Critere5S>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(LigneControle)
    private readonly ligneRepo: Repository<LigneControle>,
    private readonly configService: ConfigService,
    private readonly capaService: CapaService,
  ) {}

  async getCriteres(superviseurId: string): Promise<CriteresParPilier> {
    const customCriteres = await this.critereRepo.find({
      where: { tenantId: superviseurId, isActive: true },
      order: { pilier: 'ASC', ordre: 'ASC' },
    });

    if (customCriteres.length > 0) {
      return this.buildCriteresParPilier(customCriteres);
    }

    const defaults: (DefaultCritere & { id: number })[] = DEFAULT_CRITERIA.map((c, i) => ({
      ...c,
      id: i + 1,
    }));
    return this.buildCriteresParPilier(defaults);
  }

  private buildCriteresParPilier(
    criteres: { id: number; pilier: Pilier5S; label: string; points: number; ordre: number }[],
  ): CriteresParPilier {
    const group: Record<string, typeof criteres> = {};
    for (const pilier of Object.values(Pilier5S)) {
      group[pilier] = criteres
        .filter((c) => c.pilier === pilier)
        .sort((a, b) => a.ordre - b.ordre);
    }
    return {
      s1: { label: PILIER_LABELS[Pilier5S.S1], criteria: group[Pilier5S.S1] || [] },
      s2: { label: PILIER_LABELS[Pilier5S.S2], criteria: group[Pilier5S.S2] || [] },
      s3: { label: PILIER_LABELS[Pilier5S.S3], criteria: group[Pilier5S.S3] || [] },
      s4: { label: PILIER_LABELS[Pilier5S.S4], criteria: group[Pilier5S.S4] || [] },
      s5: { label: PILIER_LABELS[Pilier5S.S5], criteria: group[Pilier5S.S5] || [] },
    };
  }

  calculateScore(
    reponses: Record<string, boolean>,
    criteres: CriteresParPilier,
  ): ScoreResult {
    const calcPilier = (
      key: 's1' | 's2' | 's3' | 's4' | 's5',
    ): number => {
      const pilier = criteres[key];
      let obtained = 0;
      let total = 0;
      for (let i = 0; i < pilier.criteria.length; i++) {
        const crit = pilier.criteria[i];
        total += crit.points;
        if (reponses[`${key}_${i}`]) {
          obtained += crit.points;
        }
      }
      return total > 0 ? Math.round((obtained / total) * 20) : 0;
    };

    const scoreS1 = calcPilier('s1');
    const scoreS2 = calcPilier('s2');
    const scoreS3 = calcPilier('s3');
    const scoreS4 = calcPilier('s4');
    const scoreS5 = calcPilier('s5');
    const scoreGlobal = scoreS1 + scoreS2 + scoreS3 + scoreS4 + scoreS5;

    let noteCalculee: NoteCalculee;
    if (scoreGlobal >= 80) {
      noteCalculee = NoteCalculee.VERT;
    } else if (scoreGlobal >= 55) {
      noteCalculee = NoteCalculee.ORANGE;
    } else {
      noteCalculee = NoteCalculee.ROUGE;
    }

    const scores = [
      { key: 's1', score: scoreS1 },
      { key: 's2', score: scoreS2 },
      { key: 's3', score: scoreS3 },
      { key: 's4', score: scoreS4 },
      { key: 's5', score: scoreS5 },
    ];
    const weakest = scores.reduce((a, b) => (a.score <= b.score ? a : b));

    return {
      scoreGlobal,
      noteCalculee,
      scoreS1,
      scoreS2,
      scoreS3,
      scoreS4,
      scoreS5,
      pilierPlusFaible: PILIER_LABELS[weakest.key as Pilier5S],
    };
  }

  async generateAnalyseIA(
    scoreResult: ScoreResult,
    nomLigne: string,
    agentName: string,
  ): Promise<string> {
    const mistralApiKey = this.configService.get<string>('MISTRAL_API_KEY');
    if (!mistralApiKey) {
      return this.generateFallbackAnalyse(scoreResult, nomLigne, agentName);
    }

    try {
      const client = new Mistral({ apiKey: mistralApiKey });
      const { scoreGlobal, noteCalculee, scoreS1, scoreS2, scoreS3, scoreS4, scoreS5, pilierPlusFaible } = scoreResult;
      const pilierPct = Math.round(
        ((scoreResult.scoreS1 === scoreResult.scoreS2 &&
          scoreResult.scoreS1 === scoreResult.scoreS3 &&
          scoreResult.scoreS1 === scoreResult.scoreS4)
          ? scoreS1
          : Math.min(scoreS1, scoreS2, scoreS3, scoreS4, scoreS5)),
      );

      const prompt = `Tu es expert qualité LEONI. Analyse cet audit 5S et génère un rapport clair et structuré.

Résultats de l'audit :
- Ligne : ${nomLigne}
- Agent : ${agentName}
- Score global : ${scoreGlobal}/100 (${noteCalculee})
- 1S Trier : ${scoreS1}/20
- 2S Ranger : ${scoreS2}/20
- 3S Nettoyer : ${scoreS3}/20
- 4S Standardiser : ${scoreS4}/20
- 5S Soutenir : ${scoreS5}/20
- Pilier le plus faible : ${pilierPlusFaible}

Format de réponse souhaité (en français, sans markdown ni astérisques) :

ÉTAT GÉNÉRAL
(1-2 phrases sur le niveau global)

POINTS FORTS
(piliers bien notés)

POINTS À AMÉLIORER
(piliers faibles avec actions concrètes)

PRIORITÉ D'ACTION
(une action immédiate)

Sois direct, concret et professionnel. Utilise des retours à la ligne pour aérer le texte.`;

      const completion = await client.chat.complete({
        model: 'mistral-large-latest',
        maxTokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = (completion as any)?.choices?.[0]?.message?.content;
      if (raw && typeof raw === 'string' && raw.trim().length > 0) {
        return raw.trim();
      }
      return this.generateFallbackAnalyse(scoreResult, nomLigne, agentName);
    } catch (err: any) {
      this.logger.warn(`Erreur Mistral analyse 5S: ${err?.message}`);
      return this.generateFallbackAnalyse(scoreResult, nomLigne, agentName);
    }
  }

  private generateFallbackAnalyse(
    scoreResult: ScoreResult,
    nomLigne: string,
    agentName: string,
  ): string {
    const { scoreGlobal, noteCalculee, pilierPlusFaible } = scoreResult;
    let texte = `Audit 5S de la ligne "${nomLigne}" par ${agentName}. Score global : ${scoreGlobal}/100 (${noteCalculee}).`;
    texte += ` Le pilier le plus faible est ${pilierPlusFaible}.`;
    if (noteCalculee === NoteCalculee.ROUGE) {
      texte += ' La ligne est en non-conformité. Un CAPA sera ouvert automatiquement et le superviseur sera notifié.';
    } else if (noteCalculee === NoteCalculee.ORANGE) {
      texte += ' Des améliorations sont nécessaires pour atteindre le niveau vert.';
    } else {
      texte += ' Le niveau de conformité est satisfaisant. Maintenir les efforts.';
    }
    return texte;
  }

  async submitAudit(
    agentId: string,
    ligneControleId: string,
    dto: {
      reponses: Record<string, boolean>;
      commentaireAgent?: string;
      dureeSecondes?: number;
    },
  ): Promise<Audit5S> {
    const agent = await this.userRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new Error('Agent non trouvé');

    const ligne = await this.ligneRepo.findOne({
      where: { id: ligneControleId },
    });
    if (!ligne) throw new Error('Ligne de contrôle non trouvée');

    const superviseurId = agent.superviseurId || agent.id;
    const criteres = await this.getCriteres(superviseurId);
    const scoreResult = this.calculateScore(dto.reponses, criteres);

    const audit = this.auditRepo.create({
      ligneControleId,
      nomLigne: ligne.nomLigne,
      agentId,
      agentName: `${agent.firstName} ${agent.lastName}`,
      superviseurId,
      scoreGlobal: scoreResult.scoreGlobal,
      noteCalculee: scoreResult.noteCalculee,
      scoreS1: scoreResult.scoreS1,
      scoreS2: scoreResult.scoreS2,
      scoreS3: scoreResult.scoreS3,
      scoreS4: scoreResult.scoreS4,
      scoreS5: scoreResult.scoreS5,
      reponsesJson: JSON.stringify(dto.reponses),
      pilierPlusFaible: scoreResult.pilierPlusFaible,
      dureeRemplissageSecondes: dto.dureeSecondes || null,
      commentaireAgent: dto.commentaireAgent || null,
      analyseIA: 'Analyse en cours...',
    });

    const savedAudit = await this.auditRepo.save(audit);

    // Update LigneControle note
    const noteMap: Record<string, NoteQualite> = {
      vert: NoteQualite.VERT,
      orange: NoteQualite.JAUNE,
      rouge: NoteQualite.ROUGE,
    };
    ligne.note = noteMap[scoreResult.noteCalculee] || NoteQualite.JAUNE;
    await this.ligneRepo.save(ligne);

    // Auto-create CAPA for red lines
    if (scoreResult.noteCalculee === NoteCalculee.ROUGE) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const existingAudits = await this.auditRepo.find({
          where: {
            ligneControleId,
            superviseurId,
            noteCalculee: NoteCalculee.ROUGE,
          } as any,
          order: { createdAt: 'DESC' },
          take: 1,
        });
        const todayAudit = existingAudits.find(
          (a) => a.createdAt.toISOString().startsWith(today) && a.id !== savedAudit.id,
        );

        if (!todayAudit) {
          const dateEcheance = new Date();
          dateEcheance.setDate(dateEcheance.getDate() + 30);

          const capa = await this.capaService.createCapa(superviseurId, {
            titre: `Non-conformité 5S — ${ligne.nomLigne}`,
            description: `Audit 5S automatique. Score : ${scoreResult.scoreGlobal}/100. ${scoreResult.pilierPlusFaible} est le pilier le plus faible.`,
            type: 'corrective' as any,
            priority: CapaPriority.HAUTE,
            dateEcheance,
            ligneControleId,
            nomLigne: ligne.nomLigne,
            causeRacine: `Audit 5S automatique — score ${scoreResult.scoreGlobal}/100`,
          });
          savedAudit.capaDeclenche = true;
          savedAudit.capaId = capa.id;
          await this.auditRepo.save(savedAudit);
        }
      } catch (err: any) {
        this.logger.warn(`CAPA automatique non créée: ${err?.message}`);
      }
    }

    // Generate AI analysis asynchronously (fire and forget)
    this.generateAnalyseIA(scoreResult, ligne.nomLigne, `${agent.firstName} ${agent.lastName}`)
      .then(async (analyse) => {
        savedAudit.analyseIA = analyse;
        await this.auditRepo.save(savedAudit);
      })
      .catch((err) => {
        this.logger.warn(`Analyse IA échouée: ${err?.message}`);
        savedAudit.analyseIA = this.generateFallbackAnalyse(
          scoreResult,
          ligne.nomLigne,
          `${agent.firstName} ${agent.lastName}`,
        );
        this.auditRepo.save(savedAudit).catch(() => {});
      });

    return savedAudit;
  }

  async getHistoriqueAudit(
    ligneControleId: string,
    limit = 10,
  ): Promise<Audit5S[]> {
    return this.auditRepo.find({
      where: { ligneControleId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getStatsAudit5S(superviseurId: string): Promise<Stats5S> {
    const now = new Date();
    const debut = new Date(now.getFullYear(), now.getMonth(), 1);
    const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const audits = await this.auditRepo.find({
      where: {
        superviseurId,
        createdAt: { _greaterThanOrEqual: debut, _lessThanOrEqual: fin } as any,
      },
      order: { createdAt: 'ASC' },
    });

    if (audits.length === 0) {
      return {
        moyenneScore: 0,
        repartitionNotes: { vert: 0, orange: 0, rouge: 0 },
        evolutionScoreParJour: [],
        piliersPlusFaibles: [],
        lignesMeilleureScore: [],
        lignesPireScore: [],
        totalAuditsEffectues: 0,
      };
    }

    const totalScore = audits.reduce((s, a) => s + a.scoreGlobal, 0);
    const moyenneScore = Math.round((totalScore / audits.length) * 10) / 10;

    const repartitionNotes = { vert: 0, orange: 0, rouge: 0 };
    for (const a of audits) {
      repartitionNotes[a.noteCalculee]++;
    }

    // Evolution by day
    const dayMap = new Map<string, number[]>();
    for (const a of audits) {
      const day = a.createdAt.toISOString().split('T')[0];
      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day)!.push(a.scoreGlobal);
    }
    const evolutionScoreParJour = Array.from(dayMap.entries()).map(
      ([date, scores]) => ({
        date,
        moyenne:
          Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) /
          10,
      }),
    );

    // Piliers plus faibles
    const pilierTotals = { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
    for (const a of audits) {
      pilierTotals.s1 += a.scoreS1;
      pilierTotals.s2 += a.scoreS2;
      pilierTotals.s3 += a.scoreS3;
      pilierTotals.s4 += a.scoreS4;
      pilierTotals.s5 += a.scoreS5;
    }
    const piliersPlusFaibles = Object.entries(pilierTotals)
      .map(([pilier, total]) => ({
        pilier: PILIER_LABELS[pilier as Pilier5S],
        scoreMoyen: Math.round((total / audits.length) * 10) / 10,
      }))
      .sort((a, b) => a.scoreMoyen - b.scoreMoyen);

    // Top/bottom lignes
    const ligneMap = new Map<string, { total: number; count: number }>();
    for (const a of audits) {
      const existing = ligneMap.get(a.nomLigne) || { total: 0, count: 0 };
      existing.total += a.scoreGlobal;
      existing.count++;
      ligneMap.set(a.nomLigne, existing);
    }
    const ligneScores = Array.from(ligneMap.entries())
      .map(([nomLigne, { total, count }]) => ({
        nomLigne,
        scoreMoyen: Math.round((total / count) * 10) / 10,
      }))
      .sort((a, b) => b.scoreMoyen - a.scoreMoyen);

    return {
      moyenneScore,
      repartitionNotes,
      evolutionScoreParJour,
      piliersPlusFaibles,
      lignesMeilleureScore: ligneScores.slice(0, 3),
      lignesPireScore: ligneScores.slice(-3).reverse(),
      totalAuditsEffectues: audits.length,
    };
  }

  async updateCriteres(
    superviseurId: string,
    dto: { criteres: { pilier: Pilier5S; label: string; points: number; ordre: number }[] },
  ): Promise<void> {
    // Validate points per pilier sum to 20
    const pilierTotals: Record<string, number> = {};
    for (const c of dto.criteres) {
      pilierTotals[c.pilier] = (pilierTotals[c.pilier] || 0) + c.points;
    }
    for (const [pilier, total] of Object.entries(pilierTotals)) {
      if (total !== 20) {
        throw new Error(`Le pilier ${pilier} doit totaliser exactement 20 points (actuel : ${total})`);
      }
    }

    // Deactivate existing
    await this.critereRepo.update(
      { tenantId: superviseurId },
      { isActive: false },
    );

    // Create new
    const newCriteres = dto.criteres.map((c) =>
      this.critereRepo.create({
        tenantId: superviseurId,
        pilier: c.pilier,
        label: c.label,
        points: c.points,
        ordre: c.ordre,
        isActive: true,
      }),
    );
    await this.critereRepo.save(newCriteres);
  }

  async generateAuditPdf(auditId: number): Promise<Buffer> {
    const audit = await this.auditRepo.findOne({ where: { id: auditId } });
    if (!audit) throw new Error('Audit non trouvé');

    const ligne = await this.ligneRepo.findOne({ where: { id: audit.ligneControleId } });
    const agent = await this.userRepo.findOne({ where: { id: audit.agentId } });
    const criteres = await this.getCriteres(audit.superviseurId);
    const reponses = JSON.parse(audit.reponsesJson || '{}');

    const pdf = await PDFDocument.create();
    const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const page = pdf.addPage([595.28, 841.89]);
    const w = page.getWidth();
    const margin = 40;
    const contentW = w - margin * 2;
    let y = 810;

    const NC: Record<string, [number, number, number]> = {
      vert: [0.13, 0.77, 0.37],
      orange: [0.95, 0.45, 0.09],
      rouge: [0.86, 0.15, 0.17],
    };
    const NL: Record<string, string> = {
      vert: 'VERT — Conforme',
      orange: 'ORANGE — À améliorer',
      rouge: 'ROUGE — Non conforme',
    };
    const [cr, cg, cb] = NC[audit.noteCalculee] || [0, 0, 0];

    const drawLine = (yy: number, color: [number, number, number] = [0.88, 0.89, 0.92]) => {
      page.drawLine({ start: { x: margin, y: yy }, end: { x: w - margin, y: yy }, thickness: 0.5, color: rgb(...color) });
    };

    const drawSectionTitle = (yy: number, title: string) => {
      page.drawRectangle({ x: margin, y: yy - 4, width: 4, height: 16, color: rgb(0.39, 0.4, 0.95) });
      page.drawText(title, { x: margin + 12, y: yy, size: 11, font: helveticaBold, color: rgb(0.15, 0.15, 0.2) });
      return yy - 10;
    };

    // ── HEADER ──
    page.drawRectangle({ x: 0, y: y - 10, width: w, height: 40, color: rgb(0.06, 0.09, 0.17) });
    page.drawText('RAPPORT AUDIT 5S', { x: margin, y: y, size: 18, font: helveticaBold, color: rgb(1, 1, 1) });
    page.drawText('LEONI Qualite IA', { x: w - 155, y: y + 2, size: 9, font: helvetica, color: rgb(0.55, 0.6, 0.68) });
    page.drawText(`Ref: AUDIT-5S-${audit.id}`, { x: w - 155, y: y - 12, size: 8, font: helvetica, color: rgb(0.45, 0.5, 0.58) });
    y -= 30;

    // ── RESULT BADGE ──
    y -= 20;
    page.drawRectangle({ x: margin, y: y - 5, width: contentW, height: 50, color: rgb(cr * 0.12 + 0.88, cg * 0.12 + 0.88, cb * 0.12 + 0.88), borderColor: rgb(cr, cg, cb), borderWidth: 1.5 });
    page.drawText(`${audit.scoreGlobal}`, { x: margin + 16, y: y + 10, size: 30, font: helveticaBold, color: rgb(cr, cg, cb) });
    page.drawText('/ 100', { x: margin + 70, y: y + 16, size: 12, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(NL[audit.noteCalculee] || audit.noteCalculee.toUpperCase(), { x: margin + 140, y: y + 12, size: 14, font: helveticaBold, color: rgb(cr, cg, cb) });
    if (audit.capaDeclenche) {
      page.drawText('CAPA ouvert', { x: margin + 140, y: y - 2, size: 9, font: helveticaBold, color: rgb(0.86, 0.15, 0.17) });
    }
    y -= 40;

    // ── INFORMATIONS LIGNE ──
    y = drawSectionTitle(y, 'INFORMATIONS DE LA LIGNE');
    y -= 12;

    const col1X = margin + 10;
    const col2X = margin + contentW / 2 + 10;
    const lineH = 16;

    const drawField = (x: number, yy: number, label: string, value: string) => {
      page.drawText(label, { x, y: yy, size: 7, font: helveticaBold, color: rgb(0.55, 0.55, 0.6) });
      page.drawText(value || '-', { x, y: yy - 11, size: 10, font: helvetica, color: rgb(0.15, 0.15, 0.2) });
    };

    drawField(col1X, y, 'NOM DE LA LIGNE', ligne?.nomLigne || audit.nomLigne);
    drawField(col2X, y, 'AGENT', audit.agentName);
    y -= lineH + 8;

    const dateStr = audit.createdAt.toLocaleDateString('fr-FR');
    const timeStr = audit.createdAt.toLocaleTimeString('fr-FR');
    drawField(col1X, y, 'DATE D\'AUDIT', `${dateStr} a ${timeStr}`);
    drawField(col2X, y, 'HEURE', ligne?.heure || '-');
    y -= lineH + 8;

    drawField(col1X, y, 'DELAI', ligne ? `${ligne.delais} min` : '-');
    drawField(col2X, y, 'RESPONSABLE', ligne?.responsable || '-');
    y -= lineH + 8;

    if (ligne?.details) {
      drawField(col1X, y, 'DETAILS', ligne.details.length > 60 ? ligne.details.substring(0, 60) + '...' : ligne.details);
      y -= lineH + 8;
    }

    if (audit.dureeRemplissageSecondes) {
      const min = Math.floor(audit.dureeRemplissageSecondes / 60);
      const sec = audit.dureeRemplissageSecondes % 60;
      drawField(col1X, y, 'DUREE REMPLISSAGE', `${min}min ${sec}s`);
      y -= lineH + 8;
    }

    if (agent?.email) {
      drawField(col2X, y, 'EMAIL AGENT', agent.email);
      y -= lineH + 8;
    }

    // ── SCORES PAR PILIER ──
    y -= 8;
    y = drawSectionTitle(y, 'SCORES PAR PILIER');
    y -= 14;

    const PILIER_NAMES = ['1S — Trier (Seiri)', '2S — Ranger (Seiton)', '3S — Nettoyer (Seiso)', '4S — Standardiser (Seiketsu)', '5S — Soutenir (Shitsuke)'];
    const PILIER_COLORS: [number, number, number][] = [
      [0.39, 0.4, 0.95], [0.55, 0.36, 0.96], [0.02, 0.71, 0.83], [0.98, 0.45, 0.09], [0.93, 0.29, 0.69],
    ];
    const pilierScores = [audit.scoreS1, audit.scoreS2, audit.scoreS3, audit.scoreS4, audit.scoreS5];

    for (let i = 0; i < 5; i++) {
      const score = pilierScores[i];
      const pct = score / 20;
      const sr = score >= 16 ? 0.13 : score >= 11 ? 0.95 : 0.86;
      const sg = score >= 16 ? 0.77 : score >= 11 ? 0.45 : 0.15;
      const sb = score >= 16 ? 0.37 : score >= 11 ? 0.09 : 0.17;

      // Pilier color dot
      page.drawCircle({ x: col1X + 4, y: y + 4, size: 4, color: rgb(...PILIER_COLORS[i]) });
      page.drawText(PILIER_NAMES[i], { x: col1X + 16, y, size: 9, font: helveticaBold, color: rgb(0.2, 0.2, 0.25) });

      // Score
      page.drawText(`${score} / 20`, { x: w - margin - 50, y, size: 9, font: helveticaBold, color: rgb(sr, sg, sb) });

      // Progress bar
      const barX = col1X + 170;
      const barW = contentW - 230;
      page.drawRectangle({ x: barX, y: y - 1, width: barW, height: 7, color: rgb(0.93, 0.94, 0.96), borderColor: rgb(0.9, 0.91, 0.93), borderWidth: 0.3 });
      if (pct > 0) {
        page.drawRectangle({ x: barX, y: y - 1, width: Math.max(barW * pct, 4), height: 7, color: rgb(sr, sg, sb) });
      }

      y -= 22;
    }

    // ── DETAIL DES CRITERES ──
    y -= 8;
    y = drawSectionTitle(y, 'DETAIL DES CRITERES');
    y -= 14;

    const pilierKeys: ('s1' | 's2' | 's3' | 's4' | 's5')[] = ['s1', 's2', 's3', 's4', 's5'];
    const pilierShort = ['1S', '2S', '3S', '4S', '5S'];

    for (let pi = 0; pi < 5; pi++) {
      const key = pilierKeys[pi];
      const pilier = criteres[key];
      const score = pilierScores[pi];

      if (y < 100) {
        page.drawRectangle({ x: 0, y: 0, width: w, height: 30, color: rgb(0.06, 0.09, 0.17) });
        page.drawText('LEONI Qualite IA — Page 2', { x: margin, y: 10, size: 8, font: helvetica, color: rgb(0.5, 0.55, 0.62) });
        page.drawText(`Ref: AUDIT-5S-${audit.id}`, { x: w - margin - 80, y: 10, size: 8, font: helvetica, color: rgb(0.5, 0.55, 0.62) });
        const page2 = pdf.addPage([595.28, 841.89]);
        (page as any).__proto__ === (page2 as any).__proto__;
        y = 810;
      }

      // Pilier header
      const [pr, pg, pb] = PILIER_COLORS[pi];
      page.drawRectangle({ x: margin, y: y - 3, width: contentW, height: 18, color: rgb(pr * 0.12 + 0.88, pg * 0.12 + 0.88, pb * 0.12 + 0.88) });
      page.drawText(`${pilierShort[pi]} — ${pilier.label.replace(/^\dS\s—\s/, '')}  (${score}/20)`, { x: margin + 8, y: y, size: 9, font: helveticaBold, color: rgb(pr * 0.7, pg * 0.7, pb * 0.7) });
      y -= 20;

      for (let ci = 0; ci < pilier.criteria.length; ci++) {
        const crit = pilier.criteria[ci];
        const repKey = `${key}_${ci}`;
        const isChecked = !!reponses[repKey];

        if (y < 60) {
          page.drawRectangle({ x: 0, y: 0, width: w, height: 30, color: rgb(0.06, 0.09, 0.17) });
          page.drawText('LEONI Qualite IA', { x: margin, y: 10, size: 8, font: helvetica, color: rgb(0.5, 0.55, 0.62) });
          const newPage = pdf.addPage([595.28, 841.89]);
          y = 810;
          newPage.drawRectangle({ x: 0, y: y + 10, width: w, height: 30, color: rgb(0.06, 0.09, 0.17) });
          newPage.drawText(`Ref: AUDIT-5S-${audit.id} — Suite`, { x: margin, y: y + 18, size: 8, font: helvetica, color: rgb(0.5, 0.55, 0.62) });
          y -= 10;
        }

        // Checkbox
        const boxX = margin + 10;
        page.drawRectangle({ x: boxX, y: y - 2, width: 10, height: 10, borderColor: isChecked ? rgb(0.13, 0.77, 0.37) : rgb(0.75, 0.77, 0.8), borderWidth: 0.8, color: isChecked ? rgb(0.9, 0.98, 0.93) : rgb(1, 1, 1) });
        if (isChecked) {
          page.drawText('X', { x: boxX + 2, y: y - 1, size: 8, font: helveticaBold, color: rgb(0.13, 0.77, 0.37) });
        }

        // Criterion text
        page.drawText(crit.label, { x: boxX + 16, y: y, size: 8, font: helvetica, color: isChecked ? rgb(0.15, 0.3, 0.15) : rgb(0.4, 0.4, 0.4) });

        // Points
        page.drawText(`${crit.points} pts`, { x: w - margin - 35, y: y, size: 8, font: helveticaBold, color: isChecked ? rgb(0.13, 0.77, 0.37) : rgb(0.7, 0.72, 0.75) });

        y -= 14;
      }
      y -= 4;
    }

    // ── NOTE AGENT ──
    if (audit.commentaireAgent) {
      y -= 8;
      if (y < 120) {
        page.drawRectangle({ x: 0, y: 0, width: w, height: 30, color: rgb(0.06, 0.09, 0.17) });
        page.drawText('LEONI Qualite IA', { x: margin, y: 10, size: 8, font: helvetica, color: rgb(0.5, 0.55, 0.62) });
        const p3 = pdf.addPage([595.28, 841.89]);
        y = 810;
        p3.drawRectangle({ x: 0, y: y + 10, width: w, height: 30, color: rgb(0.06, 0.09, 0.17) });
        y -= 10;
      }
      y = drawSectionTitle(y, 'COMMENTAIRE DE L\'AGENT');
      y -= 10;
      page.drawRectangle({ x: margin, y: y - 60, width: contentW, height: 70, color: rgb(0.97, 0.97, 0.99), borderColor: rgb(0.9, 0.91, 0.93), borderWidth: 0.5 });
      const cLines = this.wrapText(audit.commentaireAgent, 85);
      let ly = y - 12;
      for (const line of cLines.slice(0, 5)) {
        page.drawText(line, { x: margin + 10, y: ly, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.35) });
        ly -= 12;
      }
      y = ly - 15;
    }

    // ── ANALYSE IA ──
    if (audit.analyseIA && audit.analyseIA !== 'Analyse en cours...') {
      y -= 8;
      if (y < 150) {
        page.drawRectangle({ x: 0, y: 0, width: w, height: 30, color: rgb(0.06, 0.09, 0.17) });
        page.drawText('LEONI Qualite IA', { x: margin, y: 10, size: 8, font: helvetica, color: rgb(0.5, 0.55, 0.62) });
        const p4 = pdf.addPage([595.28, 841.89]);
        y = 810;
        y -= 10;
      }
      y = drawSectionTitle(y, 'ANALYSE INTELLIGENCE ARTIFICIELLE');
      y -= 10;

      const aLines = this.wrapText(audit.analyseIA, 85);
      const boxH = Math.min(aLines.length * 13 + 20, 200);
      page.drawRectangle({ x: margin, y: y - boxH + 10, width: contentW, height: boxH, color: rgb(0.935, 0.94, 0.996), borderColor: rgb(0.77, 0.8, 0.93), borderWidth: 0.5 });

      let ly = y - 12;
      for (const line of aLines.slice(0, 14)) {
        page.drawText(line, { x: margin + 10, y: ly, size: 9, font: helvetica, color: rgb(0.25, 0.25, 0.35) });
        ly -= 13;
      }
      y = ly - 15;
    }

    // ── FOOTER on all pages ──
    const pages = pdf.getPages();
    for (const p of pages) {
      const ph = p.getHeight();
      p.drawRectangle({ x: 0, y: 0, width: w, height: 28, color: rgb(0.06, 0.09, 0.17) });
      p.drawText('LEONI Qualite IA — Rapport genere automatiquement', { x: margin, y: 10, size: 7, font: helvetica, color: rgb(0.5, 0.55, 0.62) });
      p.drawText(`Ref: AUDIT-5S-${audit.id}`, { x: w - margin - 80, y: 10, size: 7, font: helvetica, color: rgb(0.5, 0.55, 0.62) });
      const pageNum = pages.indexOf(p) + 1;
      p.drawText(`Page ${pageNum}/${pages.length}`, { x: w / 2 - 15, y: 10, size: 7, font: helvetica, color: rgb(0.5, 0.55, 0.62) });
    }

    return Buffer.from(await pdf.save());
  }

  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if (current.length + word.length + 1 > maxChars) {
        lines.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}

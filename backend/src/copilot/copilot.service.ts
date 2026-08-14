import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mistral } from '@mistralai/mistralai';
import type { ChatCompletionRequestMessage } from '@mistralai/mistralai/models/components';
import {
  LigneControle,
  NoteQualite,
} from '../quality/entities/ligne-controle.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { DailyReport } from '../report/entities/daily-report.entity';

export interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

export interface DayMetrics {
  totalLignes: number;
  txConformite: number;
  minutesArret: number;
}

interface StatsResult {
  total: number;
  vert: number;
  jaune: number;
  rouge: number;
  minutesArret: number;
  txConformite: number;
}

const MISTRAL_MODEL = 'mistral-large-latest';
const MISTRAL_MAX_TOKENS = 1000;
const SUGGESTIONS_PATTERN = /\|\|\|SUGGESTIONS:(\[.*?\])\|\|\|/s;

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);
  private readonly mistral: Mistral;

  constructor(
    @InjectRepository(LigneControle)
    private readonly ligneRepo: Repository<LigneControle>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DailyReport)
    private readonly reportRepo: Repository<DailyReport>,
    private readonly configService: ConfigService,
  ) {
    this.mistral = new Mistral({
      apiKey: this.configService.get<string>('MISTRAL_API_KEY') || '',
    });
  }

  private computeStats(lignes: LigneControle[]): StatsResult {
    const total = lignes.length;
    const vert = lignes.filter((l) => l.note === NoteQualite.VERT).length;
    const jaune = lignes.filter((l) => l.note === NoteQualite.JAUNE).length;
    const rouge = lignes.filter((l) => l.note === NoteQualite.ROUGE).length;
    const minutesArret = lignes.reduce(
      (sum, l) => sum + (parseInt(l.delais, 10) || 0),
      0,
    );
    const txConformite = total > 0 ? Math.round((vert / total) * 1000) / 10 : 0;
    return { total, vert, jaune, rouge, minutesArret, txConformite };
  }

  private formatStats(label: string, stats: StatsResult): string {
    return [
      `=== ${label} ===`,
      `Lignes: ${stats.total} | Vert: ${stats.vert} (${stats.vert}%) | Jaune: ${stats.jaune} | Rouge: ${stats.rouge} | Minutes arret: ${stats.minutesArret} | Tx conformite: ${stats.txConformite}%`,
    ].join('\n');
  }

  private async buildDataContext(superviseurId: string): Promise<string> {
    const agents = await this.userRepo.find({
      where: { superviseurId, role: UserRole.AGENT_QUALITE },
    });

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const start7 = new Date(now);
    start7.setDate(now.getDate() - 7);
    const start30 = new Date(now);
    start30.setDate(now.getDate() - 30);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Lignes des agents du superviseur sur 30 jours (tenant scope)
    const lignes30 = agents.length
      ? await this.ligneRepo
          .createQueryBuilder('ligne')
          .leftJoinAndSelect('ligne.agent', 'agent')
          .leftJoinAndSelect('ligne.controleDate', 'controleDate')
          .where('ligne.created_at >= :start', { start: start30 })
          .andWhere('agent.superviseur_id = :superviseurId', { superviseurId })
          .getMany()
      : [];

    const lignesToday = lignes30.filter((l) => l.createdAt >= startOfToday);
    const lignes7 = lignes30.filter((l) => l.createdAt >= start7);
    const lignesMonth = lignes30.filter((l) => l.createdAt >= startMonth);

    const statsToday = this.computeStats(lignesToday);
    const stats7 = this.computeStats(lignes7);
    const stats30 = this.computeStats(lignes30);
    const statsMonth = this.computeStats(lignesMonth);

    // Performance par agent sur 30 jours
    const perfByAgent = agents
      .map((agent) => {
        const agentLignes = lignes30.filter(
          (l) => l.agent && l.agent.id === agent.id,
        );
        const stats = this.computeStats(agentLignes);
        return {
          nom: `${agent.firstName} ${agent.lastName}`,
          matricule: agent.matricule,
          total: stats.total,
          vert: stats.vert,
          rouge: stats.rouge,
          minutesArret: stats.minutesArret,
          txConformite: stats.txConformite,
        };
      })
      .sort((a, b) => b.txConformite - a.txConformite);

    // Tendance journaliere sur 7 jours
    const trend: {
      date: string;
      total: number;
      vert: number;
      txConformite: number;
    }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayLignes = lignes30.filter(
        (l) => l.createdAt >= dayStart && l.createdAt <= dayEnd,
      );
      const s = this.computeStats(dayLignes);
      trend.push({
        date: dayStart.toISOString().split('T')[0],
        total: s.total,
        vert: s.vert,
        txConformite: s.txConformite,
      });
    }

    // 7 derniers rapports IA du superviseur
    const reports = await this.reportRepo.find({
      where: { superviseur: { id: superviseurId } },
      order: { reportDate: 'DESC' },
      take: 7,
    });

    const lines: string[] = [];
    lines.push(`Agents du superviseur (${agents.length}):`);
    if (agents.length === 0) {
      lines.push('Aucun agent rattache.');
    } else {
      agents.forEach((a) =>
        lines.push(
          `- ${a.firstName} ${a.lastName} (matricule: ${a.matricule})`,
        ),
      );
    }
    lines.push('');
    lines.push(this.formatStats('AUJOURD_HUI', statsToday));
    lines.push(this.formatStats('7 DERNIERS JOURS', stats7));
    lines.push(this.formatStats('30 DERNIERS JOURS', stats30));
    lines.push(this.formatStats('MOIS COURANT', statsMonth));
    lines.push('');
    lines.push('=== PERFORMANCE PAR AGENT (30 JOURS) ===');
    if (perfByAgent.length === 0) {
      lines.push('Aucune donnee.');
    } else {
      perfByAgent.forEach((p) =>
        lines.push(
          `- ${p.nom} (${p.matricule}): ${p.total} lignes, ${p.vert} vertes, ${p.rouge} rouges, ${p.minutesArret} min arret, ${p.txConformite}% conformite`,
        ),
      );
    }
    lines.push('');
    lines.push('=== TENDANCE JOURNALIERE (7 JOURS) ===');
    trend.forEach((t) =>
      lines.push(
        `- ${t.date}: ${t.total} lignes, ${t.vert} vertes, ${t.txConformite}% conformite`,
      ),
    );
    lines.push('');
    lines.push('=== DERNIERS RAPPORTS IA ===');
    if (reports.length === 0) {
      lines.push('Aucun rapport IA genere.');
    } else {
      reports.forEach((r) =>
        lines.push(`- ${r.reportDate} (${r.status}): ${r.summary}`),
      );
    }

    return lines.join('\n');
  }

  private async getDayMetrics(superviseurId: string): Promise<DayMetrics> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const lignes = await this.ligneRepo
      .createQueryBuilder('ligne')
      .leftJoinAndSelect('ligne.agent', 'agent')
      .where('ligne.created_at >= :start', { start: startOfToday })
      .andWhere('agent.superviseur_id = :superviseurId', { superviseurId })
      .getMany();

    const stats = this.computeStats(lignes);
    return {
      totalLignes: stats.total,
      txConformite: stats.txConformite,
      minutesArret: stats.minutesArret,
    };
  }

  private extractSuggestions(raw: string): {
    answer: string;
    suggestedQuestions: string[];
  } {
    let answer = raw.trim();
    let suggestedQuestions: string[] = [];

    const match = raw.match(SUGGESTIONS_PATTERN);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        suggestedQuestions = Array.isArray(parsed)
          ? parsed.map((q) => String(q)).slice(0, 3)
          : [];
      } catch {
        const quoted = match[1].match(/"([^"]*)"/g);
        suggestedQuestions = quoted
          ? quoted.map((q) => q.replace(/"/g, '')).slice(0, 3)
          : [];
      }
      answer = raw.replace(SUGGESTIONS_PATTERN, '').trim();
    }

    if (answer.length > 0 && suggestedQuestions.length === 0) {
      const fallback = [
        'Quelle est la tendance de conformite sur les 7 derniers jours ?',
        'Quel agent a la meilleure performance sur 30 jours ?',
        "Quelles sont les lignes critiques aujourd'hui ?",
      ];
      suggestedQuestions = fallback;
    }

    return { answer, suggestedQuestions };
  }

  async chat(
    superviseurId: string,
    superviseurName: string,
    messages: ChatMessageInput[],
  ): Promise<{
    answer: string;
    suggestedQuestions: string[];
    dataContext: DayMetrics;
  }> {
    if (!messages || messages.length === 0) {
      throw new BadRequestException('Aucun message fourni');
    }

    const dataContext = await this.buildDataContext(superviseurId);
    const dayMetrics = await this.getDayMetrics(superviseurId);

    const systemPrompt = [
      `Tu es le Copilote IA Qualite de LEONI, un assistant expert en gestion de la qualite industrielle pour l'usine.`,
      `Tu accompagnes le superviseur qualite ${superviseurName}.`,
      ``,
      `Voici les donnees temps reel extraites de la base de donnees :`,
      dataContext,
      ``,
      `Consignes :`,
      `- Reponds en francais, de facon concise, claire et professionnelle.`,
      `- Base-toi UNIQUEMENT sur les donnees fournies ci-dessus. N'invente jamais de chiffres.`,
      `- Si une donnee est absente ou vide, indique-le honnetement.`,
      `- Formule tes reponses comme un expert qualite (analyse, cause, action recommandee).`,
      `- Termine TOUJOURS ta reponse par le marqueur exact sur la derniere ligne :`,
      `|||SUGGESTIONS:["question1","question2","question3"]|||`,
      `- Les 3 questions suggerees doivent etre pertinentes par rapport au sujet traite.`,
    ].join('\n');

    const mistralMessages: ChatCompletionRequestMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    let raw = '';
    try {
      const completion = await this.mistral.chat.complete({
        model: MISTRAL_MODEL,
        messages: mistralMessages,
        maxTokens: MISTRAL_MAX_TOKENS,
        temperature: 0.3,
      });
      const content = completion.choices?.[0]?.message?.content;
      raw = Array.isArray(content)
        ? content.map((chunk) => ('text' in chunk ? chunk.text : '')).join('')
        : (content ?? '');
      this.logger.log(`Mistral response received (${raw.length} chars)`);
    } catch (error) {
      this.logger.error(`Mistral API error: ${error.message}`);
      throw new BadRequestException(
        'Le service IA est temporairement indisponible. Veuillez reessayer dans quelques instants.',
      );
    }

    const { answer, suggestedQuestions } = this.extractSuggestions(raw);

    return { answer, suggestedQuestions, dataContext: dayMetrics };
  }
}

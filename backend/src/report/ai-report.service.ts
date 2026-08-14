import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import {
  LigneControle,
  NoteQualite,
} from '../quality/entities/ligne-controle.entity';
import { ControleDate } from '../quality/entities/controle-date.entity';
import { User, UserRole } from '../auth/entities/user.entity';

export interface ReportKPIs {
  totalLignes: number;
  vertCount: number;
  jauneCount: number;
  rougeCount: number;
  vertPercent: number;
  jaunePercent: number;
  rougePercent: number;
  totalMinutes: number;
  agentsActifs: number;
  topAgent: string;
  criticalLignes: { nom: string; agent: string; delais: string }[];
  hourlyBreakdown: { heure: string; count: number }[];
}

export interface GeneratedReport {
  summary: string;
  kpis: ReportKPIs;
  aiAnalysis: string;
  recommendations: string;
}

@Injectable()
export class AiReportService {
  private readonly logger = new Logger(AiReportService.name);

  constructor(
    @InjectRepository(LigneControle)
    private readonly ligneRepo: Repository<LigneControle>,
    @InjectRepository(ControleDate)
    private readonly controleDateRepo: Repository<ControleDate>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async collectKPIs(targetDate: Date): Promise<ReportKPIs> {
    const dateStr = targetDate.toISOString().split('T')[0];

    const todayDate = await this.controleDateRepo.findOne({
      where: { dateControle: dateStr },
    });

    let lignes: LigneControle[] = [];

    if (todayDate) {
      lignes = await this.ligneRepo.find({
        where: { controleDate: { id: todayDate.id } },
        relations: { agent: true, controleDate: true },
      });
    }

    if (lignes.length === 0) {
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      lignes = await this.ligneRepo
        .createQueryBuilder('ligne')
        .leftJoinAndSelect('ligne.agent', 'agent')
        .leftJoinAndSelect('ligne.controleDate', 'controleDate')
        .where('ligne.created_at BETWEEN :start AND :end', {
          start: startOfDay,
          end: endOfDay,
        })
        .getMany();
    }

    const totalLignes = lignes.length;
    const vertCount = lignes.filter((l) => l.note === NoteQualite.VERT).length;
    const jauneCount = lignes.filter(
      (l) => l.note === NoteQualite.JAUNE,
    ).length;
    const rougeCount = lignes.filter(
      (l) => l.note === NoteQualite.ROUGE,
    ).length;

    const vertPercent =
      totalLignes > 0
        ? Math.round((vertCount / totalLignes) * 100 * 100) / 100
        : 0;
    const jaunePercent =
      totalLignes > 0
        ? Math.round((jauneCount / totalLignes) * 100 * 100) / 100
        : 0;
    const rougePercent =
      totalLignes > 0
        ? Math.round((rougeCount / totalLignes) * 100 * 100) / 100
        : 0;

    let totalMinutes = 0;
    lignes.forEach((l) => {
      const min = parseInt(l.delais, 10);
      if (!isNaN(min)) totalMinutes += min;
    });

    const agentMap = new Map<string, { name: string; count: number }>();
    lignes.forEach((l) => {
      if (l.agent) {
        const key = l.agent.id;
        const existing = agentMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          agentMap.set(key, {
            name: `${l.agent.firstName} ${l.agent.lastName}`,
            count: 1,
          });
        }
      }
    });
    let topAgent = 'Aucun';
    let maxCount = 0;
    agentMap.forEach((val) => {
      if (val.count > maxCount) {
        maxCount = val.count;
        topAgent = val.name;
      }
    });

    const criticalLignes = lignes
      .filter((l) => l.note === NoteQualite.ROUGE)
      .map((l) => ({
        nom: l.nomLigne,
        agent: l.agent ? `${l.agent.firstName} ${l.agent.lastName}` : 'N/A',
        delais: l.delais,
      }));

    const hourMap = new Map<string, number>();
    for (let h = 6; h <= 22; h++) {
      hourMap.set(`${h.toString().padStart(2, '0')}:00`, 0);
    }
    lignes.forEach((l) => {
      if (l.heure) {
        const hour = l.heure.substring(0, 2) + ':00';
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      }
    });
    const hourlyBreakdown = Array.from(hourMap.entries())
      .map(([heure, count]) => ({ heure, count }))
      .filter((h) => h.count > 0);

    return {
      totalLignes,
      vertCount,
      jauneCount,
      rougeCount,
      vertPercent,
      jaunePercent,
      rougePercent,
      totalMinutes,
      agentsActifs: agentMap.size,
      topAgent,
      criticalLignes,
      hourlyBreakdown,
    };
  }

  async generateReport(
    targetDate: Date,
    superviseurName: string,
  ): Promise<GeneratedReport> {
    const kpis = await this.collectKPIs(targetDate);
    const dateFormatted = targetDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const summary = this.buildSummary(kpis, dateFormatted);
    const aiAnalysis = this.buildAIAnalysis(kpis, dateFormatted);
    const recommendations = this.buildRecommendations(kpis);

    return { summary, kpis, aiAnalysis, recommendations };
  }

  private buildSummary(kpis: ReportKPIs, dateFormatted: string): string {
    const status = this.getOverallStatus(kpis);
    return `Rapport Qualité du ${dateFormatted} — ${status} | ${kpis.totalLignes} ligne(s) inspectée(s), ${kpis.totalMinutes} min d'arrêt cumulées.`;
  }

  private getOverallStatus(kpis: ReportKPIs): string {
    if (kpis.rougePercent > 30) return 'Situation critique';
    if (kpis.rougePercent > 15) return 'Attention requise';
    if (kpis.vertPercent >= 80) return 'Performance excellente';
    if (kpis.vertPercent >= 60) return 'Performance satisfaisante';
    return 'À améliorer';
  }

  private buildAIAnalysis(kpis: ReportKPIs, dateFormatted: string): string {
    const paragraphs: string[] = [];

    paragraphs.push(
      `Analyse du ${dateFormatted}\n\n` +
        `Ce jour, ${kpis.totalLignes} ligne(s) de controle qualite ont ete enregistrees, reparties entre ${kpis.agentsActifs} agent(s) actif(s). ` +
        `Le volume total d'arret cumule est de ${kpis.totalMinutes} minutes.`,
    );

    paragraphs.push(
      `Repartition des resultats :\n` +
        `- Vert (Conforme) : ${kpis.vertCount} ligne(s) — ${kpis.vertPercent}%\n` +
        `- Jaune (A surveiller) : ${kpis.jauneCount} ligne(s) — ${kpis.jaunePercent}%\n` +
        `- Rouge (Critique) : ${kpis.rougeCount} ligne(s) — ${kpis.rougePercent}%`,
    );

    if (kpis.vertPercent >= 80) {
      paragraphs.push(
        `Performance globale excellente. La conformite depasse le seuil de 80%, ` +
          `ce qui temoigne d'un controle qualite rigoureux et d'une bonne discipline operationnelle.`,
      );
    } else if (kpis.vertPercent >= 60) {
      paragraphs.push(
        `Performance satisfaisante mais des ameliorations sont possibles. ` +
          `Avec ${kpis.vertPercent}% de conformite, l'objectif reste d'atteindre 80% minimum.`,
      );
    } else {
      paragraphs.push(
        `Performance insuffisante. Avec seulement ${kpis.vertPercent}% de conformite, ` +
          `des actions correctives urgentes sont necessaires pour ameliorer la qualite.`,
      );
    }

    if (kpis.rougeCount > 0) {
      paragraphs.push(
        `Points critiques (${kpis.rougeCount}) :\n` +
          kpis.criticalLignes
            .map(
              (l) => `- ${l.nom} — Agent: ${l.agent} — Delai: ${l.delais} min`,
            )
            .join('\n'),
      );
    }

    if (kpis.totalMinutes > 120) {
      paragraphs.push(
        `Le volume d'arret cumule (${kpis.totalMinutes} min) est eleve. ` +
          `Une analyse des causes racines est recommandee pour reduire les temps d'arret.`,
      );
    }

    if (kpis.topAgent !== 'Aucun') {
      paragraphs.push(`Agent le plus actif : ${kpis.topAgent}`);
    }

    if (kpis.hourlyBreakdown.length > 0) {
      const peak = kpis.hourlyBreakdown.reduce((a, b) =>
        a.count > b.count ? a : b,
      );
      paragraphs.push(
        `Pic d'activite detecte a ${peak.heure} avec ${peak.count} controle(s).`,
      );
    }

    return paragraphs.join('\n\n');
  }

  private buildRecommendations(kpis: ReportKPIs): string {
    const recs: string[] = [];

    if (kpis.rougePercent > 30) {
      recs.push(
        '[URGENT] Reunion de crise qualite a planifier dans les plus brefs delais.',
      );
      recs.push(
        "Mettre en place un plan d'action correctif immediat pour chaque ligne rouge.",
      );
    } else if (kpis.rougePercent > 15) {
      recs.push(
        'Analyser les causes racines des points critiques et prioriser les actions correctives.',
      );
    }

    if (kpis.jaunePercent > 25) {
      recs.push(
        'Renforcer la surveillance des lignes a risque (jaune) pour prevenir leur degradation.',
      );
    }

    if (kpis.totalMinutes > 120) {
      recs.push(
        "Optimiser les procedures pour reduire les temps d'arret cumules.",
      );
    }

    if (kpis.agentsActifs < 2 && kpis.totalLignes > 5) {
      recs.push(
        "Considérer le renfort d'equipe pour distribuer la charge de controle.",
      );
    }

    if (kpis.vertPercent >= 80) {
      recs.push(
        '[OK] Excellente performance — Maintenir le niveau actuel et documenter les bonnes pratiques.',
      );
      recs.push(
        "Partager les succes avec toute l'equipe via une communication interne.",
      );
    }

    if (recs.length === 0) {
      recs.push(
        'Continuer le suivi regulier et maintenir la rigueur actuelle.',
      );
    }

    return recs.join('\n');
  }
}

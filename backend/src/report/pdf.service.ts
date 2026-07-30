import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { join } from 'path';
import { existsSync } from 'fs';
import { ReportKPIs } from './ai-report.service';

export interface PdfReportParams {
  superviseurName: string;
  superviseurMatricule?: string;
  dateFormatted: string;
  reference: string;
  ligneName?: string;
  agentName?: string;
  kpis: ReportKPIs;
  aiAnalysis: string;
  recommendations: string;
  summary: string;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  private readonly C = {
    navy: '#0f172a',
    navyLight: '#1e293b',
    slate: '#334155',
    slateMid: '#475569',
    slateLight: '#64748b',
    slateMuted: '#94a3b8',
    slateFaint: '#cbd5e1',
    slateGhost: '#e2e8f0',
    slateWash: '#f1f5f9',
    white: '#ffffff',
    offWhite: '#f8fafc',

    green: '#22c55e',
    greenLight: '#86efac',
    greenBg: '#f0fdf4',
    greenDark: '#16a34a',

    amber: '#f59e0b',
    amberLight: '#fcd34d',
    amberBg: '#fffbeb',
    amberDark: '#d97706',

    red: '#ef4444',
    redLight: '#fca5a5',
    redBg: '#fef2f2',
    redDark: '#dc2626',

    blue: '#3b82f6',
    blueLight: '#93c5fd',
    blueBg: '#eff6ff',
    blueDark: '#2563eb',

    accent: '#6366f1',
    accentBg: '#eef2ff',
  };

  generatePdf(params: PdfReportParams): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        bufferPages: true,
        info: {
          Title: `Rapport Qualite — ${params.dateFormatted}`,
          Author: 'LEONI Qualite IA',
          Subject: 'Rapport quotidien de controle qualite',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 595.28;
      const H = 841.89;
      const ML = 40;
      const MR = 40;
      const CW = W - ML - MR;

      const fiveSPath = join(process.cwd(), 'assets', '5s.jpeg');
      const leoniSvgPath = join(process.cwd(), 'assets', 'leoni-logo.svg');
      const leoniPngPath = join(process.cwd(), 'assets', 'leoni-logo.png');

      let y = this.drawHeader(doc, W, fiveSPath, leoniPngPath, leoniSvgPath);
      y = this.drawMetaBar(doc, W, ML, CW, y, params);
      y = this.drawKpiCards(doc, ML, CW, y, params.kpis);
      y = this.drawDonutSection(doc, ML, CW, y, params.kpis);
      y = this.drawLineChartSection(doc, ML, CW, y, params.kpis);
      y = this.drawAnalysisSection(doc, ML, CW, y, params.aiAnalysis);
      y = this.drawRecommendationsSection(doc, ML, CW, y, params.recommendations);
      this.drawFooter(doc, W, H, params);

      doc.end();
    });
  }

  // ─── HEADER ────────────────────────────────────────────────────────────────
  private drawHeader(doc: PDFKit.PDFDocument, W: number, fiveSPath: string, leoniPng: string, leoniSvg: string): number {
    const C = this.C;
    const ML = 40;
    const MR = 40;
    const h = 60;

    // Soft light header background
    doc.rect(0, 0, W, h).fill(C.offWhite);
    // Bottom accent line
    doc.rect(0, h, W, 2).fill(C.accent);

    // 5S logo (left) — smaller, properly centered vertically
    const logoSize = 36;
    const logoY = (h - logoSize) / 2;
    let fiveSLoaded = false;
    try {
      if (existsSync(fiveSPath)) {
        doc.image(fiveSPath, ML, logoY, { width: logoSize, height: logoSize });
        fiveSLoaded = true;
      }
    } catch {}
    if (!fiveSLoaded) {
      this.drawFiveSBadge(doc, ML, logoY, logoSize);
    }

    // LEONI text (right) — properly sized with enough width
    doc.font('Helvetica-Bold').fontSize(28).fillColor(C.navyLight);
    doc.text('LEONI', W - MR - 130, (h - 30) / 2, { width: 130, align: 'right' });

    // Title (center between logos)
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.navyLight);
    doc.text('RAPPORT QUALITE QUOTIDIEN', ML + logoSize + 15, 12, { width: W - ML - MR - logoSize - 15 - 140, align: 'center' });

    doc.font('Helvetica').fontSize(8).fillColor(C.slateLight);
    doc.text('Systeme de Controle Qualite  |  Intelligence Artificielle', ML + logoSize + 15, 32, { width: W - ML - MR - logoSize - 15 - 140, align: 'center' });

    return h + 10;
  }

  // Draw a 5S circle badge as fallback
  private drawFiveSBadge(doc: PDFKit.PDFDocument, x: number, y: number, size: number) {
    const C = this.C;
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size / 2 - 2;

    const colors = [C.green, '#a855f7', C.blue, C.amber, C.navyLight];
    const arcAngle = (2 * Math.PI) / 5;

    for (let i = 0; i < 5; i++) {
      const startAngle = -Math.PI / 2 + i * arcAngle;
      const endAngle = startAngle + arcAngle;

      doc.save();
      doc.circle(cx, cy, r).clip();
      doc.moveTo(cx, cy);
      (doc as any).arc(cx, cy, r, startAngle, endAngle);
      doc.lineTo(cx, cy);
      doc.fill(colors[i]);
      doc.restore();
    }

    // White inner circle
    doc.circle(cx, cy, r * 0.55).fill(C.white);

    // "5S" text
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.red);
    doc.text('5S', x + size * 0.18, y + size * 0.28, { width: size * 0.65, align: 'center' });
  }

  // ─── META BAR ──────────────────────────────────────────────────────────────
  private drawMetaBar(doc: PDFKit.PDFDocument, W: number, ML: number, CW: number, y: number, params: PdfReportParams): number {
    const C = this.C;
    const barH = 36;

    doc.rect(0, y, W, barH).fill(C.slateWash);
    doc.rect(0, y, W, 0.5).fill(C.slateGhost);

    const colW = CW / 3;

    // Superviseur
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.slateMuted);
    doc.text('SUPERVISEUR', ML, y + 8, { width: colW });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navyLight);
    doc.text(params.superviseurName, ML, y + 20, { width: colW });

    // Date
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.slateMuted);
    doc.text('DATE', ML + colW, y + 8, { width: colW, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor(C.slate);
    doc.text(params.dateFormatted, ML + colW, y + 20, { width: colW, align: 'center' });

    // Reference
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.slateMuted);
    doc.text('REFERENCE', ML + colW * 2, y + 8, { width: colW, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(C.slate);
    doc.text(params.reference, ML + colW * 2, y + 20, { width: colW, align: 'right' });

    return y + barH + 12;
  }

  // ─── KPI CARDS ─────────────────────────────────────────────────────────────
  private drawKpiCards(doc: PDFKit.PDFDocument, ML: number, CW: number, y: number, kpis: ReportKPIs): number {
    const C = this.C;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.slateLight);
    doc.text('INDICATEURS CLES', ML, y);
    y += 14;

    const cards = [
      { label: 'Conformes', value: kpis.vertCount, pct: `${kpis.vertPercent}%`, fg: C.greenDark, bg: C.greenBg, bar: C.green },
      { label: 'A surveiller', value: kpis.jauneCount, pct: `${kpis.jaunePercent}%`, fg: C.amberDark, bg: C.amberBg, bar: C.amber },
      { label: 'Critiques', value: kpis.rougeCount, pct: `${kpis.rougePercent}%`, fg: C.redDark, bg: C.redBg, bar: C.red },
      { label: 'Arrets (min)', value: kpis.totalMinutes, pct: `${kpis.totalLignes} lignes`, fg: C.blueDark, bg: C.blueBg, bar: C.blue },
      { label: 'Agents actifs', value: kpis.agentsActifs, pct: 'participants', fg: C.slate, bg: C.slateWash, bar: C.slateMid },
    ];

    const cardGap = 8;
    const cardW = (CW - cardGap * (cards.length - 1)) / cards.length;
    const cardH = 52;

    cards.forEach((card, i) => {
      const cx = ML + i * (cardW + cardGap);

      // Card bg
      doc.roundedRect(cx, y, cardW, cardH, 5).fill(card.bg);

      // Color dot indicator (left)
      doc.circle(cx + 10, y + 14, 3.5).fill(card.bar);

      // Value
      doc.font('Helvetica-Bold').fontSize(18).fillColor(card.fg);
      doc.text(String(card.value), cx + 18, y + 5, { width: cardW - 24, align: 'left' });

      // Percentage
      doc.font('Helvetica-Bold').fontSize(8).fillColor(card.bar);
      doc.text(card.pct, cx + 18, y + 26, { width: cardW - 24, align: 'left' });

      // Label at bottom
      doc.font('Helvetica').fontSize(6.5).fillColor(C.slateMuted);
      doc.text(card.label.toUpperCase(), cx, y + cardH - 14, { width: cardW, align: 'center' });
    });

    return y + cardH + 14;
  }

  // ─── DONUT CHARTS ──────────────────────────────────────────────────────────
  private drawDonutSection(doc: PDFKit.PDFDocument, ML: number, CW: number, y: number, kpis: ReportKPIs): number {
    const C = this.C;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.slateLight);
    doc.text('REPARTITION QUALITE', ML, y);
    y += 14;

    const donutSize = 90;
    const donutX = ML + 55;
    const donutY = y + donutSize / 2 + 5;

    // Draw donut
    this.drawDonut(doc, donutX, donutY, donutSize / 2, donutSize / 2 * 0.55, [
      { pct: kpis.vertPercent, color: C.green },
      { pct: kpis.jaunePercent, color: C.amber },
      { pct: kpis.rougePercent, color: C.red },
    ]);

    // Center text
    doc.font('Helvetica-Bold').fontSize(18).fillColor(C.navyLight);
    doc.text(`${kpis.totalLignes}`, donutX - 22, donutY - 12, { width: 44, align: 'center' });
    doc.font('Helvetica').fontSize(6).fillColor(C.slateMuted);
    doc.text('total', donutX - 22, donutY + 8, { width: 44, align: 'center' });

    // Legend (right side)
    const legendX = ML + 140;
    const legendItems = [
      { label: 'Conforme (Vert)', pct: `${kpis.vertPercent}%`, count: kpis.vertCount, color: C.green },
      { label: 'A surveiller (Jaune)', pct: `${kpis.jaunePercent}%`, count: kpis.jauneCount, color: C.amber },
      { label: 'Critique (Rouge)', pct: `${kpis.rougePercent}%`, count: kpis.rougeCount, color: C.red },
    ];

    let ly = y + 8;
    legendItems.forEach((item) => {
      doc.circle(legendX, ly + 4, 3).fill(item.color);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.slate);
      doc.text(`${item.pct}`, legendX + 8, ly, { width: 40 });
      doc.font('Helvetica').fontSize(7).fillColor(C.slateMid);
      doc.text(item.label, legendX + 50, ly, { width: 130 });
      doc.font('Helvetica').fontSize(7).fillColor(C.slateMuted);
      doc.text(`${item.count} ligne(s)`, legendX + 185, ly, { width: 60 });
      ly += 18;
    });

    // Status indicator
    const status = kpis.rougePercent > 30 ? 'CRITIQUE' : kpis.rougePercent > 15 ? 'ATTENTION' : kpis.vertPercent >= 80 ? 'EXCELLENT' : 'CORRECT';
    const statusColor = kpis.rougePercent > 30 ? C.redDark : kpis.rougePercent > 15 ? C.amberDark : C.greenDark;
    const statusBg = kpis.rougePercent > 30 ? C.redBg : kpis.rougePercent > 15 ? C.amberBg : C.greenBg;

    doc.roundedRect(legendX + 185, ly - 4, CW - (legendX - ML) - 185, 18, 3).fill(statusBg);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(statusColor);
    doc.text(status, legendX + 185, ly, { width: CW - (legendX - ML) - 185, align: 'center' });

    return y + donutSize + 18;
  }

  private drawDonut(
    doc: PDFKit.PDFDocument,
    cx: number, cy: number,
    outerR: number, innerR: number,
    segments: { pct: number; color: string }[],
  ) {
    const total = segments.reduce((s, seg) => s + seg.pct, 0);
    if (total === 0) return;

    let currentAngle = -Math.PI / 2;
    const gap = 0.02;

    segments.forEach((seg) => {
      if (seg.pct <= 0) return;
      const sweep = (seg.pct / total) * (2 * Math.PI) - gap;
      if (sweep <= 0) return;

      // Outer arc
      doc.save();
      doc.circle(cx, cy, outerR).clip();

      // Draw filled arc using path
      doc.moveTo(
        cx + outerR * Math.cos(currentAngle),
        cy + outerR * Math.sin(currentAngle),
      );
      (doc as any).arc(cx, cy, outerR, currentAngle, currentAngle + sweep, false);
      (doc as any).arc(cx, cy, innerR, currentAngle + sweep, currentAngle, true);
      doc.closePath();
      doc.fill(seg.color);

      doc.restore();
      currentAngle += sweep + gap;
    });
  }

  // ─── BAR CHART (Power BI style) ────────────────────────────────────────────
  private drawLineChartSection(doc: PDFKit.PDFDocument, ML: number, CW: number, y: number, kpis: ReportKPIs): number {
    const C = this.C;

    if (kpis.hourlyBreakdown.length === 0) return y;

    // Section header with subtitle
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.slateLight);
    doc.text('SUIVI D\'ACTIVITE', ML, y);
    doc.font('Helvetica').fontSize(6).fillColor(C.slateMuted);
    doc.text('Nombre de controles par heure', ML + 90, y + 1);
    y += 12;

    // KPI mini-cards row — Power BI style
    const miniCardW = (CW - 16) / 3;
    const miniCards = [
      { label: 'Total controles', value: `${kpis.totalLignes}`, delta: `${kpis.agentsActifs} agents`, color: C.blue, bg: C.blueBg },
      { label: 'Conformite', value: `${kpis.vertPercent}%`, delta: `${kpis.vertCount} lignes`, color: C.greenDark, bg: C.greenBg },
      { label: 'Arrets cumules', value: `${kpis.totalMinutes} min`, delta: `${kpis.rougeCount} rouge`, color: C.amberDark, bg: C.amberBg },
    ];

    miniCards.forEach((card, i) => {
      const cx = ML + i * (miniCardW + 8);
      // Card with soft shadow simulation (double rect)
      doc.roundedRect(cx + 1, y + 1, miniCardW, 30, 5).fill('#f0f0f0');
      doc.roundedRect(cx, y, miniCardW, 30, 5).fill(C.white);
      doc.roundedRect(cx, y, miniCardW, 30, 5).lineWidth(0.3).strokeColor(C.slateGhost);
      // Left color accent
      doc.roundedRect(cx, y, 3, 30, 1.5).fill(card.color);
      // Label
      doc.font('Helvetica').fontSize(6).fillColor(C.slateMuted);
      doc.text(card.label, cx + 10, y + 6, { width: miniCardW - 60 });
      // Value
      doc.font('Helvetica-Bold').fontSize(14).fillColor(C.navyLight);
      doc.text(card.value, cx + 10, y + 15, { width: miniCardW * 0.55 });
      // Delta badge
      doc.roundedRect(cx + miniCardW - 52, y + 16, 44, 11, 3).fill(card.bg);
      doc.font('Helvetica-Bold').fontSize(6).fillColor(card.color);
      doc.text(card.delta, cx + miniCardW - 52, y + 19, { width: 44, align: 'center' });
    });
    y += 38;

    // Chart card
    const chartH = 100;
    const padL = 30;
    const padR = 10;
    const padT = 12;
    const padB = 20;
    const plotW = CW - padL - padR;
    const plotH = chartH - padT - padB;

    // Card with shadow
    doc.roundedRect(ML + 1, y + 1, CW, chartH, 6).fill('#f0f0f0');
    doc.roundedRect(ML, y, CW, chartH, 6).fill(C.white);
    doc.roundedRect(ML, y, CW, chartH, 6).lineWidth(0.3).strokeColor(C.slateGhost);

    const data = kpis.hourlyBreakdown;
    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const barCount = data.length;
    const totalGap = plotW * 0.3;
    const barW = Math.min((plotW - totalGap) / barCount, 22);
    const gap = barCount > 1 ? (plotW - barW * barCount) / (barCount - 1) : 0;
    const startX = ML + padL;

    // Grid lines (dashed effect with dots)
    for (let i = 0; i <= 4; i++) {
      const gy = y + padT + plotH - (plotH * i) / 4;
      // Dotted line effect
      for (let dx = 0; dx < plotW; dx += 6) {
        doc.rect(startX + dx, gy, 3, 0.3).fill(C.slateGhost);
      }
      doc.font('Helvetica').fontSize(5).fillColor(C.slateFaint);
      doc.text(String(Math.round((maxCount * i) / 4)), ML + 2, gy - 3, { width: 24, align: 'right' });
    }

    // Baseline
    doc.rect(startX, y + padT + plotH, plotW, 0.5).fill(C.slateGhost);

    // Bars
    data.forEach((entry, i) => {
      const bx = startX + i * (barW + gap);
      const barH = Math.max((entry.count / maxCount) * plotH, 2);
      const by = y + padT + plotH - barH;

      // Color: gradient from soft to vivid based on value
      const ratio = entry.count / maxCount;
      let barColor: string;
      let barBg: string;
      if (ratio >= 0.7) {
        barColor = C.blue;
        barBg = C.blueBg;
      } else if (ratio >= 0.3) {
        barColor = C.accent;
        barBg = C.accentBg;
      } else {
        barColor = C.blueLight;
        barBg = C.slateWash;
      }

      // Shadow under bar
      doc.roundedRect(bx + 1, by + 2, barW, barH, 3).fill('#e8e8e8');

      // Main bar with rounded top
      doc.roundedRect(bx, by, barW, barH, 3).fill(barBg);
      // Top color accent (rounded top only)
      if (barH > 6) {
        doc.roundedRect(bx, by, barW, 6, 3).fill(barColor);
      }

      // Value on top
      if (entry.count > 0) {
        doc.font('Helvetica-Bold').fontSize(5.5).fillColor(C.navyLight);
        doc.text(String(entry.count), bx, by - 8, { width: barW, align: 'center' });
      }
    });

    // X-axis labels
    const labelEvery = Math.max(Math.ceil(barCount / 10), 1);
    data.forEach((d, i) => {
      if (i % labelEvery === 0 || i === data.length - 1) {
        const lx = startX + i * (barW + gap);
        doc.font('Helvetica').fontSize(4.5).fillColor(C.slateMuted);
        doc.text(d.heure, lx, y + padT + plotH + 4, { width: barW, align: 'center' });
      }
    });

    return y + chartH + 12;
  }

  // ─── ANALYSIS ──────────────────────────────────────────────────────────────
  private drawAnalysisSection(doc: PDFKit.PDFDocument, ML: number, CW: number, y: number, analysis: string): number {
    const C = this.C;

    // Separator
    doc.moveTo(ML, y).lineTo(ML + CW, y).lineWidth(0.5).strokeColor(C.slateGhost).stroke();
    y += 10;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.slateLight);
    doc.text('ANALYSE IA', ML, y);
    y += 14;

    const lines = analysis.split('\n');
    const maxH = 160;
    let drawn = 0;

    for (const line of lines) {
      if (drawn > maxH || y > 740) break;

      if (line === '') {
        y += 5;
        drawn += 5;
        continue;
      }

      if (line.startsWith('- ')) {
        doc.font('Helvetica').fontSize(7.5).fillColor(C.slateMid);
        doc.text('•  ' + line.substring(2), ML + 6, y, { width: CW - 12, lineBreak: false });
      } else {
        doc.font('Helvetica').fontSize(7.5).fillColor(C.slateMid);
        doc.text(line, ML, y, { width: CW, lineBreak: false });
      }

      const h = Math.max(doc.heightOfString(line || ' ', { width: CW }), 10);
      y += h + 2;
      drawn += h + 2;
    }

    return y + 8;
  }

  // ─── RECOMMENDATIONS ───────────────────────────────────────────────────────
  private drawRecommendationsSection(doc: PDFKit.PDFDocument, ML: number, CW: number, y: number, recommendations: string): number {
    const C = this.C;

    doc.moveTo(ML, y).lineTo(ML + CW, y).lineWidth(0.5).strokeColor(C.slateGhost).stroke();
    y += 10;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.slateLight);
    doc.text('RECOMMANDATIONS', ML, y);
    y += 14;

    const lines = recommendations.split('\n');
    const lineH = 12;

    for (const line of lines) {
      if (y + lineH > 750) break;

      if (line.startsWith('[URGENT]')) {
        doc.roundedRect(ML, y - 1, CW, lineH + 2, 3).fill(C.redBg);
        doc.circle(ML + 8, y + lineH / 2, 2.5).fill(C.red);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.redDark);
        doc.text(line, ML + 16, y + 1, { width: CW - 22, lineBreak: false });
      } else if (line.startsWith('[OK]')) {
        doc.roundedRect(ML, y - 1, CW, lineH + 2, 3).fill(C.greenBg);
        doc.circle(ML + 8, y + lineH / 2, 2.5).fill(C.green);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.greenDark);
        doc.text(line, ML + 16, y + 1, { width: CW - 22, lineBreak: false });
      } else {
        doc.font('Helvetica').fontSize(7.5).fillColor(C.slateMid);
        doc.text('•  ' + line, ML + 6, y + 1, { width: CW - 12, lineBreak: false });
      }

      y += lineH + 3;
    }

    return y;
  }

  // ─── FOOTER ────────────────────────────────────────────────────────────────
  private drawFooter(doc: PDFKit.PDFDocument, W: number, H: number, params: PdfReportParams) {
    const C = this.C;
    const footerY = H - 35;

    doc.moveTo(40, footerY).lineTo(W - 40, footerY).lineWidth(0.3).strokeColor(C.slateGhost).stroke();

    doc.font('Helvetica').fontSize(6).fillColor(C.slateMuted);
    doc.text(
      `Rapport genere automatiquement  |  LEONI Qualite IA  |  ${params.reference}  |  ${params.dateFormatted}`,
      40, footerY + 6, { width: W - 80, align: 'center' },
    );

    doc.font('Helvetica').fontSize(5).fillColor(C.slateFaint);
    doc.text('Document confidentiel — Usage interne uniquement', 40, footerY + 16, { width: W - 80, align: 'center' });
  }
}

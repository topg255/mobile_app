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

  // ─── BAR CHART (Power BI professional) ─────────────────────────────────────
  private drawLineChartSection(doc: PDFKit.PDFDocument, ML: number, CW: number, y: number, kpis: ReportKPIs): number {
    const C = this.C;

    if (kpis.hourlyBreakdown.length === 0) return y;

    // ── Section title ──
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.navyLight);
    doc.text('SUIVI D\'ACTIVITE', ML, y);
    doc.font('Helvetica').fontSize(6.5).fillColor(C.slateMuted);
    doc.text('Nombre de controles par heure', ML + 95, y + 1.5);
    y += 14;

    // ── KPI cards ──
    const cardGap = 10;
    const cardW = (CW - cardGap * 2) / 3;

    const kpiData = [
      { label: 'Total controles', value: `${kpis.totalLignes}`, badge: `${kpis.agentsActifs} agent(s)`, accent: '#3b82f6', bg: '#dbeafe', textColor: '#1e40af' },
      { label: 'Conformite', value: `${kpis.vertPercent}%`, badge: `${kpis.vertCount} lignes`, accent: '#22c55e', bg: '#dcfce7', textColor: '#166534' },
      { label: 'Arrets cumules', value: `${kpis.totalMinutes} min`, badge: `${kpis.rougeCount} rouge`, accent: '#f59e0b', bg: '#fef3c7', textColor: '#92400e' },
    ];

    kpiData.forEach((kpi, i) => {
      const cx = ML + i * (cardW + cardGap);

      // Card body — colored background for readability
      doc.roundedRect(cx, y, cardW, 34, 5).fill(kpi.bg);
      doc.roundedRect(cx, y, cardW, 34, 5).lineWidth(0.5).strokeColor(kpi.accent);

      // Label — dark, clear
      doc.font('Helvetica-Bold').fontSize(7).fillColor(kpi.textColor);
      doc.text(kpi.label.toUpperCase(), cx + 10, y + 6, { width: cardW - 70 });

      // Value — large, bold, dark
      doc.font('Helvetica-Bold').fontSize(18).fillColor(kpi.textColor);
      doc.text(kpi.value, cx + 10, y + 16, { width: cardW * 0.55 });

      // Badge pill — solid accent color with white text
      const badgeW = 52;
      doc.roundedRect(cx + cardW - badgeW - 8, y + 17, badgeW, 13, 6).fill(kpi.accent);
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#ffffff');
      doc.text(kpi.badge, cx + cardW - badgeW - 8, y + 20, { width: badgeW, align: 'center' });
    });
    y += 42;

    // ── Chart card ──
    const chartH = 110;
    const padL = 32;
    const padR = 12;
    const padT = 14;
    const padB = 22;
    const plotW = CW - padL - padR;
    const plotH = chartH - padT - padB;

    // Card
    doc.roundedRect(ML, y, CW, chartH, 5).fill(C.white);
    doc.roundedRect(ML, y, CW, chartH, 5).lineWidth(0.4).strokeColor(C.slateGhost);

    const data = kpis.hourlyBreakdown;
    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const barCount = data.length;

    // Bar sizing — ensure bars are visible and well-spaced
    const barW = Math.min(Math.max(plotW / barCount * 0.6, 6), 20);
    const gapW = barCount > 1 ? (plotW - barW * barCount) / (barCount - 1) : 0;
    const offsetX = ML + padL;

    // ── Horizontal grid lines ──
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const gy = y + padT + plotH - (plotH * i) / gridSteps;

      // Solid light line
      doc.rect(offsetX, gy, plotW, 0.4).fill(C.slateGhost);

      // Y-axis value label
      const val = Math.round((maxCount * i) / gridSteps);
      doc.font('Helvetica').fontSize(5.5).fillColor(C.slateMuted);
      doc.text(String(val), ML, gy - 3.5, { width: padL - 4, align: 'right' });
    }

    // ── Baseline ──
    doc.rect(offsetX, y + padT + plotH, plotW, 0.6).fill(C.slateFaint);

    // ── Bars ──
    const barBlue = '#3b82f6';
    const barBlueSoft = '#93c5fd';
    const barBluePale = '#dbeafe';

    data.forEach((entry, i) => {
      const bx = offsetX + i * (barW + gapW);
      const rawH = (entry.count / maxCount) * plotH;
      const barH = Math.max(rawH, entry.count > 0 ? 4 : 0);
      const by = y + padT + plotH - barH;

      if (barH <= 0) return;

      // Bar body — solid blue fill
      doc.roundedRect(bx, by, barW, barH, 2).fill(barBlue);

      // Light inner highlight (top half lighter)
      if (barH > 8) {
        doc.save();
        doc.roundedRect(bx, by, barW, barH, 2).clip();
        doc.rect(bx, by, barW, barH * 0.4).fill(barBlueSoft);
        doc.restore();
      }

      // Value label on top
      doc.font('Helvetica-Bold').fontSize(6).fillColor(C.navyLight);
      doc.text(String(entry.count), bx, by - 9, { width: barW, align: 'center' });
    });

    // ── X-axis labels ──
    const showEvery = barCount <= 12 ? 1 : Math.ceil(barCount / 12);
    data.forEach((d, i) => {
      if (i % showEvery === 0 || i === data.length - 1) {
        const lx = offsetX + i * (barW + gapW);
        doc.font('Helvetica').fontSize(5).fillColor(C.slateMuted);
        doc.text(d.heure, lx - 2, y + padT + plotH + 5, { width: barW + 4, align: 'center' });
      }
    });

    return y + chartH + 10;
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

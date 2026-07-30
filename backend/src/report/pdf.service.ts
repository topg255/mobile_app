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
  kpis: ReportKPIs;
  aiAnalysis: string;
  recommendations: string;
  summary: string;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  private readonly COLORS = {
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
    green: '#16a34a',
    greenSoft: '#dcfce7',
    greenMuted: '#15803d',
    amber: '#d97706',
    amberSoft: '#fef3c7',
    amberMuted: '#b45309',
    red: '#dc2626',
    redSoft: '#fee2e2',
    redMuted: '#b91c1c',
    blue: '#2563eb',
    blueSoft: '#dbeafe',
    blueMuted: '#1d4ed8',
    accent: '#3b82f6',
    accentSoft: '#eff6ff',
  };

  generatePdf(params: PdfReportParams): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        bufferPages: true,
        info: {
          Title: `Rapport Qualite - ${params.dateFormatted}`,
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
      const ML = 45;
      const MR = 45;
      const CW = W - ML - MR;

      const fiveSPath = join(process.cwd(), '..', 'front', 'public', '5s.jpeg');
      const leoniPngPath = join(process.cwd(), '..', 'front', 'public', 'leoni-logo.png');
      const leoniSvgPath = join(process.cwd(), '..', 'front', 'public', 'leoni-logo.svg');

      this.drawHeader(doc, W, fiveSPath, leoniPngPath, leoniSvgPath);
      this.drawSubtitleBar(doc, W, params);
      let y = this.drawKpiSection(doc, ML, CW, params.kpis);
      y = this.drawSeparator(doc, ML, CW, y);
      y = this.drawSummary(doc, ML, CW, y, params.summary);
      y = this.drawSeparator(doc, ML, CW, y);
      y = this.drawAnalysis(doc, ML, CW, y, params.aiAnalysis);
      y = this.drawSeparator(doc, ML, CW, y);
      y = this.drawRecommendations(doc, ML, CW, y, params.recommendations);
      this.drawFooter(doc, W, H, params);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument, W: number, fiveSPath: string, leoniPng: string, leoniSvg: string) {
    const C = this.COLORS;
    const ML = 45;
    const MR = 45;
    const headerH = 68;

    doc.rect(0, 0, W, headerH).fill(C.navy);

    // Subtle gradient overlay line at bottom
    doc.rect(0, headerH - 2, W, 2).fill(C.accent);

    // 5S logo (left)
    try {
      if (existsSync(fiveSPath)) {
        doc.image(fiveSPath, ML, 12, { width: 44, height: 44, fit: [44, 44] });
      }
    } catch {}

    // LEONI logo (right) — try PNG first, then SVG, fallback to text
    try {
      if (existsSync(leoniPng)) {
        doc.image(leoniPng, W - MR - 120, 14, { width: 110, height: 40, fit: [110, 40] });
      } else if (existsSync(leoniSvg)) {
        doc.image(leoniSvg, W - MR - 120, 14, { width: 110, height: 40, fit: [110, 40] });
      } else {
        doc.font('Helvetica-Bold').fontSize(28).fillColor(C.white);
        doc.text('LEONI', W - MR - 120, 18, { width: 120, align: 'right' });
      }
    } catch {
      doc.font('Helvetica-Bold').fontSize(28).fillColor(C.white);
      doc.text('LEONI', W - MR - 120, 18, { width: 120, align: 'right' });
    }

    // Title (center)
    doc.font('Helvetica-Bold').fontSize(15).fillColor(C.white);
    doc.text('RAPPORT QUALITE QUOTIDIEN', ML + 55, 20, { width: W - ML - MR - 230, align: 'center' });

    // Subtitle line
    doc.font('Helvetica').fontSize(9).fillColor(C.slateMuted);
    doc.text('Systeme de Controle Qualite — Intelligence Artificielle', ML + 55, 38, { width: W - ML - MR - 230, align: 'center' });
  }

  private drawSubtitleBar(doc: PDFKit.PDFDocument, W: number, params: PdfReportParams) {
    const C = this.COLORS;
    const barY = 68;
    const barH = 44;

    doc.rect(0, barY, W, barH).fill(C.slateWash);
    doc.rect(0, barY, W, 0.5).fill(C.slateGhost);

    const ML = 45;
    const MR = 45;

    // Left: Supervisor
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.slateLight);
    doc.text('SUPERVISEUR', ML, barY + 10, { width: 160 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.navyLight);
    doc.text(params.superviseurName, ML, barY + 23, { width: 160 });

    // Center: Date
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.slateLight);
    doc.text('DATE DU RAPPORT', ML + 180, barY + 10, { width: 180, align: 'center' });
    doc.font('Helvetica').fontSize(10).fillColor(C.slate);
    doc.text(params.dateFormatted, ML + 180, barY + 23, { width: 180, align: 'center' });

    // Right: Reference
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.slateLight);
    doc.text('REFERENCE', W - MR - 140, barY + 10, { width: 140, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor(C.slate);
    doc.text(params.reference, W - MR - 140, barY + 23, { width: 140, align: 'right' });
  }

  private drawKpiSection(doc: PDFKit.PDFDocument, ML: number, CW: number, kpis: ReportKPIs): number {
    const C = this.COLORS;
    let y = 130;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.slateLight);
    doc.text('INDICATEURS CLES', ML, y);
    y += 18;

    const kpiCards = [
      { label: 'CONFORMES', value: `${kpis.vertCount}`, pct: `${kpis.vertPercent}%`, color: C.green, bg: C.greenSoft, icon: 'v' },
      { label: 'A SURVEILLER', value: `${kpis.jauneCount}`, pct: `${kpis.jaunePercent}%`, color: C.amber, bg: C.amberSoft, icon: 'j' },
      { label: 'CRITIQUES', value: `${kpis.rougeCount}`, pct: `${kpis.rougePercent}%`, color: C.red, bg: C.redSoft, icon: 'r' },
      { label: 'ARRETS (min)', value: `${kpis.totalMinutes}`, pct: `${kpis.totalLignes} lignes`, color: C.blue, bg: C.blueSoft, icon: 'a' },
      { label: 'AGENTS', value: `${kpis.agentsActifs}`, pct: 'actifs', color: C.slate, bg: C.slateWash, icon: 'g' },
    ];

    const cardW = (CW - 4 * 10) / 5;
    const cardH = 58;
    const gap = 10;

    kpiCards.forEach((card, i) => {
      const cx = ML + i * (cardW + gap);

      // Card background with subtle border
      doc.roundedRect(cx, y, cardW, cardH, 4).fill(card.bg);
      doc.roundedRect(cx, y, cardW, cardH, 4).lineWidth(0.3).strokeColor(C.slateGhost);

      // Color accent bar at top
      doc.rect(cx + 8, y + 5, cardW - 16, 2.5).fill(card.color);

      // Value
      doc.font('Helvetica-Bold').fontSize(20).fillColor(card.color);
      doc.text(card.value, cx, y + 14, { width: cardW, align: 'center' });

      // Percentage
      doc.font('Helvetica').fontSize(8).fillColor(card.color);
      doc.text(card.pct, cx, y + 36, { width: cardW, align: 'center' });

      // Label
      doc.font('Helvetica-Bold').fontSize(6).fillColor(C.slateMuted);
      doc.text(card.label, cx, y + 48, { width: cardW, align: 'center' });
    });

    return y + cardH + 15;
  }

  private drawSeparator(doc: PDFKit.PDFDocument, ML: number, CW: number, y: number): number {
    const C = this.COLORS;
    doc.moveTo(ML, y).lineTo(ML + CW, y).lineWidth(0.5).strokeColor(C.slateGhost).stroke();
    return y + 12;
  }

  private drawSummary(doc: PDFKit.PDFDocument, ML: number, CW: number, y: number, summary: string): number {
    const C = this.COLORS;

    // Section label
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.slateLight);
    doc.text('RESUME', ML, y);
    y += 16;

    // Summary card
    const summaryH = doc.heightOfString(summary, { width: CW - 20 }) + 16;
    doc.roundedRect(ML, y, CW, Math.min(summaryH, 60), 4).fill(C.accentSoft);
    doc.roundedRect(ML, y, CW, Math.min(summaryH, 60), 4).lineWidth(0.3).strokeColor(C.slateGhost);

    doc.font('Helvetica').fontSize(9).fillColor(C.slate);
    doc.text(summary, ML + 10, y + 8, { width: CW - 20 });

    return y + Math.min(summaryH, 60) + 12;
  }

  private drawAnalysis(doc: PDFKit.PDFDocument, ML: number, CW: number, y: number, analysis: string): number {
    const C = this.COLORS;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.slateLight);
    doc.text('ANALYSE IA', ML, y);
    y += 16;

    doc.font('Helvetica').fontSize(8).fillColor(C.slateMid);

    const lines = analysis.split('\n');
    const lineHeight = 12;
    const maxH = 200;
    let drawn = 0;

    for (const line of lines) {
      if (drawn > maxH) break;
      if (y + lineHeight > 750) break;

      if (line.startsWith('- ')) {
        doc.font('Helvetica').fontSize(8).fillColor(C.slateMid);
        doc.text('  •  ' + line.substring(2), ML + 5, y, { width: CW - 10, lineBreak: false });
      } else if (line === '') {
        y += 6;
        drawn += 6;
        continue;
      } else {
        doc.font('Helvetica').fontSize(8).fillColor(C.slateMid);
        doc.text(line, ML, y, { width: CW, lineBreak: false });
      }

      const h = doc.heightOfString(line || ' ', { width: CW }) || lineHeight;
      y += Math.max(h, lineHeight);
      drawn += Math.max(h, lineHeight);
    }

    return y + 10;
  }

  private drawRecommendations(doc: PDFKit.PDFDocument, ML: number, CW: number, y: number, recommendations: string): number {
    const C = this.COLORS;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.slateLight);
    doc.text('RECOMMANDATIONS', ML, y);
    y += 16;

    const lines = recommendations.split('\n');
    const lineHeight = 13;

    for (const line of lines) {
      if (y + lineHeight > 750) break;

      if (line.startsWith('[URGENT]')) {
        doc.roundedRect(ML, y - 2, CW, lineHeight + 4, 3).fill(C.redSoft);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.red);
        doc.text(line, ML + 8, y, { width: CW - 16, lineBreak: false });
      } else if (line.startsWith('[OK]')) {
        doc.roundedRect(ML, y - 2, CW, lineHeight + 4, 3).fill(C.greenSoft);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.greenMuted);
        doc.text(line, ML + 8, y, { width: CW - 16, lineBreak: false });
      } else {
        doc.font('Helvetica').fontSize(8).fillColor(C.slateMid);
        doc.text('  •  ' + line, ML + 5, y, { width: CW - 10, lineBreak: false });
      }

      y += lineHeight + 4;
    }

    return y;
  }

  private drawFooter(doc: PDFKit.PDFDocument, W: number, H: number, params: PdfReportParams) {
    const C = this.COLORS;
    const footerY = H - 38;

    doc.moveTo(45, footerY).lineTo(W - 45, footerY).lineWidth(0.3).strokeColor(C.slateGhost).stroke();

    doc.font('Helvetica').fontSize(6.5).fillColor(C.slateMuted);
    doc.text(
      `Rapport genere automatiquement par LEONI Qualite IA  |  ${params.reference}  |  ${params.dateFormatted}`,
      45, footerY + 6,
      { width: W - 90, align: 'center' },
    );

    doc.font('Helvetica').fontSize(5.5).fillColor(C.slateFaint);
    doc.text('Document confidentiel — Usage interne uniquement', 45, footerY + 17, { width: W - 90, align: 'center' });
  }
}

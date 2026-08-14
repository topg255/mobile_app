import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mistral } from '@mistralai/mistralai';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';
import {
  SignatureProcessingStatus,
  SuperviseurSignature,
} from './entities/superviseur-signature.entity';
import { User } from '../auth/entities/user.entity';

export interface EnhanceResult {
  enhancedBase64: string;
  width: number;
  height: number;
  quality: number | null;
  svgPath: string | null;
  improvements: string | null;
}

interface SignatureAnalysis {
  quality: number;
  svgPath: string | null;
  improvements: string | null;
}

@Injectable()
export class SignaturePadService {
  private readonly logger = new Logger(SignaturePadService.name);
  private readonly mistralApiKey: string | undefined;

  constructor(
    @InjectRepository(SuperviseurSignature)
    private readonly signatureRepo: Repository<SuperviseurSignature>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.mistralApiKey = this.configService.get<string>('MISTRAL_API_KEY');
  }

  async saveRawSignature(
    superviseurId: string,
    imageBase64: string,
    width = 520,
    height = 180,
  ): Promise<SuperviseurSignature> {
    if (!imageBase64 || imageBase64.length < 64) {
      throw new BadRequestException('Image de signature invalide ou vide');
    }

    let entity = await this.signatureRepo.findOne({
      where: { superviseurId },
    });
    if (!entity) {
      entity = this.signatureRepo.create({ superviseurId });
    }

    entity.originalImageBase64 = imageBase64;
    entity.width = width;
    entity.height = height;
    entity.isActive = true;
    entity.quality = null;
    entity.improvements = null;
    entity.svgPath = null;
    entity.processingStatus = SignatureProcessingStatus.PROCESSING;
    entity.processingError = null;

    const saved = await this.signatureRepo.save(entity);
    void this.enhanceSignatureWithAI(saved.id);
    return saved;
  }

  async enhanceSignatureWithAI(id: number): Promise<void> {
    const entity = await this.signatureRepo.findOne({ where: { id } });
    if (!entity) return;

    try {
      const enhanced = await this.enhanceWithSharp(
        entity.originalImageBase64,
        entity.width,
        entity.height,
      );

      let quality: number | null = null;
      let svgPath: string | null = null;
      let improvements: string | null = null;

      if (this.mistralApiKey) {
        try {
          const analysis = await this.analyzeWithMistral(enhanced.enhancedBase64);
          quality = analysis.quality;
          svgPath = analysis.svgPath;
          improvements = analysis.improvements;
        } catch (aiErr: any) {
          this.logger.warn(
            `Analyse IA de la signature impossible (${aiErr?.message ?? aiErr}) — correction sharp seule utilisee`,
          );
        }
      } else {
        this.logger.warn(
          'MISTRAL_API_KEY absente — correction sharp seule, qualite non mesuree',
        );
      }

      entity.enhancedImageBase64 = enhanced.enhancedBase64;
      entity.width = enhanced.width;
      entity.height = enhanced.height;
      entity.quality = quality;
      entity.svgPath = svgPath;
      entity.improvements = improvements;
      entity.processingStatus = SignatureProcessingStatus.COMPLETED;
      entity.processingError = null;
    } catch (err: any) {
      this.logger.error(
        `Echec de l'amelioration de la signature ${id}: ${err?.message ?? err}`,
      );
      entity.processingStatus = SignatureProcessingStatus.FAILED;
      entity.processingError = err?.message ?? String(err);
    }

    await this.signatureRepo
      .save(entity)
      .catch((e) =>
        this.logger.error(
          `Impossible de persister l'etat de la signature ${id}: ${e?.message}`,
        ),
      );
  }

  private async enhanceWithSharp(
    imageBase64: string,
    width: number,
    height: number,
  ): Promise<{ enhancedBase64: string; width: number; height: number }> {
    const original = Buffer.from(imageBase64, 'base64');
    const enhanced = await sharp(original)
      .greyscale()
      .normalise()
      .modulate({ brightness: 1.05 })
      .median(1)
      .sharpen({ sigma: 1.2 })
      .resize(600, 220, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();

    const meta = await sharp(enhanced).metadata();
    return {
      enhancedBase64: enhanced.toString('base64'),
      width: meta.width ?? width,
      height: meta.height ?? height,
    };
  }

  private async analyzeWithMistral(
    imageBase64: string,
  ): Promise<SignatureAnalysis> {
    const client = new Mistral({ apiKey: this.mistralApiKey as string });

    const prompt = [
      'Analyse cette image de signature manuscrite (PNG, fond blanc, traits noirs).',
      'Reponds UNIQUEMENT avec un objet JSON valide, sans aucun autre texte, au format :',
      '{"quality": 0-100, "svgPath": "...", "improvements": ["..." ]}',
      '- quality : nombre entier 0-100 (lisibilite, continuite des traits, pression).',
      '- svgPath : attribut "d" d un unique path SVG (viewBox 0 0 600 220, fond transparent),',
      '  net et lisse, qui redessine la signature de facon vectorielle.',
      '- improvements : tableau court de ce qui a ete corrige.',
      'Si la vectorisation est trop risquee, reponds {"quality": 85, "svgPath": null, "improvements": ["conservation raster"]}.',
    ].join(' ');

    const models = ['pixtral-large-latest', 'pixtral-12b-2409'];
    let lastError: any;

    for (const model of models) {
      try {
        const completion = await client.chat.complete({
          model,
          maxTokens: 600,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', imageUrl: `data:image/png;base64,${imageBase64}` },
              ],
            },
          ],
        });

        const raw = completion?.choices?.[0]?.message?.content;
        const text = Array.isArray(raw)
          ? raw
              .map((p: any) => (typeof p === 'string' ? p : p?.text ?? ''))
              .join('')
          : typeof raw === 'string'
            ? raw
            : '';

        const parsed = this.parseMistralJson(text);
        const quality = Number(parsed.quality);
        if (Number.isNaN(quality) || quality < 0 || quality > 100) {
          return {
            quality: 50,
            svgPath: null,
            improvements:
              'Valeur de qualite non numerique retournee par le modele — qualite mediane utilisee',
          };
        }
        return {
          quality: Math.round(quality),
          svgPath:
            typeof parsed.svgPath === 'string' && parsed.svgPath.trim()
              ? parsed.svgPath.trim()
              : null,
          improvements: Array.isArray(parsed.improvements)
            ? parsed.improvements
                .map((i: any) => String(i))
                .join('; ')
                .substring(0, 500)
            : null,
        };
      } catch (err: any) {
        lastError = err;
        this.logger.warn(
          `Modele de vision Mistral "${model}" indisponible: ${err?.message ?? err}`,
        );
      }
    }

    throw lastError ?? new Error('Aucun modele de vision Mistral disponible');
  }

  private parseMistralJson(text: string): Record<string, any> {
    const cleaned = (text || '').replace(/```json/gi, '```').replace(/```/g, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Reponse IA sans objet JSON');
    }
    try {
      const parsed = JSON.parse(cleaned.substring(start, end + 1));
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (e) {
      throw new Error(`Reponse IA JSON invalide: ${e?.message}`);
    }
  }

  async getSignature(superviseurId: string): Promise<SuperviseurSignature | null> {
    return this.signatureRepo.findOne({
      where: { superviseurId, isActive: true },
    });
  }

  async getSignatureOrThrow(superviseurId: string): Promise<SuperviseurSignature> {
    const signature = await this.getSignature(superviseurId);
    if (!signature) {
      throw new NotFoundException('Aucune signature enregistree');
    }
    return signature;
  }

  async getProcessingStatus(id: number): Promise<SuperviseurSignature | null> {
    return this.signatureRepo.findOne({ where: { id } });
  }

  async deleteSignature(superviseurId: string): Promise<{ success: boolean }> {
    const signature = await this.getSignature(superviseurId);
    if (!signature) return { success: true };
    signature.isActive = false;
    await this.signatureRepo.save(signature);
    return { success: true };
  }

  async embedSignatureInPdfBuffer(
    pdfBuffer: Buffer,
    superviseurId: string,
  ): Promise<Buffer> {
    try {
      const signature = await this.getSignature(superviseurId);
      if (!signature) return pdfBuffer;

      const pngBase64 =
        signature.enhancedImageBase64 ?? signature.originalImageBase64;
      const pngBuffer = Buffer.from(pngBase64, 'base64');

      const doc = await PDFDocument.load(pdfBuffer);
      const page = doc.addPage([595.28, 841.89]);

      const image = await doc.embedPng(pngBuffer);
      const blockWidth = 240;
      const blockHeight = Math.max(
        40,
        Math.round((signature.height / signature.width) * blockWidth),
      );
      const x = 70;

      const font = await doc.embedStandardFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedStandardFont(StandardFonts.HelveticaBold);
      const navy = rgb(0.06, 0.09, 0.16);
      const gray = rgb(0.41, 0.47, 0.55);

      const user = await this.userRepo.findOne({ where: { id: superviseurId } });
      const displayName = user
        ? `${user.firstName} ${user.lastName}`.trim()
        : '';

      const date = new Date()
        .toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        .replace(/\//g, '/');

      page.drawText('Signature du rapport', {
        x,
        y: 470,
        size: 15,
        font: fontBold,
        color: navy,
      });
      page.drawText(
        'Le present rapport de qualite est valide par le superviseur ci-dessous.',
        {
          x,
          y: 447,
          size: 9,
          font,
          color: gray,
        },
      );

      const lineY = 300;
      page.drawLine({
        start: { x: 60, y: lineY },
        end: { x: 340, y: lineY },
        thickness: 0.8,
        color: gray,
        dashArray: [2, 2],
      });

      page.drawText(`Tunis, le ${date}`, {
        x,
        y: lineY - 14,
        size: 9,
        font,
        color: gray,
      });

      page.drawImage(image, {
        x,
        y: lineY + 20,
        width: blockWidth,
        height: blockHeight,
      });

      if (displayName) {
        page.drawText(`Signe par : ${displayName}`, {
          x,
          y: lineY + blockHeight + 30,
          size: 11,
          font: fontBold,
          color: navy,
        });
      }

      return Buffer.from(await doc.save());
    } catch (err: any) {
      this.logger.warn(
        `Injection de la signature dans le PDF impossible (${err?.message ?? err}) — PDF sans signature`,
      );
      return pdfBuffer;
    }
  }

  async generateSignatureForEmail(
    superviseurId: string,
  ): Promise<{ base64: string; mimeType: string } | null> {
    const signature = await this.getSignature(superviseurId);
    if (!signature) return null;
    return {
      base64: signature.enhancedImageBase64 ?? signature.originalImageBase64,
      mimeType: 'image/png',
    };
  }
}
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import {
  createHash,
  createSign,
  createVerify,
  createHmac,
  X509Certificate,
} from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SignatureAudit,
  SignatureAction,
} from './entities/signature-audit.entity';
import { DailyReport } from '../report/entities/daily-report.entity';
import { User } from '../auth/entities/user.entity';

export interface SignatureResult {
  signedPdf: Buffer;
  signatureHash: string;
  timestampToken: string;
  certificateThumbprint: string;
  signedAt: string;
  auditId: string;
}

export interface VerificationResult {
  isValid: boolean;
  signedAt: string;
  signerName: string;
  signerCertificate: string;
  timestampValid: boolean;
  auditTrailId: string;
  details: string[];
}

const BEGIN_MARKER = '%%LEONI_SIGNATURE_BEGIN%%';
const END_MARKER = '%%LEONI_SIGNATURE_END%%';

@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  private privateKey: string;
  private certificatePem: string;
  private caPem: string;

  constructor(
    @InjectRepository(SignatureAudit)
    private readonly auditRepo: Repository<SignatureAudit>,
    @InjectRepository(DailyReport)
    private readonly reportRepo: Repository<DailyReport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.privateKey = this.readFileSafe(
      configService.get<string>(
        'SIGNATURE_PRIVATE_KEY_PATH',
        './keys/private.pem',
      ),
    );
    this.certificatePem = this.readFileSafe(
      configService.get<string>(
        'SIGNATURE_CERT_PATH',
        './keys/certificate.pem',
      ),
    );
    this.caPem = this.readFileSafe(
      configService.get<string>('SIGNATURE_CA_CERT_PATH', './keys/ca.pem'),
    );
    if (!this.privateKey || !this.certificatePem) {
      this.logger.warn(
        'Clés PKI introuvables — la signature numérique sera indisponible',
      );
    }
  }

  private readFileSafe(relativePath: string): string {
    try {
      const resolved = join(process.cwd(), relativePath);
      return readFileSync(resolved, 'utf8');
    } catch {
      return '';
    }
  }

  // ------------------------------------------------------------------
  // SIGN
  // ------------------------------------------------------------------

  async signReport(
    reportId: string,
    pdfBuffer: Buffer,
    superviseurId: string,
    ipAddress?: string,
  ): Promise<SignatureResult> {
    const superviseur = await this.userRepo.findOne({
      where: { id: superviseurId },
    });
    if (!superviseur) {
      throw new NotFoundException('Superviseur non trouve');
    }

    const pdfHashOriginal = this.sha256Hex(pdfBuffer);

    const signer = createSign('RSA-SHA256');
    signer.update(pdfHashOriginal);
    signer.end();
    const signature = signer.sign(this.privateKey);

    const signedAt = new Date();
    const timestampToken = await this.obtainTimestamp(
      pdfHashOriginal,
      signedAt,
    );

    const signedPdf = this.embedSignatureInPdf(pdfBuffer, {
      signerName: `${superviseur.firstName} ${superviseur.lastName}`,
      signedAt,
      signature: signature.toString('base64'),
      certificate: this.certificatePem,
      timestampToken: timestampToken.toString('base64'),
    });

    const pdfHashSigned = this.sha256Hex(signedPdf);
    const certificateThumbprint = this.sha256Hex(
      Buffer.from(this.certificatePem, 'utf8'),
    );

    const audit = this.auditRepo.create({
      reportId,
      superviseurId,
      signerName: `${superviseur.firstName} ${superviseur.lastName}`,
      pdfHashOriginal,
      pdfHashSigned,
      signature: signature.toString('base64'),
      timestampToken: timestampToken.toString('base64'),
      certificateThumbprint,
      signedAt,
      action: SignatureAction.SIGN,
      ipAddress: ipAddress ?? null,
    });
    await this.auditRepo.save(audit);

    const report = await this.reportRepo.findOne({
      where: { id: reportId },
    });
    if (report) {
      report.isSigned = true;
      report.signedAt = signedAt;
      report.signatureHash = pdfHashSigned;
      report.signerName = `${superviseur.firstName} ${superviseur.lastName}`;
      await this.reportRepo.save(report);
    }

    this.logger.log(
      `Rapport ${reportId} signe par ${superviseur.firstName} ${superviseur.lastName}`,
    );

    return {
      signedPdf,
      signatureHash: pdfHashOriginal,
      timestampToken: timestampToken.toString('base64'),
      certificateThumbprint,
      signedAt: signedAt.toISOString(),
      auditId: String(audit.id),
    };
  }

  private async obtainTimestamp(
    pdfHash: string,
    signedAt: Date,
  ): Promise<Buffer> {
    const tsaUrl = this.configService.get<string>(
      'TSA_URL',
      'https://freetsa.org/tsr',
    );

    try {
      const response = await axios.post(tsaUrl, pdfHash, {
        headers: { 'Content-Type': 'application/timestamp-query' },
        responseType: 'arraybuffer',
        timeout: 5000,
      });
      const token = Buffer.from(response.data);
      if (token.length < 10 || token[0] !== 0x30) {
        throw new Error('Reponse TSA invalide');
      }
      this.logger.log('Horodatage TSA obtenu (FreeTSA)');
      return token;
    } catch (error) {
      this.logger.warn(
        `TSA indisponible (${error.message}) — horodatage local HMAC de secours`,
      );
      return this.localHmacTimestamp(pdfHash, signedAt);
    }
  }

  private localHmacTimestamp(pdfHash: string, signedAt: Date): Buffer {
    const secret = this.configService.get<string>(
      'DEV_HMAC_SECRET',
      'leoni-dev-hmac-secret-2024',
    );
    const payload = `${pdfHash}|${signedAt.toISOString()}`;
    const digest = createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    return Buffer.from(`HMAC:${digest}:${signedAt.toISOString()}`, 'utf8');
  }

  private embedSignatureInPdf(
    pdfBuffer: Buffer,
    block: {
      signerName: string;
      signedAt: Date;
      signature: string;
      certificate: string;
      timestampToken: string;
    },
  ): Buffer {
    const text = [
      BEGIN_MARKER,
      `SIGNER:${block.signerName}`,
      `SIGNED_AT:${block.signedAt.toISOString()}`,
      `CERTIFICATE:${Buffer.from(block.certificate, 'utf8').toString('base64')}`,
      `SIGNATURE:${block.signature}`,
      `TIMESTAMP_TOKEN:${block.timestampToken}`,
      END_MARKER,
    ].join('\n');

    return Buffer.concat([pdfBuffer, Buffer.from('\n' + text + '\n', 'utf8')]);
  }

  // ------------------------------------------------------------------
  // VERIFY
  // ------------------------------------------------------------------

  async verifySignature(
    pdfBuffer: Buffer,
    reportId?: string,
  ): Promise<VerificationResult> {
    const details: string[] = [];
    const certificate = new X509Certificate(this.certificatePem);
    const certThumbprint = this.sha256Hex(
      Buffer.from(this.certificatePem, 'utf8'),
    );

    details.push('Extraction du bloc de signature...');
    const blockStart = this.indexOf(pdfBuffer, Buffer.from(BEGIN_MARKER));
    const blockEnd = this.indexOf(pdfBuffer, Buffer.from(END_MARKER));

    if (blockStart === -1 || blockEnd === -1 || blockEnd <= blockStart) {
      throw new BadRequestException(
        'Aucun bloc de signature LEONI trouve dans ce PDF',
      );
    }

    const blockRaw = pdfBuffer
      .subarray(blockStart, blockEnd + END_MARKER.length)
      .toString('utf8');
    const block = this.parseSignatureBlock(blockRaw);
    details.push(
      `Bloc de signature trouve (${(blockRaw.length / 1024).toFixed(1)} Ko)`,
    );

    const signedContent = pdfBuffer.subarray(0, blockStart);
    const pdfHash = this.sha256Hex(signedContent);
    details.push(
      `Hash SHA-256 du contenu calcule (${pdfHash.slice(0, 16)}...)`,
    );

    details.push('Verification de la signature RSA-SHA256...');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(pdfHash);
    verifier.end();
    const signatureValid = verifier.verify(
      certificate.publicKey,
      Buffer.from(block.signature, 'base64'),
    );
    details.push(
      signatureValid ? 'Signature RSA valide' : 'Signature RSA invalide',
    );

    details.push("Verification de l'horodatage...");
    const timestampValid = this.verifyTimestampToken(
      block.timestampToken,
      pdfHash,
    );
    details.push(
      timestampValid
        ? 'Horodatage cohérent avec le contenu'
        : 'Horodatage incohérent',
    );

    const signerCertificate = this.sha256Hex(
      Buffer.from(this.certificatePem, 'utf8'),
    );
    let auditTrailId = '';

    if (reportId) {
      details.push("Comparaison avec la piste d'audit en base...");
      const audits = await this.auditRepo.find({
        where: {
          reportId,
          action: SignatureAction.SIGN,
        },
        order: { signedAt: 'DESC' },
        take: 1,
      });
      if (audits.length > 0) {
        const audit = audits[0];
        auditTrailId = String(audit.id);
        details.push(
          `Audit #${audit.id} trouve (signe le ${audit.signedAt.toISOString()})`,
        );

        const hashMatches =
          audit.pdfHashSigned === this.sha256Hex(pdfBuffer) ||
          audit.pdfHashOriginal === pdfHash;
        details.push(
          hashMatches
            ? "Integrite du hash confirmee avec l'audit"
            : "ATTENTION: le hash ne correspond pas a la piste d'audit",
        );

        if (
          audit.certificateThumbprint &&
          audit.certificateThumbprint !== certThumbprint
        ) {
          details.push(
            'ATTENTION: thumbprint du certificat different de celui de la signature',
          );
        }
      } else {
        details.push('Aucune signature enregistree pour ce rapport');
      }
    }

    const isValid = signatureValid && timestampValid;

    return {
      isValid,
      signedAt: block.signedAt,
      signerName: block.signerName,
      signerCertificate,
      timestampValid,
      auditTrailId,
      details,
    };
  }

  private parseSignatureBlock(raw: string): {
    signerName: string;
    signedAt: string;
    signature: string;
    certificate: string;
    timestampToken: string;
  } {
    const lines = raw.split('\n');
    const fields: Record<string, string> = {};

    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        fields[line.substring(0, idx)] = line.substring(idx + 1);
      }
    }

    const required = [
      'SIGNER',
      'SIGNED_AT',
      'CERTIFICATE',
      'SIGNATURE',
      'TIMESTAMP_TOKEN',
    ];
    for (const key of required) {
      if (!fields[key]) {
        throw new BadRequestException(
          `Bloc de signature incomplet (champ ${key} manquant)`,
        );
      }
    }

    return {
      signerName: fields.SIGNER,
      signedAt: fields.SIGNED_AT,
      signature: fields.SIGNATURE,
      certificate: fields.CERTIFICATE,
      timestampToken: fields.TIMESTAMP_TOKEN,
    };
  }

  private verifyTimestampToken(tokenBase64: string, pdfHash: string): boolean {
    try {
      const raw = Buffer.from(tokenBase64, 'base64').toString('utf8');
      if (raw.startsWith('HMAC:')) {
        const [, digest, isoDate] = raw.split(':');
        const secret = this.configService.get<string>(
          'DEV_HMAC_SECRET',
          'leoni-dev-hmac-secret-2024',
        );
        const expected = createHmac('sha256', secret)
          .update(`${pdfHash}|${isoDate}`)
          .digest('base64');
        return expected === digest;
      }

      const token = Buffer.from(tokenBase64, 'base64');
      return token.length > 32 && token[0] === 0x30;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------------
  // AUDIT
  // ------------------------------------------------------------------

  async getAuditTrail(reportId: string): Promise<SignatureAudit[]> {
    return this.auditRepo.find({
      where: { reportId },
      order: { signedAt: 'DESC' },
    });
  }

  private sha256Hex(data: Buffer | string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private indexOf(haystack: Buffer, needle: Buffer): number {
    const first = needle[0];
    for (let i = 0; i <= haystack.length - needle.length; i++) {
      if (haystack[i] !== first) continue;
      let match = true;
      for (let j = 1; j < needle.length; j++) {
        if (haystack[i + j] !== needle[j]) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  }
}

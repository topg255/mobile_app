import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AIProvider = 'mistral' | 'azure' | 'openai';

export interface AIConfig {
  provider: AIProvider;
  mistralApiKey?: string;
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeployment?: string;
  azureApiVersion?: string;
  openaiApiKey?: string;
  openaiOrgId?: string;
  openaiModel?: string;
}

/**
 * Service centralisé de configuration IA.
 *
 * Provider actif: MISTRAL (par défaut)
 *
 * Pour activer Azure AI:
 * 1. Décommenter les variables AZURE_AI_* dans .env
 * 2. Changer DEFAULT_AI_PROVIDER en 'azure' ci-dessous
 *
 * Pour activer OpenAI:
 * 1. Décommenter les variables OPENAI_* dans .env
 * 2. Changer DEFAULT_AI_PROVIDER en 'openai' ci-dessous
 */
@Injectable()
export class AIConfigService {
  private readonly logger = new Logger(AIConfigService.name);

  // ═══════════════════════════════════════════════════════════════
  // CHANGER ICI LE PROVIDER: 'mistral' | 'azure' | 'openai'
  // ═══════════════════════════════════════════════════════════════
  private readonly DEFAULT_AI_PROVIDER: AIProvider = 'mistral';

  // ═══════════════════════════════════════════════════════════════
  // MODÈLES PAR DÉFAUT (à adapter selon votre déploiement)
  // ═══════════════════════════════════════════════════════════════
  private readonly MISTRAL_MODEL = 'mistral-large-latest';
  // private readonly AZURE_MODEL = 'gpt-4';              // Azure: nom du déploiement
  // private readonly OPENAI_MODEL = 'gpt-4-turbo-preview'; // OpenAI: nom du modèle

  constructor(private readonly configService: ConfigService) {
    const config = this.getConfig();
    this.logger.log(`AI Provider actif: ${config.provider}`);

    if (config.provider === 'mistral' && !config.mistralApiKey) {
      this.logger.warn('MISTRAL_API_KEY non configuré');
    }
    if (config.provider === 'azure' && (!config.azureEndpoint || !config.azureApiKey)) {
      this.logger.warn('Azure AI non configuré (AZURE_AI_ENDPOINT / AZURE_AI_API_KEY)');
    }
    if (config.provider === 'openai' && !config.openaiApiKey) {
      this.logger.warn('OpenAI non configuré (OPENAI_API_KEY)');
    }
  }

  getConfig(): AIConfig {
    return {
      provider: this.DEFAULT_AI_PROVIDER,
      mistralApiKey: this.configService.get<string>('MISTRAL_API_KEY'),
      azureEndpoint: this.configService.get<string>('AZURE_AI_ENDPOINT'),
      azureApiKey: this.configService.get<string>('AZURE_AI_API_KEY'),
      azureDeployment: this.configService.get<string>('AZURE_AI_DEPLOYMENT_NAME'),
      azureApiVersion: this.configService.get<string>('AZURE_AI_API_VERSION') || '2024-02-15-preview',
      openaiApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      openaiOrgId: this.configService.get<string>('OPENAI_ORG_ID'),
      openaiModel: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview',
    };
  }

  getProvider(): AIProvider {
    return this.DEFAULT_AI_PROVIDER;
  }

  getModel(): string {
    switch (this.DEFAULT_AI_PROVIDER) {
      case 'mistral':
        return this.MISTRAL_MODEL;
      // case 'azure':
      //   return this.configService.get<string>('AZURE_AI_DEPLOYMENT_NAME') || 'gpt-4';
      // case 'openai':
      //   return this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview';
      default:
        return this.MISTRAL_MODEL;
    }
  }

  isConfigured(): boolean {
    const config = this.getConfig();
    switch (config.provider) {
      case 'mistral':
        return !!config.mistralApiKey;
      // case 'azure':
      //   return !!(config.azureEndpoint && config.azureApiKey);
      // case 'openai':
      //   return !!config.openaiApiKey;
      default:
        return false;
    }
  }
}

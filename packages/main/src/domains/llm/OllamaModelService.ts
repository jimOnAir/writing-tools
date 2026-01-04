import type { ILogger } from '@writing-tools/shared';
import type { Message } from 'ollama';

import type { ISettingsService } from '../settings/ISettingsService';

import type { IOllamaModelService } from './IOllamaModelService';
import type { OllamaChatResponse } from './OllamaClient';
import { OllamaClient } from './OllamaClient';

export class OllamaModelService implements IOllamaModelService {
  private readonly logger: ILogger;
  private readonly settingsService: ISettingsService;

  public constructor(settingsService: ISettingsService, logger: ILogger) {
    this.logger = logger;
    this.settingsService = settingsService;
  }

  public fetchModels = async (): Promise<{ models: string[] } | { error: string }> => {
    const settings = await this.settingsService.loadSettings();
    const client = new OllamaClient({
      host: settings.ollama.address,
      apiKey: settings.ollama.apiKey,
    }, this.logger);

    return client.listModels();
  };

  public sendMessages = async (messages: Message[]): Promise<OllamaChatResponse> => {
    const settings = await this.settingsService.loadSettings();
    const { address, model, apiKey } = settings.ollama;

    if (!model) {
      throw new Error('Model not specified');
    }

    const client = new OllamaClient({
      host: address,
      apiKey,
    }, this.logger);

    return client.chat(model, messages);
  };
}

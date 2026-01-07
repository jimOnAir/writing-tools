import type { ILogger } from '@writing-tools/shared';
import type { Message } from 'ollama';

import type { ISettingsService } from '../settings/ISettingsService';

import type { IOllamaModelService } from './IOllamaModelService';
import type { OllamaChatResponse, OllamaStreamChunk } from './OllamaClient';
import { OllamaClient } from './OllamaClient';

export class OllamaModelService implements IOllamaModelService {
  private readonly logger: ILogger;
  private readonly settingsService: ISettingsService;

  public constructor(settingsService: ISettingsService, logger: ILogger) {
    this.logger = logger;
    this.settingsService = settingsService;
  }

  public fetchModels = async () => {
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

  public sendMessagesStream = async function* (
    this: OllamaModelService,
    messages: Message[],
  ): AsyncGenerator<OllamaStreamChunk, void> {
    const settings = await this.settingsService.loadSettings();
    const { address, model, apiKey } = settings.ollama;

    if (!model) {
      throw new Error('Model not specified');
    }

    const client = new OllamaClient({
      host: address,
      apiKey,
    }, this.logger);

    yield* client.chatStream(model, messages);
  };
}

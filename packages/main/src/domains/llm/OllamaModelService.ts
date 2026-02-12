import type { ILogger } from '@writing-tools/shared';
import type { Message } from 'ollama';

import type { ISettingsService } from '../settings/ISettingsService';

import type { IOllamaModelService } from './IOllamaModelService';
import type { OllamaChatResponse, OllamaStreamChunk } from './OllamaClient';
import { OllamaClient } from './OllamaClient';

export class OllamaModelService implements IOllamaModelService {
  public constructor(
    private readonly settingsService: ISettingsService,
    private readonly logger: ILogger,
  ) {}

  public fetchModels = async () => {
    const settings = await this.settingsService.loadSettings();
    const client = new OllamaClient({
      host: settings.ollama.address,
      apiKey: settings.ollama.apiKey,
    }, this.logger);

    return client.listModels();
  };

  public sendMessages = async (messages: Message[], options?: { maxTokens?: number, model?: string }): Promise<OllamaChatResponse> => {
    const settings = await this.settingsService.loadSettings();
    const { address, model: settingsModel, apiKey } = settings.ollama;
    const model = options?.model ?? settingsModel;
    if (!model) {
      throw new Error('Model not specified');
    }

    const client = new OllamaClient({
      host: address,
      apiKey,
    }, this.logger);

    return client.chat(model, messages, { maxTokens: options?.maxTokens });
  };

  public sendMessagesStream = async function* (
    this: OllamaModelService,
    messages: Message[],
    options?: { model?: string },
  ): AsyncGenerator<OllamaStreamChunk, void> {
    const settings = await this.settingsService.loadSettings();
    const { address, model: settingsModel, apiKey } = settings.ollama;
    const model = options?.model ?? settingsModel;

    if (!model) {
      throw new Error('Model not specified');
    }

    const client = new OllamaClient({
      host: address,
      apiKey,
    }, this.logger);

    yield* client.chatStream(model, messages);
  };

  public getModelContextLength = async (model: string): Promise<number | null> => {
    const settings = await this.settingsService.loadSettings();
    const client = new OllamaClient({
      apiKey: settings.ollama.apiKey,
      host: settings.ollama.address,
    }, this.logger);

    return client.getModelContextLength(model);
  };
}

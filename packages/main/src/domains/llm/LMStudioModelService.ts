import type { ILogger } from '@writing-tools/shared';
import type { Message } from 'ollama';

import type { ISettingsService } from '../settings/ISettingsService';

import type { ILMStudioModelService } from './ILMStudioModelService';
import type { LMStudioChatResponse, LMStudioStreamChunk } from './LMStudioClient';
import { LMStudioClient } from './LMStudioClient';

export class LMStudioModelService implements ILMStudioModelService {
  private readonly logger: ILogger;
  private readonly settingsService: ISettingsService;

  public constructor(settingsService: ISettingsService, logger: ILogger) {
    this.logger = logger;
    this.settingsService = settingsService;
  }

  public fetchModels = async () => {
    const settings = await this.settingsService.loadSettings();
    const client = new LMStudioClient({
      host: settings.lmstudio.address,
      apiKey: settings.lmstudio.apiKey,
    }, this.logger);

    return client.listModels();
  };

  public sendMessages = async (messages: Message[]): Promise<LMStudioChatResponse> => {
    const settings = await this.settingsService.loadSettings();
    const { address, model, apiKey } = settings.lmstudio;

    if (!model) {
      throw new Error('Model not specified');
    }

    const client = new LMStudioClient({
      host: address,
      apiKey,
    }, this.logger);

    // Convert Ollama Message format to LM Studio format (they're compatible)
    const lmStudioMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    return client.chat(model, lmStudioMessages);
  };

  public sendMessagesStream = async function* (
    this: LMStudioModelService,
    messages: Message[],
  ): AsyncGenerator<LMStudioStreamChunk, void> {
    const settings = await this.settingsService.loadSettings();
    const { address, model, apiKey } = settings.lmstudio;

    if (!model) {
      throw new Error('Model not specified');
    }

    const client = new LMStudioClient({
      host: address,
      apiKey,
    }, this.logger);

    // Convert Ollama Message format to LM Studio format (they're compatible)
    const lmStudioMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    yield* client.chatStream(model, lmStudioMessages);
  };
}

import type { ILogger } from '@writing-tools/shared';
import type { Message } from 'ollama';

import type { ISettingsService } from '../settings/ISettingsService';

import type { ILMStudioModelService } from './ILMStudioModelService';
import type { LMStudioChatResponse, LMStudioStreamChunk } from './LMStudioClient';
import { LMStudioClient } from './LMStudioClient';

export class LMStudioModelService implements ILMStudioModelService {
  public constructor(
    private readonly settingsService: ISettingsService,
    private readonly logger: ILogger,
  ) {}

  public fetchModels = async () => {
    const settings = await this.settingsService.loadSettings();
    const client = new LMStudioClient({
      host: settings.lmstudio.address,
      apiKey: settings.lmstudio.apiKey,
    }, this.logger);

    return client.listModels();
  };

  public sendMessages = async (messages: Message[], options?: { maxTokens?: number, model?: string }): Promise<LMStudioChatResponse> => {
    const settings = await this.settingsService.loadSettings();
    const { address, model: settingsModel, apiKey } = settings.lmstudio;
    const model = options?.model ?? settingsModel;
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

    return client.chat(model, lmStudioMessages, { maxTokens: options?.maxTokens });
  };

  public sendMessagesStream = async function* (
    this: LMStudioModelService,
    messages: Message[],
    options?: { model?: string },
    signal?: AbortSignal,
  ): AsyncGenerator<LMStudioStreamChunk, void> {
    const settings = await this.settingsService.loadSettings();
    const { address, model: settingsModel, apiKey } = settings.lmstudio;
    const model = options?.model ?? settingsModel;

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

    yield* client.chatStream(model, lmStudioMessages, signal);
  };
}

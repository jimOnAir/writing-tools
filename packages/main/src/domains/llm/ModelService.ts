import type { Message } from 'ollama';

import type { ISettingsService } from '../settings/ISettingsService';

import type { ILMStudioModelService } from './ILMStudioModelService';
import type { IModelService, LLMChatResponse, LLMStreamChunk } from './IModelService';
import type { IOllamaModelService } from './IOllamaModelService';

// TODO: Rename to LLMService
// TODO: Add Transformer.js support

/**
 * Adapter service that selects the appropriate provider service based on settings
 * Implements IModelService by delegating to provider-specific services
 */
export class ModelService implements IModelService {
  public constructor(
    private readonly settingsService: ISettingsService,
    private readonly ollamaModelService: IOllamaModelService,
    private readonly lmStudioModelService: ILMStudioModelService,
  ) {}

  public fetchModels = async (provider: 'ollama' | 'lmstudio'): Promise<{ models: string[] } | { error: string, models: string[] }> => {
    switch (provider) {
      case 'lmstudio':
        return this.lmStudioModelService.fetchModels();
      case 'ollama':
        return this.ollamaModelService.fetchModels();
      default:
        throw new Error(`Unknown provider: ${provider as string}`);
    }
  };

  public sendMessages = async (messages: Message[], options?: { maxTokens?: number }): Promise<LLMChatResponse> => {
    const provider = await this.getProvider();

    return provider.sendMessages(messages, options);
  };

  public sendMessagesStream = async function* (
    this: ModelService,
    messages: Message[],
    options?: { model?: string, provider?: 'ollama' | 'lmstudio' },
  ): AsyncGenerator<LLMStreamChunk, void> {
    const provider = await this.getProvider(options?.provider);

    yield* provider.sendMessagesStream(messages, options);
  };

  private async getProvider(preferredProvider?: 'ollama' | 'lmstudio') {
    const settings = await this.settingsService.loadSettings();
    const provider = preferredProvider ?? settings.provider;
    switch (provider) {
      case 'lmstudio':
        return this.lmStudioModelService;
      case 'ollama':
        return this.ollamaModelService;
      default:
        throw new Error(`Unknown provider: ${String(provider)}`);
    }
  }
}

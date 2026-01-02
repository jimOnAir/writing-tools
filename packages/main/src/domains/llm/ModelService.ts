import type { Message } from 'ollama';

import type { ISettingsService } from '../settings/ISettingsService';

import type { ILMStudioModelService } from './ILMStudioModelService';
import type { IModelService, LLMChatResponse } from './IModelService';
import type { IOllamaModelService } from './IOllamaModelService';
import { LMStudioModelService } from './LMStudioModelService';
import { OllamaModelService } from './OllamaModelService';

/**
 * Adapter service that selects the appropriate provider service based on settings
 * Implements IModelService by delegating to provider-specific services
 */
export class ModelService implements IModelService {
  private readonly settingsService: ISettingsService;
  private readonly ollamaModelService: IOllamaModelService;
  private readonly lmStudioModelService: ILMStudioModelService;

  public constructor(settingsService: ISettingsService) {
    this.settingsService = settingsService;
    this.ollamaModelService = new OllamaModelService(settingsService);
    this.lmStudioModelService = new LMStudioModelService(settingsService);
  }

  public fetchModels = async (provider: 'ollama' | 'lmstudio'): Promise<{ models: string[] } | { error: string }> => {
    switch (provider) {
      case 'lmstudio':
        return this.lmStudioModelService.fetchModels();
      case 'ollama':
        return this.ollamaModelService.fetchModels();
      default:
        throw new Error(`Unknown provider: ${provider as string}`);
    }
  };

  public sendMessages = async (messages: Message[]): Promise<LLMChatResponse> => {
    const settings = await this.settingsService.loadSettings();
    const provider = settings.provider;

    switch (provider) {
      case 'lmstudio':
        return this.lmStudioModelService.sendMessages(messages);
      case 'ollama':
        return this.ollamaModelService.sendMessages(messages);
      default:
        throw new Error(`Unknown provider: ${String(provider)}`);
    }
  };
}

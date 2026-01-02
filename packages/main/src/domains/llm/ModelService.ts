import type { Message } from 'ollama';

import { SettingsService } from '../settings';

import { LMStudioClient, type LMStudioChatResponse } from './LMStudioClient';
import { OllamaClient, type OllamaChatResponse } from './OllamaClient';

export type LLMChatResponse = OllamaChatResponse | LMStudioChatResponse;

export class ModelService {
  private readonly settingsService: SettingsService;

  public constructor(settingsService: SettingsService = new SettingsService()) {
    this.settingsService = settingsService;
  }

  public async fetchModels(providerOverride: 'ollama' | 'lmstudio'): Promise<{ models: string[] } | { error: string }> {
    const settings = await this.settingsService.loadSettings();
    const provider = providerOverride;

    if (provider === 'lmstudio') {
      const client = new LMStudioClient({
        host: settings.lmstudio.address,
        apiKey: settings.lmstudio.apiKey,
      });

      return client.listModels();
    } else {
      const client = new OllamaClient({
        host: settings.ollama.address,
        apiKey: settings.ollama.apiKey,
      });

      return client.listModels();
    }
  }

  public async sendMessages(messages: Message[]): Promise<LLMChatResponse> {
    const settings = await this.settingsService.loadSettings();
    const provider = settings.provider || 'ollama';

    if (provider === 'lmstudio') {
      const { address, model, apiKey } = settings.lmstudio;

      if (!model) {
        throw new Error('Model not specified');
      }

      const client = new LMStudioClient({
        host: address,
        apiKey,
      });

      // Convert Ollama Message format to LM Studio format (they're compatible)
      const lmStudioMessages = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      return client.chat(model, lmStudioMessages);
    } else {
      const { address, model, apiKey } = settings.ollama;

      if (!model) {
        throw new Error('Model not specified');
      }

      const client = new OllamaClient({
        host: address,
        apiKey,
      });

      return client.chat(model, messages);
    }
  }
}

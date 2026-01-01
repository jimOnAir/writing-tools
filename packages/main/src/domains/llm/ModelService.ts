import type { Message } from 'ollama';

import { SettingsService } from '../settings';

import { OllamaClient, type OllamaChatResponse } from './OllamaClient';

export class ModelService {
  private readonly settingsService: SettingsService;

  public constructor(settingsService: SettingsService = new SettingsService()) {
    this.settingsService = settingsService;
  }

  public async fetchModels(): Promise<{ models: string[] } | { error: string }> {
    const settings = await this.settingsService.loadSettings();
    const client = new OllamaClient({ host: settings.ollama.address });

    return client.listModels();
  }

  public async sendMessages(messages: Message[]): Promise<OllamaChatResponse> {
    const settings = await this.settingsService.loadSettings();
    const { address, model } = settings.ollama;

    if (!model) {
      throw new Error('Model not specified');
    }

    const client = new OllamaClient({ host: address });

    return client.chat(model, messages);
  }
}

import { logger } from '@writing-tools/shared';
import type { Message } from 'ollama';
import { Ollama } from 'ollama';

export interface OllamaClientConfig {
  host: string;
}

export interface OllamaChatResponse {
  response?: string;
  error?: string;
}

export class OllamaClient {
  private readonly config: OllamaClientConfig;

  public constructor(config: OllamaClientConfig) {
    this.config = config;
  }

  public async chat(model: string, messages: Message[]): Promise<OllamaChatResponse> {
    try {
      const ollama = new Ollama({ host: this.config.host });
      const response = await ollama.chat({
        model,
        messages,
        stream: false,
      });

      return { response: response.message.content };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      logger.error('Failed to send Ollama messages: %s', errorMessage);

      return { error: errorMessage };
    }
  }

  public async listModels(): Promise<{ models: string[] } | { error: string }> {
    try {
      const ollama = new Ollama({ host: this.config.host });
      const response = await ollama.list();

      return { models: response.models.map(m => m.name) };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      logger.error('Failed to fetch Ollama models: %s', errorMessage);

      return { error: errorMessage };
    }
  }
}

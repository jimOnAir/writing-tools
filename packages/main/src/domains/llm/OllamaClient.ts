import type { ILogger } from '@writing-tools/shared';
import type { Message } from 'ollama';
import { Ollama } from 'ollama';

export interface OllamaClientConfig {
  apiKey?: string;
  host: string;
}

export type OllamaChatSuccessResponse = {
  response: string,
  success: true,
};

export type OllamaChatFailedResponse = {
  error: string,
  success: false,
};

export type OllamaChatResponse = OllamaChatSuccessResponse | OllamaChatFailedResponse;

export class OllamaClient {
  private readonly config: OllamaClientConfig;
  private readonly logger: ILogger;

  public constructor(config: OllamaClientConfig, logger: ILogger) {
    this.config = config;
    this.logger = logger;
  }

  public async chat(model: string, messages: Message[]): Promise<OllamaChatResponse> {
    try {
      const ollama = new Ollama({ host: this.config.host });
      const response = await ollama.chat({
        model,
        messages,
        stream: false,
      });

      return { response: response.message.content, success: true } as const;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.logger.error('Failed to send Ollama messages: %s', errorMessage);

      return { error: errorMessage, success: false } as const ;
    }
  }

  public async listModels(): Promise<{ models: string[] } | { error: string, models: string[] }> {
    try {
      const ollama = new Ollama({ host: this.config.host });
      const response = await ollama.list();

      return { models: response.models.map(m => m.name) };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.logger.error('Failed to fetch Ollama models: %s', errorMessage);

      return { error: errorMessage, models: [] };
    }
  }
}

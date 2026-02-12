import type { ILogger, IMessageStatistics } from '@writing-tools/shared';
import type { Message } from 'ollama';
import { Ollama } from 'ollama';

export interface OllamaClientConfig {
  apiKey?: string;
  host: string;
}

export type OllamaChatSuccessResponse = {
  response: string,
  success: true,
  statistics?: IMessageStatistics,
};

export type OllamaChatFailedResponse = {
  error: string,
  success: false,
};

export type OllamaChatResponse = OllamaChatSuccessResponse | OllamaChatFailedResponse;

export type OllamaStreamChunk = {
  content: string,
  done: boolean,
  statistics?: IMessageStatistics,
};

export class OllamaClient {
  private readonly config: OllamaClientConfig;
  private readonly logger: ILogger;

  public constructor(config: OllamaClientConfig, logger: ILogger) {
    this.config = config;
    this.logger = logger;
  }

  public async chat(model: string, messages: Message[], options?: { maxTokens?: number }): Promise<OllamaChatResponse> {
    try {
      const ollama = new Ollama({ host: this.config.host });
      const chatOptions: { model: string, messages: Message[], stream: boolean, num_predict?: number } = {
        model,
        messages,
        stream: false,
      };

      if (options?.maxTokens !== undefined) {
        chatOptions.num_predict = options.maxTokens;
      }

      const response = await ollama.chat(chatOptions);

      // Extract statistics from Ollama response
      // The Ollama npm library returns statistics directly on the response object
      const responseWithStats = response as unknown as { total_duration?: number, eval_count?: number, load_duration?: number, prompt_eval_count?: number, prompt_eval_duration?: number, eval_duration?: number };

      const statistics: IMessageStatistics | undefined = responseWithStats.total_duration !== undefined || responseWithStats.eval_count !== undefined
        ? {
          provider: 'ollama',
          model,
          generatedAt: new Date(),
          ollama: {
            totalDuration: responseWithStats.total_duration,
            loadDuration: responseWithStats.load_duration,
            promptEvalCount: responseWithStats.prompt_eval_count,
            promptEvalDuration: responseWithStats.prompt_eval_duration,
            evalCount: responseWithStats.eval_count,
            evalDuration: responseWithStats.eval_duration,
          },
        }
        : undefined;

      // Log statistics extraction for debugging
      if (statistics !== undefined) {
        this.logger.debug('Extracted statistics from Ollama response: %j', statistics);
      } else {
        this.logger.debug('No statistics found in Ollama response');
      }

      return {
        response: response.message.content.trimEnd(),
        success: true,
        statistics,
      } as const;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.logger.error('Failed to send Ollama messages: %s', errorMessage);

      return { error: errorMessage, success: false } as const ;
    }
  }

  /**
   * Stream chat responses from Ollama
   * Yields chunks of content as they arrive from the model
   */
  public async *chatStream(model: string, messages: Message[]): AsyncGenerator<OllamaStreamChunk, void> {
    try {
      const ollama = new Ollama({ host: this.config.host });
      const response = await ollama.chat({
        model,
        messages,
        stream: true,
      });

      let statistics: IMessageStatistics | undefined;

      for await (const part of response) {
        // Extract statistics from the final chunk (when done is true)
        if (part.done) {
          const partWithStats = part as unknown as { total_duration?: number, eval_count?: number, load_duration?: number, prompt_eval_count?: number, prompt_eval_duration?: number, eval_duration?: number };
          if (partWithStats.total_duration !== undefined || partWithStats.eval_count !== undefined) {
            statistics = {
              provider: 'ollama',
              model,
              generatedAt: new Date(),
              ollama: {
                totalDuration: partWithStats.total_duration,
                loadDuration: partWithStats.load_duration,
                promptEvalCount: partWithStats.prompt_eval_count,
                promptEvalDuration: partWithStats.prompt_eval_duration,
                evalCount: partWithStats.eval_count,
                evalDuration: partWithStats.eval_duration,
              },
            };
          }
        }

        yield {
          content: part.message.content,
          done: part.done,
          statistics: part.done ? statistics : undefined,
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.logger.error('Failed to stream Ollama messages: %s', errorMessage);

      throw error;
    }
  }

  /**
   * Get the context length (num_ctx) for a model via the show API.
   * Returns null on error or when the value cannot be parsed.
   */
  public async getModelContextLength(model: string): Promise<number | null> {
    if (model.trim() === '') {
      return null;
    }
    try {
      const ollama = new Ollama({ host: this.config.host });
      const response = await ollama.show({ model });
      const withParams = response as unknown as { parameters?: string };
      const parameters = withParams.parameters;
      if (typeof parameters !== 'string') {
        return null;
      }
      const match = /num_ctx\s+(\d+)/.exec(parameters);
      if (match === null) {
        return null;
      }
      const value = Number.parseInt(match[1], 10);
      return Number.isNaN(value) || value <= 0 ? null : value;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.logger.debug('Failed to get Ollama model context length for %s: %s', model, errorMessage);

      return null;
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

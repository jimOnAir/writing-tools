import type { ILogger, IMessageStatistics } from '@writing-tools/shared';

export interface LMStudioClientConfig {
  apiKey?: string;
  host: string;
}

export type LMStudioChatSuccessResponse = {
  response: string,
  success: true,
  statistics?: IMessageStatistics,
};

export type LMStudioChatFailedResponse = {
  error: string,
  success: false,
};

export type LMStudioChatResponse = LMStudioChatSuccessResponse | LMStudioChatFailedResponse;

export type LMStudioStreamChunk = {
  content: string,
  done: boolean,
  statistics?: IMessageStatistics,
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LMStudioChatRequest {
  max_tokens?: number;
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  stream_options?: { include_usage?: boolean };
}

interface LMStudioStreamChunkData {
  choices: Array<{
    delta: {
      content?: string,
    },
    finish_reason: string | null,
  }>;
  model?: string;
  /**
   * LM Studio native format (input_tokens, total_output_tokens)
   * Used when usage is not provided (e.g. older LM Studio or different response structure)
   */
  stats?: {
    input_tokens?: number,
    total_output_tokens?: number,
  };
  usage?: {
    completion_tokens?: number,
    prompt_tokens?: number,
    total_tokens?: number,
  };
}

interface LMStudioChatResponseBody {
  choices: Array<{
    message: {
      content: string,
    },
  }>;
  model?: string;
  /**
   * LM Studio native format - fallback when usage is not provided
   */
  stats?: {
    input_tokens?: number,
    total_output_tokens?: number,
  };
  usage?: {
    completion_tokens?: number,
    prompt_tokens?: number,
    total_tokens?: number,
  };
}

interface LMStudioModelsResponse {
  data: Array<{
    id: string,
  }>;
}

function extractStatistics(
  data: { model?: string, stats?: { input_tokens?: number, total_output_tokens?: number }, usage?: { completion_tokens?: number, prompt_tokens?: number, total_tokens?: number } },
): IMessageStatistics | undefined {
  const promptTokens = data.usage?.prompt_tokens ?? data.stats?.input_tokens;
  const completionTokens = data.usage?.completion_tokens ?? data.stats?.total_output_tokens;
  const totalTokens = data.usage?.total_tokens ?? (promptTokens !== undefined && completionTokens !== undefined ? promptTokens + completionTokens : undefined);
  const hasTokens = promptTokens !== undefined || completionTokens !== undefined || totalTokens !== undefined;

  if (!hasTokens) {
    return undefined;
  }

  return {
    generatedAt: new Date(),
    lmstudio: {
      completionTokens,
      promptTokens,
      totalTokens,
    },
    model: data.model,
    provider: 'lmstudio',
  };
}

export class LMStudioClient {
  private readonly config: LMStudioClientConfig;
  private readonly logger: ILogger;

  public constructor(config: LMStudioClientConfig, logger: ILogger) {
    this.config = config;
    this.logger = logger;
  }

  public async chat(model: string, messages: ChatMessage[], options?: { maxTokens?: number }): Promise<LMStudioChatResponse> {
    try {
      const url = `${this.config.host}/v1/chat/completions`;
      const requestBody: LMStudioChatRequest = {
        model,
        messages,
        stream: false,
      };

      if (options?.maxTokens !== undefined) {
        requestBody.max_tokens = options.maxTokens;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${String(response.status)}: ${errorText}`);
      }

      const data = await response.json() as LMStudioChatResponseBody;

      if (data.choices.length === 0) {
        throw new Error('No response from LM Studio');
      }

      const statistics = extractStatistics(data);

      return {
        response: data.choices[0].message.content.trimEnd(),
        success: true,
        statistics,
      } as const;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.logger.error('Failed to send LM Studio messages: %s', errorMessage);

      return { error: errorMessage, success: false } as const;
    }
  }

  /**
   * Stream chat responses from LM Studio
   * Yields chunks of content as they arrive from the model
   * Uses OpenAI-compatible SSE format
   */
  public async *chatStream(model: string, messages: ChatMessage[]): AsyncGenerator<LMStudioStreamChunk, void> {
    try {
      const url = `${this.config.host}/v1/chat/completions`;
      const requestBody: LMStudioChatRequest = {
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${String(response.status)}: ${errorText}`);
      }

      if (response.body === null) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let statistics: IMessageStatistics | undefined;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE format: "data: {...}\n\n"
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (trimmedLine === '') {
            continue;
          }

          if (trimmedLine === 'data: [DONE]') {
            yield { content: '', done: true, statistics };

            return;
          }

          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.slice(6);

            try {
              const data = JSON.parse(jsonStr) as LMStudioStreamChunkData;

              // Handle usage-only chunk (stream_options.include_usage sends final chunk with empty choices)
              if (data.choices.length === 0) {
                const extracted = extractStatistics(data);
                if (extracted !== undefined) {
                  statistics = extracted;
                }
                continue;
              }

              if (data.choices.length > 0) {
                const choice = data.choices[0];
                const content = choice.delta.content ?? '';
                const isDone = choice.finish_reason !== null;

                // Extract statistics from the final chunk (usage or stats may be present)
                if (isDone) {
                  const extracted = extractStatistics(data);
                  if (extracted !== undefined) {
                    statistics = extracted;
                  }
                }

                yield { content, done: isDone, statistics: isDone ? statistics : undefined };
              }
            } catch {
              // Skip invalid JSON lines
              this.logger.warn('Failed to parse SSE chunk: %s', jsonStr);
            }
          }
        }
      }

      // Handle any remaining buffer content (e.g. stream ended without [DONE])
      if (buffer.trim() !== '' && buffer.trim() !== 'data: [DONE]') {
        if (buffer.trim().startsWith('data: ')) {
          const jsonStr = buffer.trim().slice(6);

          try {
            const data = JSON.parse(jsonStr) as LMStudioStreamChunkData;

            if (data.choices.length === 0) {
              const extracted = extractStatistics(data);
              if (extracted !== undefined) {
                statistics = extracted;
              }
              yield { content: '', done: true, statistics };
            } else {
              const choice = data.choices[0];
              const content = choice.delta.content ?? '';
              const isDone = choice.finish_reason !== null;

              if (isDone) {
                const extracted = extractStatistics(data);
                if (extracted !== undefined) {
                  statistics = extracted;
                }
              }

              yield { content, done: true, statistics };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.logger.error('Failed to stream LM Studio messages: %s', errorMessage);

      throw error;
    }
  }

  public async listModels(): Promise<{ models: string[] } | { error: string, models: string[] }> {
    try {
      const url = `${this.config.host}/v1/models`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${String(response.status)}: ${errorText}`);
      }

      const data = await response.json() as LMStudioModelsResponse;

      return { models: data.data.map(m => m.id) };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.logger.error('Failed to fetch LM Studio models: %s', errorMessage);

      return { error: errorMessage, models: [] };
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }
}

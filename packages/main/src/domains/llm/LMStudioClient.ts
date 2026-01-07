import type { ILogger } from '@writing-tools/shared';

export interface LMStudioClientConfig {
  apiKey?: string;
  host: string;
}

export type LMStudioChatSuccessResponse = {
  response: string,
  success: true,
};

export type LMStudioChatFailedResponse = {
  error: string,
  success: false,
};

export type LMStudioChatResponse = LMStudioChatSuccessResponse | LMStudioChatFailedResponse;

export type LMStudioStreamChunk = {
  content: string,
  done: boolean,
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
}

interface LMStudioStreamChunkData {
  choices: Array<{
    delta: {
      content?: string,
    },
    finish_reason: string | null,
  }>;
}

interface LMStudioChatResponseBody {
  choices: Array<{
    message: {
      content: string,
    },
  }>;
}

interface LMStudioModelsResponse {
  data: Array<{
    id: string,
  }>;
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

      return { response: data.choices[0].message.content, success: true } as const;
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
            yield { content: '', done: true };

            return;
          }

          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.slice(6);

            try {
              const data = JSON.parse(jsonStr) as LMStudioStreamChunkData;

              if (data.choices.length > 0) {
                const choice = data.choices[0];
                const content = choice.delta.content ?? '';
                const isDone = choice.finish_reason !== null;

                yield { content, done: isDone };
              }
            } catch {
              // Skip invalid JSON lines
              this.logger.warn('Failed to parse SSE chunk: %s', jsonStr);
            }
          }
        }
      }

      // Handle any remaining buffer content
      if (buffer.trim() !== '' && buffer.trim() !== 'data: [DONE]') {
        if (buffer.trim().startsWith('data: ')) {
          const jsonStr = buffer.trim().slice(6);

          try {
            const data = JSON.parse(jsonStr) as LMStudioStreamChunkData;

            if (data.choices.length > 0) {
              const choice = data.choices[0];
              const content = choice.delta.content ?? '';
              yield { content, done: true };
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

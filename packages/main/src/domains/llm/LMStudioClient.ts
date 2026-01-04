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

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LMStudioChatRequest {
  model: string;
  messages: ChatMessage[];
  stream: false;
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

  public async chat(model: string, messages: ChatMessage[]): Promise<LMStudioChatResponse> {
    try {
      const url = `${this.config.host}/v1/chat/completions`;
      const requestBody: LMStudioChatRequest = {
        model,
        messages,
        stream: false,
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

import type { IMessageStatistics } from '@writing-tools/shared';

export interface ILlmStreamingParams {
  chatId: number;
  mainWindow: Electron.BrowserWindow;
  messages: Array<{ content: string, role: 'assistant' | 'user' }>;
  override?: { model?: string, provider?: 'ollama' | 'lmstudio' };
  signal?: AbortSignal;
}

export interface ILlmStreamingResult {
  fullContent: string;
  statistics?: IMessageStatistics;
}

export interface ILlmStreamingService {
  streamToWindow: (params: ILlmStreamingParams) => Promise<ILlmStreamingResult>;
}

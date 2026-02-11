import type { IChatMessage } from '@writing-tools/shared';

export interface IFollowUpQuestionsGenerateOptions {
  readonly model?: string;
  readonly provider?: 'ollama' | 'lmstudio';
}

export interface IFollowUpQuestionsService {
  generate: (messages: IChatMessage[], chatId?: number | null, messageId?: number | null, options?: IFollowUpQuestionsGenerateOptions) => Promise<string[]>;
}

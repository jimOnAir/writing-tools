import type { IChatMessage } from '@writing-tools/shared';

export interface IFollowUpQuestionsService {
  generate: (messages: IChatMessage[], chatId?: number | null) => Promise<string[]>;
}

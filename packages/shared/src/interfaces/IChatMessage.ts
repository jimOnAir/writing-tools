import type { IMessageStatistics } from './IMessageStatistics';

export interface IChatMessage { // TODO: add message type: request, response. Add respondTo relation
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /**
   * Statistics about message generation (only present for assistant messages from LLM)
   */
  statistics?: IMessageStatistics;
}

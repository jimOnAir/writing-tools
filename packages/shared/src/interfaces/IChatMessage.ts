import type { IMessageStatistics } from './IMessageStatistics';

export interface IChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /**
   * Statistics about message generation (only present for assistant messages from LLM)
   */
  statistics?: IMessageStatistics;
}

import type { EStreamingErrorType } from '../enum/EStreamingErrorType';
import type { IMessageStatistics } from './IMessageStatistics';

export interface IChatMessage { // TODO: add message type: request, response. Add respondTo relation
  content: string;
  /**
   * Error type when content represents a streaming error (only for assistant error messages)
   */
  errorType?: EStreamingErrorType;
  id: string;
  role: 'user' | 'assistant';
  /**
   * Statistics about message generation (only present for assistant messages from LLM)
   */
  statistics?: IMessageStatistics;
  timestamp: Date;
}

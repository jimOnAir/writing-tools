import type { IMessageStatistics } from './IMessageStatistics';

/**
 * Represents a chunk of streaming chat content
 * Sent via CHAT_STREAM_CHUNK IPC event during streaming responses
 */
export interface IChatStreamChunk {
  /** The chat ID this chunk belongs to */
  chatId: number;
  /** The content of this chunk (token/partial text) */
  content: string;
  /** Whether this is the final chunk in the stream */
  done: boolean;
  /** Statistics about message generation (only present in final chunk) */
  statistics?: IMessageStatistics;
}

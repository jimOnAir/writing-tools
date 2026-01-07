/**
 * Represents the end of a streaming chat response
 * Sent via CHAT_STREAM_END IPC event when streaming completes
 */
export interface IChatStreamEnd {
  /** The chat ID this stream belongs to */
  chatId: number;
  /** The complete message content (for verification/saving) */
  fullContent: string;
  /** Error message if the stream failed */
  error?: string;
}

import type { IChatInfo } from '@writing-tools/shared/src/interfaces/IChatInfo';
import type { IChatMessage } from '@writing-tools/shared/src/interfaces/IChatMessage';

/**
 * Interface for chat service operations
 * High-level business logic for chat management
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface IChatService {
  /**
   * Initialize the chat service (and underlying repository)
   */
  initialize: () => Promise<void>;

  /**
   * Start a new chat session
   */
  startNewChat: (title: string, provider: string, model: string) => number;

  /**
   * Save a message to a chat
   */
  saveMessage: (chatId: number, message: IChatMessage) => void;

  /**
   * Load messages for a specific chat
   */
  loadChatMessages: (chatId: number) => IChatMessage[];

  /**
   * Get all chat sessions
   */
  getAllChats: () => IChatInfo[];

  /**
   * Close the chat service (cleanup resources)
   */
  close: () => void;
}

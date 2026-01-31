import type { IChatInfo } from '@writing-tools/shared/src/interfaces/IChatInfo';

/**
 * Interface for chat service operations
 * High-level business logic for chat management
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface IChatService {
  /**
   * Start a new chat session
   */
  startNewChat: (title: string, provider: string, model: string) => number;

  /**
   * Get all chat sessions
   */
  getAllChats: () => IChatInfo[];

  /**
   * Get a single chat session by ID
   */
  getChat: (chatId: number) => IChatInfo | null;

  /**
   * Update the title of a chat
   */
  updateChatTitle: (chatId: number, title: string) => void;

  /**
   * Update the model and provider of a chat (for last-used model persistence)
   */
  updateChatModel: (chatId: number, model: string, provider: string) => void;

  /**
   * Delete a chat permanently (hard delete)
   * All associated messages are automatically deleted via CASCADE foreign key constraint
   */
  deleteChat: (chatId: number) => void;
}

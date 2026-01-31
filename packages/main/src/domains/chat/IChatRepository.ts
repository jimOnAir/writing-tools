import type { IChatInfo } from '@writing-tools/shared/src/interfaces/IChatInfo';

/**
 * Interface for chat repository operations
 * Segregated by read and write concerns following Interface Segregation Principle
 */
export interface IChatRepository {
  /**
   * Create a new chat session
   */
  createChat: (title: string, provider: string, model: string) => number;

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

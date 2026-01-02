import type { IChatInfo } from '@writing-tools/shared/src/interfaces/IChatInfo';
import type { IChatMessage } from '@writing-tools/shared/src/interfaces/IChatMessage';

/**
 * Interface for chat repository operations
 * Segregated by read and write concerns following Interface Segregation Principle
 */
export interface IChatRepository {
  /**
   * Initialize the repository (database connection, schema creation)
   */
  initialize: () => Promise<void>;

  /**
   * Create a new chat session
   */
  createChat: (title: string, provider: string, model: string) => number;

  /**
   * Save a message to a chat
   */
  saveMessage: (chatId: number, message: IChatMessage) => void;

  /**
   * Get all messages for a specific chat
   */
  getChatMessages: (chatId: number) => IChatMessage[];

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
   * Delete a chat permanently (hard delete)
   * All associated messages are automatically deleted via CASCADE foreign key constraint
   */
  deleteChat: (chatId: number) => void;

  /**
   * Close the repository (cleanup resources)
   */
  close: () => void;
}

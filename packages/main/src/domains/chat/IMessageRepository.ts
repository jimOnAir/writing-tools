import type { IChatMessage } from '@writing-tools/shared';

/**
 * Interface for message repository operations
 * Segregated by read and write concerns following Interface Segregation Principle
 */
export interface IMessageRepository {

  /**
   * Save a message to a chat
   */
  saveMessage: (chatId: number, message: IChatMessage) => void;

  /**
   * Get all messages for a specific chat
   */
  getChatMessages: (chatId: number) => IChatMessage[];
}

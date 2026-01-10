import type { IChatMessage } from '@writing-tools/shared';

export interface IMessageService {

  /**
     * Save a message to a chat
     */
  saveMessage: (chatId: number, message: IChatMessage) => void;

  /**
     * Load messages for a specific chat
     */
  loadChatMessages: (chatId: number) => IChatMessage[];
}

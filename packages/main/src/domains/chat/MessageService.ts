import type { IChatMessage } from '@writing-tools/shared';

import type { IMessageRepository } from './IMessageRepository';
import type { IMessageService } from './IMessageService';

export class MessageService implements IMessageService {
  public constructor(
    private readonly messageRepository: IMessageRepository,
  ) {}

  public saveMessage(chatId: number, message: IChatMessage): void {
    this.messageRepository.saveMessage(chatId, message);
  }

  public loadChatMessages(chatId: number): IChatMessage[] {
    return this.messageRepository.getChatMessages(chatId);
  }
}

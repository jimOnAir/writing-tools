import type { IChatInfo } from '@writing-tools/shared';

import type { IChatRepository } from './IChatRepository';
import type { IChatService } from './IChatService';

export class ChatService implements IChatService {
  public constructor(
    private readonly chatRepository: IChatRepository,
  ) {}

  public startNewChat(title: string, provider: string, model: string): number {
    const chatId = this.chatRepository.createChat(title, provider, model);

    return chatId;
  }

  public getAllChats(): IChatInfo[] {
    return this.chatRepository.getAllChats();
  }

  public getChatsPaginated(limit: number, offset: number): { chats: IChatInfo[], hasMore: boolean } {
    return this.chatRepository.getChatsPaginated(limit, offset);
  }

  public getChat(chatId: number): IChatInfo | null {
    return this.chatRepository.getChat(chatId);
  }

  public updateChatTitle(chatId: number, title: string): void {
    this.chatRepository.updateChatTitle(chatId, title);
  }

  public updateChatModel(chatId: number, model: string, provider: string): void {
    this.chatRepository.updateChatModel(chatId, model, provider);
  }

  public deleteChat(chatId: number): void {
    this.chatRepository.deleteChat(chatId);
  }
}

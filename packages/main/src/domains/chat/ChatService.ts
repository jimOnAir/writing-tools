import type { IChatInfo, IChatMessage } from '@writing-tools/shared';

import type { IChatRepository } from './IChatRepository';
import type { IChatService } from './IChatService';

export class ChatService implements IChatService {
  private readonly repository: IChatRepository;

  public constructor(repository: IChatRepository) {
    this.repository = repository;
  }

  public async initialize(): Promise<void> {
    await this.repository.initialize();
  }

  public startNewChat(title: string, provider: string, model: string): number {
    return this.repository.createChat(title, provider, model);
  }

  public saveMessage(chatId: number, message: IChatMessage): void {
    this.repository.saveMessage(chatId, message);
  }

  public loadChatMessages(chatId: number): IChatMessage[] {
    return this.repository.getChatMessages(chatId);
  }

  public getAllChats(): IChatInfo[] {
    return this.repository.getAllChats();
  }

  public close(): void {
    this.repository.close();
  }
}

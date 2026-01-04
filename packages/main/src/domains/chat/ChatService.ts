import type { IChatInfo, IChatMessage, ILogger } from '@writing-tools/shared';

import type { IModelService } from '../llm/IModelService';

import type { IChatRepository } from './IChatRepository';
import type { IChatService } from './IChatService';

export class ChatService implements IChatService {
  private readonly logger: ILogger;
  private readonly modelService: IModelService;
  private readonly repository: IChatRepository;

  public constructor(repository: IChatRepository, modelService: IModelService, logger: ILogger) {
    this.logger = logger;
    this.modelService = modelService;
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

  public getChat(chatId: number): IChatInfo | null {
    return this.repository.getChat(chatId);
  }

  public updateChatTitle(chatId: number, title: string): void {
    this.repository.updateChatTitle(chatId, title);
  }

  public deleteChat(chatId: number): void {
    this.repository.deleteChat(chatId);
  }

  public close(): void {
    this.repository.close();
  }

  public async generateChatTitle(userMessage: string, assistantMessage: string): Promise<string | null> {
    try {
      const prompt = `Generate a concise simple text title (maximum 5-6 words) for this conversation based on the first exchange:
User: ${userMessage}
Assistant: ${assistantMessage}
`;

      const response = await this.modelService.sendMessages([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      if (response.success === false) {
        this.logger.error('Failed to generate chat title: %s', response.error);

        return null;
      }

      // Clean up the title: remove quotes, trim whitespace
      let title = response.response.trim();
      // Remove surrounding quotes if present
      if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
        title = title.slice(1, -1);
      }
      title = title.trim();

      // Limit to reasonable length (e.g., 100 characters)
      const maxTitleLength = 100;
      const ellipsisLength = 3;
      if (title.length > maxTitleLength) {
        title = `${title.slice(0, maxTitleLength - ellipsisLength)}...`;
      }

      return title || null;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Error generating chat title: %s', errorText);

      return null;
    }
  }
}

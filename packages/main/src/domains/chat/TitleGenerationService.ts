import type { ILogger } from '@writing-tools/shared';

import type { IModelService } from '../llm';

import type { IChatService } from './IChatService';
import type { IMessageService } from './IMessageService';
import type { ITitleGenerationService } from './ITitleGenerationService';

export class TitleGenerationService implements ITitleGenerationService {
  public constructor(
    private readonly chatService: IChatService,
    private readonly logger: ILogger,
    private readonly messageService: IMessageService,
    private readonly modelService: IModelService,
  ) {}

  public async generateTitleIfNeeded(chatId: number) {
    this.logger.info('generateTitleIfNeeded called for chatId=%s', String(chatId));
    try {
      // Load chat messages to check count
      const messages = this.messageService.loadChatMessages(chatId);

      this.logger.info('Title generation check: chatId=%s, messageCount=%s', String(chatId), String(messages.length));
      this.logger.info('Messages in DB: %s', JSON.stringify(messages.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length }))));

      // Only generate title after first exchange (2 messages: user + assistant)
      if (messages.length !== 2) {
        this.logger.info('Title generation skipped: message count is %s (expected 2)', String(messages.length));

        return;
      }

      // Check if title is already set
      const chat = this.chatService.getChat(chatId);
      if (chat === null) {
        this.logger.error('Title generation failed: chat not found for chatId=%s', String(chatId));

        return;
      }

      if (chat.title.trim() !== '') {
        this.logger.info('Title generation skipped: chat already has title "%s"', chat.title);

        return;
      }

      // Get first user and assistant messages
      const userMessage = messages.find(m => m.role === 'user');
      const assistantMessage = messages.find(m => m.role === 'assistant');

      if (userMessage === undefined || assistantMessage === undefined) {
        this.logger.error('Title generation failed: missing user or assistant message');

        return;
      }

      this.logger.info('Generating title for chatId=%s', String(chatId));

      // Generate title using LLM
      const title = await this.generateChatTitle(userMessage.content, assistantMessage.content);

      if (title !== null && title.trim() !== '') {
        // CHAT_TITLE_UPDATED is sent by DbWatcherService when chats row is updated
        this.chatService.updateChatTitle(chatId, title);

        this.logger.info('Title generated and saved: chatId=%s, title="%s"', String(chatId), title);
      } else {
        this.logger.error('Title generation returned empty result for chatId=%s', String(chatId));
      }
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to generate chat title: %s', errorText);
      // Don't throw - title generation failure shouldn't break chat functionality
    }
  }

  private async generateChatTitle(userMessage: string, assistantMessage: string): Promise<string | null> {
    try {
      const prompt = `Generate a concise title (maximum 5-6 words) for this conversation:

User: ${userMessage}
Assistant: ${assistantMessage}

Title:`;

      const response = await this.modelService.sendMessages([
        {
          content: prompt,
          role: 'user',
        },
      ], { maxTokens: 10 });

      if (!response.success) {
        this.logger.error('Failed to generate chat title: %s', response.error);

        return null;
      }

      // Clean up the title: remove quotes, trim whitespace (no backend truncation)
      let title = response.response.trim();
      // Remove surrounding quotes if present
      if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
        title = title.slice(1, -1);
      }
      title = title.trim();

      return title || null;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Error generating chat title: %s', errorText);

      return null;
    }
  }
}

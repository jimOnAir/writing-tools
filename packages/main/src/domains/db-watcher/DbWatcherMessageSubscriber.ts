import type { ILogger } from '@writing-tools/shared';
import { EIpcRendererEvent } from '@writing-tools/shared';

import { sendToAllWindows } from '../../infrastructure/ipc/sendToAllWindows';
import type { IChatRepository } from '../chat/IChatRepository';
import type { IFollowUpQuestionsService } from '../chat/IFollowUpQuestionsService';
import type { IMessageService } from '../chat/IMessageService';
import type { ITitleGenerationService } from '../chat/ITitleGenerationService';

import type { DbWatcherService, TTableEvent } from './DbWatcherService';

const MESSAGES_TABLE = 'messages';

export class DbWatcherMessageSubscriber {
  public constructor(
    private readonly chatRepository: IChatRepository,
    private readonly dbWatcherService: DbWatcherService,
    private readonly followUpQuestionsService: IFollowUpQuestionsService,
    private readonly logger: ILogger,
    private readonly messageService: IMessageService,
    private readonly titleGenerationService: ITitleGenerationService,
  ) {}

  public subscribe(): void {
    this.dbWatcherService.on(MESSAGES_TABLE, (value: TTableEvent) => {
      setImmediate(() => {
        void this.handleMessagesEvent(value);
      });
    });
    this.logger.info('DbWatcherMessageSubscriber subscribed to %s events', MESSAGES_TABLE);
  }

  private async handleMessagesEvent(value: TTableEvent): Promise<void> {
    const { payload } = value;
    const chatId = payload.chat_id as number;
    const messageId = payload.id;

    try {
      const messages = this.messageService.loadChatMessages(chatId);

      // Only react when the changed row is the last message. The DB watcher fires for every
      // INSERT/UPDATE on messages; we must not broadcast messages or run title/follow-up
      // generation on every event (e.g. when opening a chat with many messages).
      const changedMessageId = payload.id as string | undefined;
      const lastMessage = messages.length > 0 ? messages.at(-1) : undefined;
      const isLastMessageChanged
        = lastMessage !== undefined
        && changedMessageId !== undefined
        && lastMessage.id === changedMessageId;

      if (!isLastMessageChanged) {
        return;
      }

      sendToAllWindows(EIpcRendererEvent.CHAT_LOAD_MESSAGES_DATA, { chatId, messages });
      void this.titleGenerationService.generateTitleIfNeeded(chatId);

      const chat = this.chatRepository.getChat(chatId);
      const followUpOptions
        = chat?.model && chat?.provider
          ? { model: chat.model, provider: chat.provider as 'ollama' | 'lmstudio' }
          : undefined;
      const questions = await this.followUpQuestionsService.generate(messages, chatId, messageId, followUpOptions);
      sendToAllWindows(EIpcRendererEvent.CHAT_FOLLOW_UP_QUESTIONS, { chatId, questions });
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('DbWatcherMessageSubscriber handleMessagesEvent error: %s', errorText);
      sendToAllWindows(EIpcRendererEvent.CHAT_FOLLOW_UP_QUESTIONS, { chatId, questions: [] });
    }
  }
}

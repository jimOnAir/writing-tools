import type { ILogger } from '@writing-tools/shared';
import { EIpcRendererEvent } from '@writing-tools/shared';

import { sendToAllWindows } from '../../infrastructure/ipc/sendToAllWindows';
import type { IFollowUpQuestionsService } from '../chat/IFollowUpQuestionsService';
import type { IMessageService } from '../chat/IMessageService';
import type { ITitleGenerationService } from '../chat/ITitleGenerationService';

import type { DbWatcherService, TTableEvent } from './DbWatcherService';

const MESSAGES_TABLE = 'messages';

export class DbWatcherMessageSubscriber {
  public constructor(
    private readonly dbWatcherService: DbWatcherService,
    private readonly followUpQuestionsService: IFollowUpQuestionsService,
    private readonly logger: ILogger,
    private readonly messageService: IMessageService,
    private readonly titleGenerationService: ITitleGenerationService,
  ) {}

  public subscribe(): void {
    this.dbWatcherService.on(MESSAGES_TABLE, (value: TTableEvent) => {
      void this.handleMessagesEvent(value);
    });
    this.logger.info('DbWatcherMessageSubscriber subscribed to %s events', MESSAGES_TABLE);
  }

  private async handleMessagesEvent(value: TTableEvent): Promise<void> {
    const { payload } = value;
    const chatId = payload.chat_id as number;

    try {
      const messages = this.messageService.loadChatMessages(chatId);
      sendToAllWindows(EIpcRendererEvent.CHAT_LOAD_MESSAGES_DATA, { chatId, messages });

      void this.titleGenerationService.generateTitleIfNeeded(chatId);

      const questions = await this.followUpQuestionsService.generate(messages, chatId);
      sendToAllWindows(EIpcRendererEvent.CHAT_FOLLOW_UP_QUESTIONS, { chatId, questions });
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('DbWatcherMessageSubscriber handleMessagesEvent error: %s', errorText);
      sendToAllWindows(EIpcRendererEvent.CHAT_FOLLOW_UP_QUESTIONS, { chatId, questions: [] });
    }
  }
}

import type { ILogger } from '@writing-tools/shared';
import { EIpcRendererEvent } from '@writing-tools/shared';

import { sendToAllWindows } from '../../infrastructure/ipc/sendToAllWindows';

import type { DbWatcherService, TTableEvent } from './DbWatcherService';
import { EDbOperation } from './EDbOperation';

const CHATS_TABLE = 'chats';

export class DbWatcherChatSubscriber {
  public constructor(
    private readonly dbWatcherService: DbWatcherService,
    private readonly logger: ILogger,
  ) {}

  public subscribe(): void {
    this.dbWatcherService.on(CHATS_TABLE, (value: TTableEvent) => {
      this.handleChatsEvent(value);
    });
    this.logger.info('DbWatcherChatSubscriber subscribed to %s events', CHATS_TABLE);
  }

  private handleChatsEvent(value: TTableEvent): void {
    const { operation, payload } = value;
    const chatId = payload.id as number;

    try {
      switch (operation as EDbOperation) {
        case EDbOperation.INSERT:
          sendToAllWindows(EIpcRendererEvent.CHAT_CREATED, { chatId });
          this.logger.info('CHAT_CREATED event sent: chatId=%s', String(chatId));
          break;
        case EDbOperation.UPDATE:
          sendToAllWindows(EIpcRendererEvent.CHAT_TITLE_UPDATED, {
            chatId,
            title: payload.title as string,
          });
          this.logger.info('CHAT_TITLE_UPDATED event sent: chatId=%s', String(chatId));
          break;
        case EDbOperation.DELETE:
          sendToAllWindows(EIpcRendererEvent.CHAT_DELETED, { chatId });
          this.logger.info('CHAT_DELETED event sent: chatId=%s', String(chatId));
          break;
        default:
          this.logger.warn('Unknown chats operation: %s', operation);
      }
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('DbWatcherChatSubscriber handleChatsEvent error: %s', errorText);
    }
  }
}

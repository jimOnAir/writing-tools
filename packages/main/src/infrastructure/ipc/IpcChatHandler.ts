import type { TIpcEvent, ILogger } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent, EIpcRendererEvent } from '@writing-tools/shared';
import { ipcMain } from 'electron';

import type { IChatService } from '../../domains/chat/IChatService';
import type { IMessageService } from '../../domains/chat/IMessageService';
import type { IOpenTabsService } from '../../domains/open-tabs/IOpenTabsService';
import type { ISettingsService } from '../../domains/settings';
import type { IWindowService } from '../../domains/windows/IWindowService';

import type { IIpcChatHandler } from './IIpcChatHandler';

type TChatChannelEventPayload = TIpcEvent<EIpcChannel.CHAT, EIpcEvent.MESSAGE_SEND_STREAM>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_CREATE>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_DELETE>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_GET>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LIST>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_OPEN>
  | TIpcEvent<EIpcChannel.MESSAGE, EIpcEvent.MESSAGES_LOAD>;

export class IpcChatHandler implements IIpcChatHandler {
  public constructor(
    private readonly chatService: IChatService,
    private readonly logger: ILogger,
    private readonly openTabsService: IOpenTabsService,
    private readonly settingsService: ISettingsService,
    private readonly windowService: IWindowService,
    private readonly messageService: IMessageService,
  ) {}

  public register(): void {
    ipcMain.handle(EIpcChannel.CHAT, async (_, data: TChatChannelEventPayload) => {
      const eventType = data.event;
      switch (data.event) {
        case EIpcEvent.CHAT_CREATE:
          return this.handleChatCreateSession(data.payload);
        case EIpcEvent.CHAT_LIST:
          return this.handleChatListChats(data.payload);
        case EIpcEvent.CHAT_GET:
          return this.handleChatGet(data.payload.chatId);
        case EIpcEvent.CHAT_DELETE:
          return this.handleChatDelete(data.payload.chatId);
        case EIpcEvent.CHAT_OPEN:
          return this.handleChatOpen(data.payload.chatId);
        default:
          throw new Error(`Unsupported event: ${eventType}`);
      }
    });
  }

  private async handleChatCreateSession(payload: { title?: string, provider?: string, model?: string }) {
    try {
      // Get current provider and model from settings
      const settings = await this.settingsService.loadSettings();
      const provider = settings.provider || 'ollama';
      const model = provider === 'ollama'
        ? (settings.ollama.model || '')
        : (settings.lmstudio.model || '');

      // Ensure all values are non-null
      const title = payload.title ?? '';
      const providerValue = provider;
      const modelValue = model;

      const chatId = this.chatService.startNewChat(
        title,
        providerValue,
        modelValue,
      );

      // CHAT_CREATED is sent by DbWatcherService when chat row is inserted
      return { chatId };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create chat session: %s', errorText);

      return { error: errorText };
    }
  }

  private handleChatListChats(payload: { limit?: number, offset?: number }) {
    try {
      const limit = payload.limit;
      const offset = payload.offset;

      if (typeof limit === 'number' && typeof offset === 'number') {
        const result = this.chatService.getChatsPaginated(limit, offset);

        return { chats: result.chats, hasMore: result.hasMore };
      }

      const chats = this.chatService.getAllChats();

      return { chats, hasMore: false };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list chats: %s', errorText);

      return { error: errorText };
    }
  }

  private handleChatGet(chatId: number) {
    try {
      const chat = this.chatService.getChat(chatId);

      if (chat === null) {
        return { error: `Chat with id ${String(chatId)} not found` };
      }

      return { chat };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get chat: %s', errorText);

      return { error: errorText };
    }
  }

  private handleChatDelete(chatId: number) {
    try {
      // Check if chat exists before deleting
      const chat = this.chatService.getChat(chatId);
      if (chat === null) {
        return { success: false, error: `Chat with id ${String(chatId)} not found` };
      }

      // Delete the chat (messages cascade delete automatically)
      // CHAT_DELETED is sent by DbWatcherService when chat row is deleted
      this.chatService.deleteChat(chatId);
      this.openTabsService.deleteTabsByChatId(chatId);

      return { success: true };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to delete chat: %s', errorText);

      return { success: false, error: errorText };
    }
  }

  private async handleChatOpen(chatId: number) {
    try {
      // Check if chat exists
      const chat = this.chatService.getChat(chatId);
      if (chat === null) {
        return { success: false, error: `Chat with id ${String(chatId)} not found` };
      }

      // Get or create mainWindow
      const { window: mainWindow } = await this.windowService.getMainWindow();

      // Load messages for this chat
      const messages = this.messageService.loadChatMessages(chatId);

      // Send messages to mainWindow
      mainWindow.webContents.send(EIpcRendererEvent.CHAT_LOAD_MESSAGES_DATA, {
        chatId,
        messages,
      });

      return { success: true };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to open chat: %s', errorText);

      return { success: false, error: errorText };
    }
  }
}

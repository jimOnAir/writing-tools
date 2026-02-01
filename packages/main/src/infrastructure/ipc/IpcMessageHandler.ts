import type { IChatMessage, ILogger, TIpcEvent } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent, EIpcRendererEvent } from '@writing-tools/shared';
import { ipcMain } from 'electron';

import type { IChatService } from '../../domains/chat';
import type { IFollowUpQuestionsService } from '../../domains/chat/IFollowUpQuestionsService';
import type { ILlmStreamingService } from '../../domains/chat/ILlmStreamingService';
import type { IMessageService } from '../../domains/chat/IMessageService';
import type { ITitleGenerationService } from '../../domains/chat/ITitleGenerationService';
import { LlmStreamingError } from '../../domains/chat/LlmStreamingError';
import type { ISettingsService } from '../../domains/settings/ISettingsService';
import type { IWindowService } from '../../domains/windows';

import type { IIpcMessageHandler } from './IIpcMessageHandler';

type TMessageChannelEventPayload = TIpcEvent<EIpcChannel.MESSAGE, EIpcEvent.MESSAGE_SEND_STREAM>
 | TIpcEvent<EIpcChannel.MESSAGE, EIpcEvent.MESSAGES_LOAD>;

export class IpcMessageHandler implements IIpcMessageHandler {
  private readonly processingChatIds = new Set<number>();

  public constructor(
    private readonly chatService: IChatService,
    private readonly followUpQuestionsService: IFollowUpQuestionsService,
    private readonly logger: ILogger,
    private readonly llmStreamingService: ILlmStreamingService,
    private readonly messageService: IMessageService,
    private readonly settingsService: ISettingsService,
    private readonly titleGenerationService: ITitleGenerationService,
    private readonly windowService: IWindowService,
  ) {}

  public register(): void {
    ipcMain.handle(EIpcChannel.MESSAGE, async (_, data: TMessageChannelEventPayload) => {
      const eventType = data.event;
      switch (data.event) {
        case EIpcEvent.MESSAGE_SEND_STREAM:
          return this.handleChatSendMessageStream(
            data.payload.chatId,
            data.payload.messages,
            { model: data.payload.model, provider: data.payload.provider },
          );
        case EIpcEvent.MESSAGES_LOAD:
          return this.handleChatLoadMessages(data.payload.chatId);
        default:
          throw new Error(`Unsupported event: ${eventType}`);
      }
    });
  }

  private async handleChatSendMessageStream(
    chatId: number,
    messages: IChatMessage[],
    override: { model?: string, provider?: 'ollama' | 'lmstudio' },
  ) {
    if (this.processingChatIds.has(chatId)) {
      this.logger.warn('handleChatSendMessageStream: Already processing chatId=%s, ignoring duplicate request', String(chatId));

      return { error: 'Request already processing', started: false } as const;
    }
    this.processingChatIds.add(chatId);

    try {
      for (const message of messages) {
        try {
          this.messageService.saveMessage(chatId, message);
        } catch (error: unknown) {
          const errorText = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to save message before streaming: %s', errorText);
        }
      }

      if (override.model !== undefined && override.model !== '') {
        const settings = await this.settingsService.loadSettings();
        const provider = override.provider ?? (settings.provider ?? 'ollama');
        this.chatService.updateChatModel(chatId, override.model, provider);
      }

      const { window: mainWindow } = await this.windowService.getMainWindow();

      void this.llmStreamingService
        .streamToWindow({
          chatId,
          mainWindow,
          messages: messages.map((m) => ({ content: m.content, role: m.role })),
          override,
        })
        .then((result) => {
          mainWindow.webContents.send(EIpcRendererEvent.CHAT_STREAM_END, {
            chatId,
            fullContent: result.fullContent,
          });

          void this.titleGenerationService.generateTitleIfNeeded(chatId);

          const assistantMessage: IChatMessage = {
            content: result.fullContent,
            id: `${Date.now().toString()}-response`,
            role: 'assistant',
            statistics: result.statistics,
            timestamp: new Date(),
          };
          void this.generateAndSendFollowUpQuestions(chatId, [...messages, assistantMessage], mainWindow);
        })
        .catch((error: unknown) => {
          if (error instanceof LlmStreamingError) {
            mainWindow.webContents.send(EIpcRendererEvent.CHAT_STREAM_END, {
              chatId,
              error: error.message,
              fullContent: error.fullContent,
            });
          } else {
            const errorText = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to start streaming: %s', errorText);
            mainWindow.webContents.send(EIpcRendererEvent.CHAT_STREAM_END, {
              chatId,
              error: errorText,
              fullContent: '',
            });
          }
        })
        .finally(() => {
          this.processingChatIds.delete(chatId);
        });

      return { started: true } as const;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to start streaming: %s', errorText);
      this.processingChatIds.delete(chatId);

      return { error: errorText, started: false } as const;
    }
  }

  private async generateAndSendFollowUpQuestions(
    chatId: number,
    messagesWithAssistant: IChatMessage[],
    mainWindow: Electron.BrowserWindow,
  ): Promise<void> {
    try {
      const questions = await this.followUpQuestionsService.generate(messagesWithAssistant, chatId);

      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(EIpcRendererEvent.CHAT_FOLLOW_UP_QUESTIONS, {
          chatId,
          questions,
        });
      }
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to generate or send follow-up questions: %s', errorText);

      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(EIpcRendererEvent.CHAT_FOLLOW_UP_QUESTIONS, {
          chatId,
          questions: [],
        });
      }
    }
  }

  private handleChatLoadMessages(chatId: number) {
    try {
      const messages = this.messageService.loadChatMessages(chatId);

      return { messages };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to load messages: %s', errorText);

      return { error: errorText };
    }
  }
}

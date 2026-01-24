import type { IChatMessage, ILogger, IMessageStatistics, TIpcEvent } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent, EIpcRendererEvent } from '@writing-tools/shared';
import { ipcMain } from 'electron';

import type { IChatService } from '../../domains/chat';
import type { IMessageService } from '../../domains/chat/IMessageService';
import type { ITitleGenerationService } from '../../domains/chat/ITitleGenerationService';
import type { IModelService } from '../../domains/llm';
import type { IWindowService } from '../../domains/windows';

import type { IIpcMessageHandler } from './IIpcMessageHandler';

type TMessageChannelEventPayload = TIpcEvent<EIpcChannel.MESSAGE, EIpcEvent.MESSAGE_SEND_STREAM>
 | TIpcEvent<EIpcChannel.MESSAGE, EIpcEvent.MESSAGES_LOAD>;

export class IpcMessageHandler implements IIpcMessageHandler {
  private readonly processingChatIds = new Set<number>();

  public constructor(
    private readonly logger: ILogger,
    private readonly messageService: IMessageService,
    private readonly windowService: IWindowService,
    private readonly modelService: IModelService,
    private readonly chatService: IChatService,
    private readonly titleGenerationService: ITitleGenerationService,
  ) {}

  public register(): void {
    ipcMain.handle(EIpcChannel.MESSAGE, async (_, data: TMessageChannelEventPayload) => {
      const eventType = data.event;
      switch (data.event) {
        case EIpcEvent.MESSAGE_SEND_STREAM:
          return this.handleChatSendMessageStream(data.payload.chatId, data.payload.messages);
        case EIpcEvent.MESSAGES_LOAD:
          return this.handleChatLoadMessages(data.payload.chatId);
        default:
          throw new Error(`Unsupported event: ${eventType}`);
      }
    });
  }

  private async handleChatSendMessageStream(chatId: number, messages: IChatMessage[]) {
    // Prevent duplicate processing for the same chatId
    if (this.processingChatIds.has(chatId)) {
      this.logger.warn('handleChatSendMessageStream: Already processing chatId=%s, ignoring duplicate request', String(chatId));

      return { error: 'Request already processing', started: false } as const;
    }
    this.processingChatIds.add(chatId);

    try {
      // Save all messages before sending to LLM
      for (const message of messages) {
        try {
          this.messageService.saveMessage(chatId, message);
        } catch (error: unknown) {
          const errorText = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to save message before streaming: %s', errorText);
          // Continue even if save fails
        }
      }

      // Get the main window to send stream events
      const { window: mainWindow } = await this.windowService.getMainWindow();

      // Start streaming in the background
      void this.streamLLMResponse(chatId, messages, mainWindow);

      // Return immediately to indicate streaming has started
      return { started: true } as const;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to start streaming: %s', errorText);
      this.processingChatIds.delete(chatId);

      return { error: errorText, started: false } as const;
    }
  }

  private async streamLLMResponse( // TODO: move to separate service
    chatId: number,
    messages: IChatMessage[],
    mainWindow: Electron.BrowserWindow,
  ): Promise<void> {
    let fullContent = '';
    let statistics: IMessageStatistics | undefined;

    try {
      const streamGenerator = this.modelService.sendMessagesStream(messages.map((message => {
        return {
          role: message.role,
          content: message.content,
        };
      })));

      for await (const chunk of streamGenerator) {
        fullContent += chunk.content;

        // Capture statistics from the final chunk
        if (chunk.done && 'statistics' in chunk && chunk.statistics !== undefined) {
          statistics = chunk.statistics;
        }

        // Send chunk to renderer with statistics if available
        mainWindow.webContents.send(EIpcRendererEvent.CHAT_STREAM_CHUNK, {
          chatId,
          content: chunk.content,
          done: chunk.done,
          statistics: 'statistics' in chunk ? chunk.statistics : undefined,
        });
      }

      // Save assistant response
      const trimmedContent = fullContent.trimEnd();
      const assistantMessage: IChatMessage = {
        id: `${Date.now().toString()}-response`,
        role: 'assistant',
        content: trimmedContent,
        timestamp: new Date(),
        statistics,
      };

      try {
        this.messageService.saveMessage(chatId, assistantMessage);
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to save streamed assistant response: %s', errorText);
      }

      // Send stream end event
      mainWindow.webContents.send('CHAT_STREAM_END', {
        chatId,
        fullContent: trimmedContent,
      });

      this.logger.info('Streaming completed for chatId=%s', String(chatId));

      // Generate title after first exchange
      void this.titleGenerationService.generateTitleIfNeeded(chatId);
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Streaming error for chatId=%s: %s', String(chatId), errorText);

      // Send error to renderer
      mainWindow.webContents.send('CHAT_STREAM_END', {
        chatId,
        error: errorText,
        fullContent,
      });
    } finally {
      this.processingChatIds.delete(chatId);
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

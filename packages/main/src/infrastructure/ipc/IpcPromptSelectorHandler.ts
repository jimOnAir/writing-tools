import type { EIpcEvent, IChatMessage, ILogger, IMessageStatistics, TIpcEvent } from '@writing-tools/shared';
import { EIpcChannel, EIpcRendererEvent } from '@writing-tools/shared';
import { ipcMain } from 'electron';

import type { IChatService } from '../../domains/chat/IChatService';
import type { IMessageService } from '../../domains/chat/IMessageService';
import type { ITitleGenerationService } from '../../domains/chat/ITitleGenerationService';
import type { IModelService } from '../../domains/llm/IModelService';
import type { ISettingsService } from '../../domains/settings/ISettingsService';
import type { IWindowService } from '../../domains/windows/IWindowService';

import type { IIpcPromptSelectorHandler } from './IIpcPromptSelectorHandler';

type TPromptSelectEventPayload = TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT>;

export class IpcPromptSelectorHandler implements IIpcPromptSelectorHandler {
  private readonly processingChatIds = new Set<number>();

  public constructor(
    private readonly chatService: IChatService,
    private readonly settingsService: ISettingsService,
    private readonly windowService: IWindowService,
    private readonly modelService: IModelService,
    private readonly logger: ILogger,
    private readonly messageService: IMessageService,
    private readonly titleGenerationService: ITitleGenerationService,
  ) {}

  public register(): void {
    ipcMain.handle(EIpcChannel.PROMPT_SELECTOR, async (_, data: TPromptSelectEventPayload) => {
      try {
        return await this.handlePromptSelect(data.payload);
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        this.logger.error('Error occurred in handler for \'PROMPT_SELECTOR\': %s', errorText);
        throw error;
      }
    });
  }

  private async handlePromptSelect(payload: { model?: string, prompt: string, provider?: 'ollama' | 'lmstudio' }): Promise<{ started: boolean, error?: string }> {
    const { window: mainWindow } = await this.windowService.getMainWindow();

    // Create a new chat session for the prompt
    // Use prompt's provider/model if provided, otherwise use defaults from settings
    const settings = await this.settingsService.loadSettings();
    const defaultProvider = settings.provider || 'ollama';
    const defaultModel = defaultProvider === 'ollama'
      ? (settings.ollama.model || '')
      : (settings.lmstudio.model || '');

    // Use prompt's provider/model if set, otherwise use defaults
    const provider = payload.provider ?? defaultProvider;
    const model = payload.model ?? defaultModel;

    const chatId = this.chatService.startNewChat('', provider, model);

    // Prevent duplicate processing for the same chatId

    if (this.processingChatIds.has(chatId)) {
      this.logger.warn('handlePromptSelect: Already processing chatId=%s, ignoring duplicate request', String(chatId));

      return { error: 'Request already processing', started: false } as const;
    }

    // Save user message
    const userMessage: IChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: payload.prompt,
      timestamp: new Date(),
    };
    try {
      this.messageService.saveMessage(chatId, userMessage);
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to save user message in prompt select: %s', errorText);
    }

    this.logger.info('Send chat-window-data: %s, chatId=%s', payload.prompt, String(chatId));
    mainWindow.webContents.send(EIpcRendererEvent.CHAT_WINDOW_DATA, {
      prompt: payload.prompt,
      chatId,
    });

    this.processingChatIds.add(chatId);

    try {
      // Start streaming in the background
      void this.streamLLMResponse(chatId, payload.prompt, mainWindow);

      // Return immediately to indicate streaming has started
      return { started: true } as const;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to start streaming in prompt select: %s', errorText);
      this.processingChatIds.delete(chatId);

      // Save error message
      const errorMessage: IChatMessage = {
        id: `${Date.now().toString()}-error`,
        role: 'assistant',
        content: `Error: ${errorText}`,
        timestamp: new Date(),
      };
      try {
        this.messageService.saveMessage(chatId, errorMessage);
      } catch (saveError: unknown) {
        const saveErrorText = saveError instanceof Error ? saveError.message : String(saveError);
        this.logger.error('Failed to save error message in prompt select: %s', saveErrorText);
      }

      mainWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
        error: errorText,
        chatId,
      });

      return { error: errorText, started: false } as const;
    }
  }

  private async streamLLMResponse( // TODO: Move to separate service
    chatId: number,
    prompt: string,
    mainWindow: Electron.BrowserWindow,
  ): Promise<void> {
    let fullContent = '';
    let statistics: IMessageStatistics | undefined;

    try {
      const messages = [{
        role: 'user',
        content: prompt,
      }];

      const streamGenerator = this.modelService.sendMessagesStream(messages);

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
        this.messageService.saveMessage(chatId, assistantMessage); // TODO: Fix statistics ins't saved
        this.logger.info('Assistant message saved in prompt select: chatId=%s', String(chatId));
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to save streamed assistant response in prompt select: %s', errorText);
      }

      // Send stream end event
      mainWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
        result: trimmedContent,
        chatId,
      });

      this.logger.info('Streaming completed for prompt select chatId=%s', String(chatId));

      // Generate title after first exchange
      void this.titleGenerationService.generateTitleIfNeeded(chatId);
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Streaming error for prompt select chatId=%s: %s', String(chatId), errorText);

      // Send error to renderer
      mainWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
        error: errorText,
        chatId,
      });
    } finally {
      this.processingChatIds.delete(chatId);
    }
  }
}

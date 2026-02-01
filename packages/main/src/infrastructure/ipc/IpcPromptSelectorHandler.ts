import type { EIpcEvent, IChatMessage, ILogger, TIpcEvent } from '@writing-tools/shared';
import { EIpcChannel, EIpcRendererEvent } from '@writing-tools/shared';
import { ipcMain } from 'electron';

import type { IChatService } from '../../domains/chat/IChatService';
import type { IFollowUpQuestionsService } from '../../domains/chat/IFollowUpQuestionsService';
import type { ILlmStreamingService } from '../../domains/chat/ILlmStreamingService';
import type { IMessageService } from '../../domains/chat/IMessageService';
import type { ITitleGenerationService } from '../../domains/chat/ITitleGenerationService';
import { LlmStreamingError } from '../../domains/chat/LlmStreamingError';
import type { ISettingsService } from '../../domains/settings/ISettingsService';
import type { IWindowService } from '../../domains/windows/IWindowService';

import type { IIpcPromptSelectorHandler } from './IIpcPromptSelectorHandler';

type TPromptSelectEventPayload = TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT>;

export class IpcPromptSelectorHandler implements IIpcPromptSelectorHandler {
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

    const settings = await this.settingsService.loadSettings();
    const defaultProvider = settings.provider || 'ollama';
    const defaultModel = defaultProvider === 'ollama'
      ? (settings.ollama.model || '')
      : (settings.lmstudio.model || '');

    const provider = payload.provider ?? defaultProvider;
    const model = payload.model ?? defaultModel;

    const chatId = this.chatService.startNewChat('', provider, model);

    if (this.processingChatIds.has(chatId)) {
      this.logger.warn('handlePromptSelect: Already processing chatId=%s, ignoring duplicate request', String(chatId));

      return { error: 'Request already processing', started: false } as const;
    }

    const userMessage: IChatMessage = {
      content: payload.prompt,
      id: Date.now().toString(),
      role: 'user',
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
      chatId,
      prompt: payload.prompt,
    });

    this.processingChatIds.add(chatId);

    try {
      void this.llmStreamingService
        .streamToWindow({
          chatId,
          mainWindow,
          messages: [{ content: payload.prompt, role: 'user' }],
        })
        .then((result) => {
          mainWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
            chatId,
            result: result.fullContent,
            statistics: result.statistics,
          });

          void this.titleGenerationService.generateTitleIfNeeded(chatId);

          const assistantMessage: IChatMessage = {
            content: result.fullContent,
            id: `${Date.now().toString()}-response`,
            role: 'assistant',
            statistics: result.statistics,
            timestamp: new Date(),
          };
          void this.generateAndSendFollowUpQuestions(chatId, [userMessage, assistantMessage], mainWindow);
        })
        .catch((error: unknown) => {
          if (error instanceof LlmStreamingError) {
            mainWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
              chatId,
              error: error.message,
            });
          } else {
            const errorText = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to start streaming in prompt select: %s', errorText);
            mainWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
              chatId,
              error: errorText,
            });
          }

          const errorMessage: IChatMessage = {
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            id: `${Date.now().toString()}-error`,
            role: 'assistant',
            timestamp: new Date(),
          };
          try {
            this.messageService.saveMessage(chatId, errorMessage);
          } catch (saveError: unknown) {
            const saveErrorText = saveError instanceof Error ? saveError.message : String(saveError);
            this.logger.error('Failed to save error message in prompt select: %s', saveErrorText);
          }
        })
        .finally(() => {
          this.processingChatIds.delete(chatId);
        });

      return { started: true } as const;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to start streaming in prompt select: %s', errorText);
      this.processingChatIds.delete(chatId);

      const errorMessage: IChatMessage = {
        content: `Error: ${errorText}`,
        id: `${Date.now().toString()}-error`,
        role: 'assistant',
        timestamp: new Date(),
      };
      try {
        this.messageService.saveMessage(chatId, errorMessage);
      } catch (saveError: unknown) {
        const saveErrorText = saveError instanceof Error ? saveError.message : String(saveError);
        this.logger.error('Failed to save error message in prompt select: %s', saveErrorText);
      }

      mainWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
        chatId,
        error: errorText,
      });

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
}

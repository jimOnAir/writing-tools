import type { EIpcEvent, IChatMessage, ILogger, TIpcEvent } from '@writing-tools/shared';
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
        await this.handlePromptSelect(data.payload);
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        this.logger.error('Error occurred in handler for \'PROMPT_SELECTOR\': %s', errorText);
        throw error;
      }
    });
  }

  private async handlePromptSelect(payload: { model?: string, prompt: string, provider?: 'ollama' | 'lmstudio' }): Promise<void> {
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
    // ChatService now handles CHAT_CREATED event notification

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

    const response = await this.modelService.sendMessages([
      {
        role: 'user',
        content: payload.prompt,
      },
    ]);

    if (!response.success) {
      this.logger.error('LLM error: %s', response.error);

      // Save error message
      const errorMessage: IChatMessage = {
        id: `${Date.now().toString()}-error`,
        role: 'assistant',
        content: `Error: ${response.error}`,
        timestamp: new Date(),
      };
      try {
        this.messageService.saveMessage(chatId, errorMessage);
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to save error message: %s', errorText);
      }

      mainWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
        error: response.error,
        chatId,
      });

      return;
    }

    // Save assistant response
    const assistantMessage: IChatMessage = {
      id: `${Date.now().toString()}-response`,
      role: 'assistant',
      content: response.response,
      timestamp: new Date(),
    };
    try {
      this.messageService.saveMessage(chatId, assistantMessage);
      this.logger.info('Assistant message saved: chatId=%s, messageId=%s', String(chatId), assistantMessage.id);
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to save assistant response in prompt select: %s', errorText);
    }

    const result = response.response;
    mainWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
      result,
      chatId,
    });

    // Generate title after first exchange (2 messages: user + assistant)
    // Add small delay to ensure database write is committed
    this.logger.info('Triggering title generation from prompt select for chatId=%s', String(chatId));
    setTimeout(() => {
      void this.titleGenerationService.generateTitleIfNeeded(chatId);
    }, 100);
  }
}

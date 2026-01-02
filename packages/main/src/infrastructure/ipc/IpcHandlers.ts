import { EIpcChannel, EIpcEvent, EIpcRendererEvent, logger } from '@writing-tools/shared';
import type { IChatMessage, ISettings, TIpcEvent } from '@writing-tools/shared';
import { ipcMain } from 'electron';
import os from 'os';

import type { IChatService } from '../../domains/chat/IChatService';
import type { IModelService } from '../../domains/llm/IModelService';
import type { ISettingsService } from '../../domains/settings/ISettingsService';
import type { IWindowService } from '../../domains/windows/IWindowService';

import type { IIpcHandlers } from './IIpcHandlers';

type TChannelEventPayloadEnv = TIpcEvent<EIpcChannel.ENV, EIpcEvent.ENV_GET>;

type TSettingChannelEventPayload = TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_LOAD>
  | TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_SAVE>;

type TChannelEventPayloadModel = TIpcEvent<EIpcChannel.MODEL, EIpcEvent.MODEL_LIST>;

type TChatChannelEventPayload = TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_SEND_MESSAGE>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_CREATE_SESSION>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LOAD_MESSAGES>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LIST_CHATS>;

type TPromptSelectEventPayload = TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT>;

export class IpcHandlers implements IIpcHandlers {
  private readonly settingsService: ISettingsService;
  private readonly modelService: IModelService;
  private readonly windowService: IWindowService;
  private readonly chatService: IChatService;

  public constructor(
    settingsService: ISettingsService,
    modelService: IModelService,
    windowService: IWindowService,
    chatService: IChatService,
  ) {
    this.settingsService = settingsService;
    this.modelService = modelService;
    this.windowService = windowService;
    this.chatService = chatService;
  }

  public register(): void {
    ipcMain.handle(EIpcChannel.ENV, (_, _data: TChannelEventPayloadEnv) => {
      return {
        platform: os.platform(), // 'win32', 'darwin', 'linux'
        arch: os.arch(), // 'x64', 'arm64', etc.
        release: os.release(),
      };
    });

    ipcMain.handle(EIpcChannel.SETTINGS, async (_, data: TSettingChannelEventPayload) => {
      const eventType = String((data as any).event);

      switch (data.event) {
        case EIpcEvent.SETTINGS_LOAD:
          return this.handleSettingsLoad();
        case EIpcEvent.SETTINGS_SAVE:
          return this.handleSettingsSave(data.payload);

        default:
          throw new Error(`Unsupported event: ${eventType}`);
      }
    });

    ipcMain.handle(EIpcChannel.MODEL, async (_, data: TChannelEventPayloadModel) => {
      return this.modelService.fetchModels(data.payload.provider);
    });

    ipcMain.handle(EIpcChannel.CHAT, async (_, data: TChatChannelEventPayload) => {
      const eventType = String((data as any).event);

      switch (data.event) {
        case EIpcEvent.CHAT_SEND_MESSAGE:
          return await this.handleChatSendMessage(data.payload.chatId, data.payload.messages);
        case EIpcEvent.CHAT_CREATE_SESSION:
          return await this.handleChatCreateSession(data.payload);
        case EIpcEvent.CHAT_LOAD_MESSAGES:
          return this.handleChatLoadMessages(data.payload.chatId);
        case EIpcEvent.CHAT_LIST_CHATS:
          return this.handleChatListChats();

        default:
          throw new Error(`Unsupported event: ${eventType}`);
      }
    });

    ipcMain.handle(EIpcChannel.PROMPT_SELECTOR, async (_, data: TPromptSelectEventPayload) => {
      return this.handlePromptSelect(data.payload.prompt);
    });
  }

  private async handleSettingsLoad() {
    return await this.settingsService.loadSettings();
  }

  private async handleSettingsSave(settings: ISettings) {
    try {
      await this.settingsService.saveSettings(settings);

      return { success: true };
    } catch (error: unknown) {
      const errorText = error instanceof Error
        ? error.message
        : String(error);

      return { success: false, error: errorText };
    }
  }

  private async handleChatSendMessage(chatId: number, messages: IChatMessage[]) {
    // Save all messages before sending to LLM
    for (const message of messages) {
      try {
        this.chatService.saveMessage(chatId, message);
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        logger.error('Failed to save message before sending: %s', errorText);
        // Continue even if save fails
      }
    }

    const llmResponse = await this.modelService.sendMessages(messages.map((message => {
      return {
        role: message.role,
        content: message.content,
      };
    })));

    // Save assistant response if successful
    if ('response' in llmResponse) {
      const assistantMessage: IChatMessage = {
        id: Date.now().toString() + '-response',
        role: 'assistant',
        content: llmResponse.response,
        timestamp: new Date(),
      };

      try {
        this.chatService.saveMessage(chatId, assistantMessage);
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        logger.error('Failed to save assistant response: %s', errorText);
        // Continue even if save fails
      }
    }

    return llmResponse;
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

      return { chatId };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      logger.error('Failed to create chat session: %s', errorText);

      return { error: errorText };
    }
  }

  private handleChatLoadMessages(chatId: number) {
    try {
      const messages = this.chatService.loadChatMessages(chatId);

      return { messages };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load messages: %s', errorText);

      return { error: errorText };
    }
  }

  private handleChatListChats() {
    try {
      const chats = this.chatService.getAllChats();

      return { chats };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      logger.error('Failed to list chats: %s', errorText);

      return { error: errorText };
    }
  }

  private async handlePromptSelect(prompt: string): Promise<void> {
    const { window: promptSelectorWindow } = await this.windowService.getPromptSelectorWindow();

    promptSelectorWindow.close();

    const { window: chatWindow } = await this.windowService.getChatWindow();

    // Create a new chat session for the prompt
    const settings = await this.settingsService.loadSettings();
    const provider = settings.provider || 'ollama';
    const model = provider === 'ollama'
      ? (settings.ollama.model || '')
      : (settings.lmstudio.model || '');
    const chatId = this.chatService.startNewChat('', provider, model);

    // Save user message
    const userMessage: IChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    try {
      this.chatService.saveMessage(chatId, userMessage);
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      logger.error('Failed to save user message in prompt select: %s', errorText);
    }

    logger.info('Send chat-window-data: %s', prompt);
    chatWindow.webContents.send(EIpcRendererEvent.CHAT_WINDOW_DATA, {
      prompt,
    });

    const response = await this.modelService.sendMessages([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    if (response.error) {
      logger.error('LLM error: %s', response.error);

      // Save error message
      const errorMessage: IChatMessage = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: `Error: ${response.error}`,
        timestamp: new Date(),
      };
      try {
        this.chatService.saveMessage(chatId, errorMessage);
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        logger.error('Failed to save error message: %s', errorText);
      }

      chatWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
        error: response.error,
      });

      return;
    }

    // Save assistant response
    const assistantMessage: IChatMessage = {
      id: Date.now().toString() + '-response',
      role: 'assistant',
      content: response.response,
      timestamp: new Date(),
    };
    try {
      this.chatService.saveMessage(chatId, assistantMessage);
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      logger.error('Failed to save assistant response in prompt select: %s', errorText);
    }

    const result = response.response;
    chatWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
      result,
    });
  }
}

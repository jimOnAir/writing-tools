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
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LIST_CHATS>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_GET>;

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
        case EIpcEvent.CHAT_GET:
          return this.handleChatGet(data.payload.chatId);

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

    logger.info('LLM response received: hasResponse=%s', String('response' in llmResponse));

    // Save assistant response if successful
    if ('response' in llmResponse && llmResponse.response) {
      logger.info('Saving assistant response and triggering title generation');
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

      // Generate title after first exchange (2 messages: user + assistant)
      logger.info('Triggering title generation for chatId=%s', String(chatId));
      void this.generateTitleIfNeeded(chatId);
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

  private handleChatGet(chatId: number) {
    try {
      const chat = this.chatService.getChat(chatId);

      if (chat === null) {
        return { error: `Chat with id ${chatId} not found` };
      }

      return { chat };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get chat: %s', errorText);

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

    logger.info('Send chat-window-data: %s, chatId=%s', prompt, String(chatId));
    chatWindow.webContents.send(EIpcRendererEvent.CHAT_WINDOW_DATA, {
      prompt,
      chatId,
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
        chatId,
      });

      return;
    }

    // Save assistant response
    const assistantMessage: IChatMessage = {
      id: Date.now().toString() + '-response',
      role: 'assistant',
      content: response.response ?? '',
      timestamp: new Date(),
    };
    try {
      this.chatService.saveMessage(chatId, assistantMessage);
      logger.info('Assistant message saved: chatId=%s, messageId=%s', String(chatId), assistantMessage.id);
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      logger.error('Failed to save assistant response in prompt select: %s', errorText);
    }

    const result = response.response ?? '';
    chatWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
      result,
      chatId,
    });

    // Generate title after first exchange (2 messages: user + assistant)
    // Add small delay to ensure database write is committed
    logger.info('Triggering title generation from prompt select for chatId=%s', String(chatId));
    setTimeout(() => {
      void this.generateTitleIfNeeded(chatId);
    }, 100);
  }

  private async generateTitleIfNeeded(chatId: number): Promise<void> {
    logger.info('generateTitleIfNeeded called for chatId=%s', String(chatId));
    try {
      // Load chat messages to check count
      const messages = this.chatService.loadChatMessages(chatId);

      logger.info('Title generation check: chatId=%s, messageCount=%s', String(chatId), String(messages.length));
      logger.info('Messages in DB: %s', JSON.stringify(messages.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length }))));

      // Only generate title after first exchange (2 messages: user + assistant)
      if (messages.length !== 2) {
        logger.info('Title generation skipped: message count is %s (expected 2)', String(messages.length));

        return;
      }

      // Check if title is already set
      const chat = this.chatService.getChat(chatId);
      if (chat === null) {
        logger.error('Title generation failed: chat not found for chatId=%s', String(chatId));

        return;
      }

      if (chat.title.trim() !== '') {
        logger.info('Title generation skipped: chat already has title "%s"', chat.title);

        return;
      }

      // Get first user and assistant messages
      const userMessage = messages.find(m => m.role === 'user');
      const assistantMessage = messages.find(m => m.role === 'assistant');

      if (userMessage === undefined || assistantMessage === undefined) {
        logger.error('Title generation failed: missing user or assistant message');

        return;
      }

      logger.info('Generating title for chatId=%s', String(chatId));

      // Generate title using LLM
      const title = await this.generateChatTitle(userMessage.content, assistantMessage.content);

      if (title !== null && title.trim() !== '') {
        this.chatService.updateChatTitle(chatId, title);
        logger.info('Title generated and saved: chatId=%s, title="%s"', String(chatId), title);

        // Send title update event to chat window
        try {
          logger.info('Attempting to send title update event: chatId=%s', String(chatId));
          const { window: chatWindow } = await this.windowService.getChatWindow();
          if (chatWindow.isDestroyed()) {
            logger.warn('Chat window is destroyed, cannot send title update event: chatId=%s', String(chatId));

            return;
          }

          chatWindow.webContents.send(EIpcRendererEvent.CHAT_TITLE_UPDATED, {
            chatId,
            title,
          });
          logger.info('Title update event sent: chatId=%s, title="%s"', String(chatId), title);
        } catch (error: unknown) {
          const errorText = error instanceof Error ? error.message : String(error);
          logger.error('Failed to send title update event: %s', errorText);
          // Don't throw - title update event failure shouldn't break chat functionality
        }
      } else {
        logger.error('Title generation returned empty result for chatId=%s', String(chatId));
      }
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      logger.error('Failed to generate chat title: %s', errorText);
      // Don't throw - title generation failure shouldn't break chat functionality
    }
  }

  private async generateChatTitle(userMessage: string, assistantMessage: string): Promise<string | null> {
    try {
      const prompt = `Generate a concise title (maximum 5-6 words) for this conversation based on the first exchange:

User: ${userMessage}
Assistant: ${assistantMessage}

Title:`;

      const response = await this.modelService.sendMessages([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      if ('error' in response && response.error) {
        logger.error('Failed to generate chat title: %s', response.error);

        return null;
      }

      if (!response.response) {
        logger.error('Failed to generate chat title: empty response');

        return null;
      }

      // Clean up the title: remove quotes, trim whitespace
      let title = response.response.trim();
      // Remove surrounding quotes if present
      if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
        title = title.slice(1, -1);
      }
      title = title.trim();

      // Limit to reasonable length (e.g., 100 characters)
      const maxTitleLength = 100;
      const ellipsisLength = 3;
      if (title.length > maxTitleLength) {
        title = `${title.slice(0, maxTitleLength - ellipsisLength)}...`;
      }

      return title || null;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      logger.error('Error generating chat title: %s', errorText);

      return null;
    }
  }
}

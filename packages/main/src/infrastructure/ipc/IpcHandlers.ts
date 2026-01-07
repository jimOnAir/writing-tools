/* eslint-disable max-lines */
import type { IChatMessage, ILogger, IMessageStatistics, ISettings, TIpcEvent } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent, EIpcRendererEvent } from '@writing-tools/shared';
import { ipcMain } from 'electron';
import * as os from 'node:os';

import type { IChatService } from '../../domains/chat/IChatService';
import type { IModelService } from '../../domains/llm/IModelService';
import type { IOpenTabsRepository } from '../../domains/open-tabs/IOpenTabsRepository';
import type { ISettingsService } from '../../domains/settings/ISettingsService';
import type { IWindowService } from '../../domains/windows/IWindowService';

import type { IIpcHandlers } from './IIpcHandlers';

type TChannelEventPayloadEnv = TIpcEvent<EIpcChannel.ENV, EIpcEvent.ENV_GET>;

type TSettingChannelEventPayload = TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_LOAD>
  | TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_SAVE>;

type TChannelEventPayloadModel = TIpcEvent<EIpcChannel.MODEL, EIpcEvent.MODEL_LIST>;

type TChatChannelEventPayload = TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_SEND_MESSAGE>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_SEND_MESSAGE_STREAM>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_CREATE_SESSION>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LOAD_MESSAGES>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LIST_CHATS>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LOAD_TABS>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_GET>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_DELETE>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_OPEN>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_SAVE_TABS>;

type TPromptSelectEventPayload = TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT>;

export class IpcHandlers implements IIpcHandlers {
  private readonly chatService: IChatService;
  private readonly logger: ILogger;
  private readonly modelService: IModelService;
  private readonly openTabsRepository: IOpenTabsRepository;
  private readonly settingsService: ISettingsService;
  private readonly windowService: IWindowService;
  private readonly processingChatIds = new Set<number>();

  public constructor(
    settingsService: ISettingsService,
    modelService: IModelService,
    windowService: IWindowService,
    chatService: IChatService,
    logger: ILogger,
    openTabsRepository: IOpenTabsRepository,
  ) {
    this.chatService = chatService;
    this.logger = logger;
    this.modelService = modelService;
    this.openTabsRepository = openTabsRepository;
    this.settingsService = settingsService;
    this.windowService = windowService;
  }

  public register(): void {
    ipcMain.handle(EIpcChannel.ENV, (_, _data: TChannelEventPayloadEnv) => {
      return {
        arch: os.arch(), // 'x64', 'arm64', etc.
        platform: os.platform(), // 'win32', 'darwin', 'linux'
        release: os.release(),
      };
    });

    ipcMain.handle(EIpcChannel.SETTINGS, async (_, data: TSettingChannelEventPayload) => {
      const eventType = data.event;
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
      const eventType = data.event;
      switch (data.event) {
        case EIpcEvent.CHAT_SEND_MESSAGE:
          return this.handleChatSendMessage(data.payload.chatId, data.payload.messages);
        case EIpcEvent.CHAT_SEND_MESSAGE_STREAM:
          return this.handleChatSendMessageStream(data.payload.chatId, data.payload.messages);
        case EIpcEvent.CHAT_CREATE_SESSION:
          return this.handleChatCreateSession(data.payload);
        case EIpcEvent.CHAT_LOAD_MESSAGES:
          return this.handleChatLoadMessages(data.payload.chatId);
        case EIpcEvent.CHAT_LIST_CHATS:
          return this.handleChatListChats();
        case EIpcEvent.CHAT_GET:
          return this.handleChatGet(data.payload.chatId);
        case EIpcEvent.CHAT_DELETE:
          return this.handleChatDelete(data.payload.chatId);
        case EIpcEvent.CHAT_LOAD_TABS:
          return this.handleChatLoadTabs();
        case EIpcEvent.CHAT_OPEN:
          return this.handleChatOpen(data.payload.chatId);
        case EIpcEvent.CHAT_SAVE_TABS:
          return this.handleChatSaveTabs(data.payload.tabs);

        default:
          throw new Error(`Unsupported event: ${eventType}`);
      }
    });

    ipcMain.handle(EIpcChannel.PROMPT_SELECTOR, async (_, data: TPromptSelectEventPayload) => {
      try {
        await this.handlePromptSelect(data.payload.prompt);
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        this.logger.error('Error occurred in handler for \'PROMPT_SELECTOR\': %s', errorText);
        throw error;
      }
    });
  }

  private async handleSettingsLoad() {
    return this.settingsService.loadSettings();
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
    // Prevent duplicate processing for the same chatId
    if (this.processingChatIds.has(chatId)) {
      this.logger.warn('handleChatSendMessage: Already processing chatId=%s, ignoring duplicate request', String(chatId));
      // Return the last message as response to avoid breaking the UI
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        return { response: lastMessage.content, success: true } as const;
      }

      return { error: 'Request already processing', success: false } as const;
    }
    this.processingChatIds.add(chatId);
    try {
      // Save all messages before sending to LLM
      for (const message of messages) {
        try {
          this.chatService.saveMessage(chatId, message);
        } catch (error: unknown) {
          const errorText = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to save message before sending: %s', errorText);
        // Continue even if save fails
        }
      }

      const llmResponse = await this.modelService.sendMessages(messages.map((message => {
        return {
          role: message.role,
          content: message.content,
        };
      })));

      this.logger.info('LLM response received: success=%s', String(llmResponse.success));

      // Save assistant response if successful
      if (llmResponse.success) {
        this.logger.info('Saving assistant response and triggering title generation');

        // Log statistics for debugging
        if (llmResponse.statistics === undefined) {
          this.logger.warn('LLM response does not include statistics');
        } else {
          this.logger.info('LLM response includes statistics: provider=%s, model=%s', llmResponse.statistics.provider, llmResponse.statistics.model ?? 'unknown');
        }

        const assistantMessage: IChatMessage = {
          id: `${Date.now().toString()}-response`,
          role: 'assistant',
          content: llmResponse.response,
          timestamp: new Date(),
          statistics: llmResponse.statistics,
        };

        try {
          this.chatService.saveMessage(chatId, assistantMessage);
        } catch (error: unknown) {
          const errorText = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to save assistant response: %s', errorText);
          // Continue even if save fails
        }

        // Generate title after first exchange (2 messages: user + assistant)
        // ChatService.updateChatTitle will send CHAT_TITLE_UPDATED event
        this.logger.info('Triggering title generation for chatId=%s', String(chatId));
        void this.generateTitleIfNeeded(chatId);
      }

      return llmResponse;
    } finally {
      this.processingChatIds.delete(chatId);
    }
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
          this.chatService.saveMessage(chatId, message);
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

  private async streamLLMResponse(
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
        this.chatService.saveMessage(chatId, assistantMessage);
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to save streamed assistant response: %s', errorText);
      }

      // Send stream end event
      mainWindow.webContents.send(EIpcRendererEvent.CHAT_STREAM_END, {
        chatId,
        fullContent: trimmedContent,
      });

      this.logger.info('Streaming completed for chatId=%s', String(chatId));

      // Generate title after first exchange
      void this.generateTitleIfNeeded(chatId);
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Streaming error for chatId=%s: %s', String(chatId), errorText);

      // Send error to renderer
      mainWindow.webContents.send(EIpcRendererEvent.CHAT_STREAM_END, {
        chatId,
        error: errorText,
        fullContent,
      });
    } finally {
      this.processingChatIds.delete(chatId);
    }
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
      // ChatService now handles CHAT_CREATED event notification

      return { chatId };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create chat session: %s', errorText);

      return { error: errorText };
    }
  }

  private handleChatLoadMessages(chatId: number) {
    try {
      const messages = this.chatService.loadChatMessages(chatId);

      return { messages };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to load messages: %s', errorText);

      return { error: errorText };
    }
  }

  private handleChatListChats() {
    try {
      const chats = this.chatService.getAllChats();

      return { chats };
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
      // ChatService now handles CHAT_DELETED event notification
      this.chatService.deleteChat(chatId);

      return { success: true };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to delete chat: %s', errorText);

      return { success: false, error: errorText };
    }
  }

  private handleChatLoadTabs() {
    try {
      const tabs = this.openTabsRepository.loadOpenTabs();

      return { tabs };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to load tabs: %s', errorText);

      return { error: errorText };
    }
  }

  private handleChatSaveTabs(tabs: Array<{ chatId: number | null, tabOrder: number, isActive: boolean }>) {
    try {
      this.openTabsRepository.saveOpenTabs(tabs);

      return { success: true };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to save tabs: %s', errorText);

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
      const messages = this.chatService.loadChatMessages(chatId);

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

  private async handlePromptSelect(prompt: string): Promise<void> {
    const { window: mainWindow } = await this.windowService.getMainWindow();

    // Create a new chat session for the prompt
    const settings = await this.settingsService.loadSettings();
    const provider = settings.provider || 'ollama';
    const model = provider === 'ollama'
      ? (settings.ollama.model || '')
      : (settings.lmstudio.model || '');
    const chatId = this.chatService.startNewChat('', provider, model);
    // ChatService now handles CHAT_CREATED event notification

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
      this.logger.error('Failed to save user message in prompt select: %s', errorText);
    }

    this.logger.info('Send chat-window-data: %s, chatId=%s', prompt, String(chatId));
    mainWindow.webContents.send(EIpcRendererEvent.CHAT_WINDOW_DATA, {
      prompt,
      chatId,
    });

    const response = await this.modelService.sendMessages([
      {
        role: 'user',
        content: prompt,
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
        this.chatService.saveMessage(chatId, errorMessage);
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
      this.chatService.saveMessage(chatId, assistantMessage);
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
      void this.generateTitleIfNeeded(chatId);
    }, 100);
  }

  private async generateTitleIfNeeded(chatId: number): Promise<void> {
    this.logger.info('generateTitleIfNeeded called for chatId=%s', String(chatId));
    try {
      // Load chat messages to check count
      const messages = this.chatService.loadChatMessages(chatId);

      this.logger.info('Title generation check: chatId=%s, messageCount=%s', String(chatId), String(messages.length));
      this.logger.info('Messages in DB: %s', JSON.stringify(messages.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length }))));

      // Only generate title after first exchange (2 messages: user + assistant)
      if (messages.length !== 2) {
        this.logger.info('Title generation skipped: message count is %s (expected 2)', String(messages.length));

        return;
      }

      // Check if title is already set
      const chat = this.chatService.getChat(chatId);
      if (chat === null) {
        this.logger.error('Title generation failed: chat not found for chatId=%s', String(chatId));

        return;
      }

      if (chat.title.trim() !== '') {
        this.logger.info('Title generation skipped: chat already has title "%s"', chat.title);

        return;
      }

      // Get first user and assistant messages
      const userMessage = messages.find(m => m.role === 'user');
      const assistantMessage = messages.find(m => m.role === 'assistant');

      if (userMessage === undefined || assistantMessage === undefined) {
        this.logger.error('Title generation failed: missing user or assistant message');

        return;
      }

      this.logger.info('Generating title for chatId=%s', String(chatId));

      // Generate title using LLM
      const title = await this.generateChatTitle(userMessage.content, assistantMessage.content);

      if (title !== null && title.trim() !== '') {
        // ChatService.updateChatTitle now handles CHAT_TITLE_UPDATED event notification
        this.chatService.updateChatTitle(chatId, title);
        this.logger.info('Title generated and saved: chatId=%s, title="%s"', String(chatId), title);
      } else {
        this.logger.error('Title generation returned empty result for chatId=%s', String(chatId));
      }
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to generate chat title: %s', errorText);
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
          content: prompt,
          role: 'user',
        },
      ], { maxTokens: 10 });

      if (!response.success) {
        this.logger.error('Failed to generate chat title: %s', response.error);

        return null;
      }

      // Clean up the title: remove quotes, trim whitespace (no backend truncation)
      let title = response.response.trim();
      // Remove surrounding quotes if present
      if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
        title = title.slice(1, -1);
      }
      title = title.trim();

      return title || null;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Error generating chat title: %s', errorText);

      return null;
    }
  }
}

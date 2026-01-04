/* eslint-disable max-lines */
import type { IChatMessage, ILogger, ISettings, TIpcEvent } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent, EIpcRendererEvent } from '@writing-tools/shared';
import { BrowserWindow, ipcMain } from 'electron';
import * as fs from 'node:fs';
import * as os from 'node:os';

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
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_GET>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_DELETE>
  | TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_OPEN>;

type TPromptSelectEventPayload = TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT>;

export class IpcHandlers implements IIpcHandlers {
  private readonly chatService: IChatService;
  private readonly logger: ILogger;
  private readonly modelService: IModelService;
  private readonly settingsService: ISettingsService;
  private readonly windowService: IWindowService;
  private readonly processingChatIds = new Set<number>();

  public constructor(
    settingsService: ISettingsService,
    modelService: IModelService,
    windowService: IWindowService,
    chatService: IChatService,
    logger: ILogger,
  ) {
    this.chatService = chatService;
    this.logger = logger;
    this.modelService = modelService;
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
        case EIpcEvent.CHAT_OPEN:
          return this.handleChatOpen(data.payload.chatId);

        default:
          throw new Error(`Unsupported event: ${eventType}`);
      }
    });

    ipcMain.handle(EIpcChannel.PROMPT_SELECTOR, async (_, data: TPromptSelectEventPayload) => {
      return this.handlePromptSelect(data.payload.prompt);
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
        const assistantMessage: IChatMessage = {
          id: `${Date.now().toString()}-response`,
          role: 'assistant',
          content: llmResponse.response,
          timestamp: new Date(),
        };

        try {
          this.chatService.saveMessage(chatId, assistantMessage);
        } catch (error: unknown) {
          const errorText = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to save assistant response: %s', errorText);
        // Continue even if save fails
        }

        // Generate title after first exchange (2 messages: user + assistant)
        this.logger.info('Triggering title generation for chatId=%s', String(chatId));
        void this.generateTitleIfNeeded(chatId);
      }

      return llmResponse;
    } finally {
      this.processingChatIds.delete(chatId);
    }
  }

  private async handleChatCreateSession(payload: { title?: string, provider?: string, model?: string }) {
    // #region agent log
    try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:188',message:'handleChatCreateSession entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n');}catch(_){}
    // #endregion
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
      // #region agent log
      try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:207',message:'Chat created before window notification',data:{chatId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})+'\n');}catch(_){}
      // #endregion

      // Notify main chat window if it already exists (don't create window just to notify)
      try {
        // #region agent log
        try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:212',message:'Before getChatWindow call',data:{chatId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})+'\n');}catch(_){}
        // #endregion
        const { window: chatWindow, created: chatWindowCreated } = await this.windowService.getChatWindow();
        // #region agent log
        try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:215',message:'After getChatWindow call',data:{chatId,chatWindowCreated,isDestroyed:chatWindow.isDestroyed()},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})+'\n');}catch(_){}
        // #endregion
        // Only send notification if window already existed (created === false)
        // If window was just created (created === true), don't send notification and close it
        if (chatWindowCreated === false && !chatWindow.isDestroyed()) {
          // #region agent log
          try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:218',message:'Sending CHAT_CREATED notification to existing window',data:{chatId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})+'\n');}catch(_){}
          // #endregion
          chatWindow.webContents.send(EIpcRendererEvent.CHAT_CREATED, {
            chatId,
          });
        } else if (chatWindowCreated === true) {
          // #region agent log
          try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:223',message:'Window was created unnecessarily, closing it',data:{chatId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})+'\n');}catch(_){}
          // #endregion
          // Window was created unnecessarily - close it to prevent it from showing
          chatWindow.close();
        }
      } catch (error: unknown) {
        // #region agent log
        const errorText = error instanceof Error ? error.message : String(error);
        try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:229',message:'Error in getChatWindow try block',data:{chatId,error:errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'B'})+'\n');}catch(_){}
        // #endregion
        // Chat window might not exist, ignore
      }

      // Notify chat list window if it already exists (don't create window just to notify)
      try {
        // #region agent log
        try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:235',message:'Before getChatListWindow call',data:{chatId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})+'\n');}catch(_){}
        // #endregion
        const { window: chatListWindow, created: chatListWindowCreated } = await this.windowService.getChatListWindow();
        // #region agent log
        try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:238',message:'After getChatListWindow call',data:{chatId,chatListWindowCreated,isDestroyed:chatListWindow.isDestroyed()},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})+'\n');}catch(_){}
        // #endregion
        // Only send notification if window already existed (created === false)
        // If window was just created (created === true), don't send notification and close it
        if (chatListWindowCreated === false && !chatListWindow.isDestroyed()) {
          // #region agent log
          try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:242',message:'Sending CHAT_CREATED notification to existing chat list window',data:{chatId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})+'\n');}catch(_){}
          // #endregion
          chatListWindow.webContents.send(EIpcRendererEvent.CHAT_CREATED, {
            chatId,
          });
        } else if (chatListWindowCreated === true) {
          // #region agent log
          try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:248',message:'Chat list window was created unnecessarily, closing it',data:{chatId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})+'\n');}catch(_){}
          // #endregion
          // Window was created unnecessarily - close it to prevent it from showing
          chatListWindow.close();
        }
      } catch {
        // Chat list window might not exist, ignore
      }

      // #region agent log
      try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:255',message:'handleChatCreateSession exit',data:{chatId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})+'\n');}catch(_){}
      // #endregion
      return { chatId };
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      // #region agent log
      try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:234',message:'handleChatCreateSession error',data:{error:errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n');}catch(_){}
      // #endregion
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

  private async handleChatDelete(chatId: number) {
    try {
      // Check if chat exists before deleting
      const chat = this.chatService.getChat(chatId);
      if (chat === null) {
        return { success: false, error: `Chat with id ${String(chatId)} not found` };
      }

      // Delete the chat (messages cascade delete automatically)
      this.chatService.deleteChat(chatId);

      // Notify all existing windows (don't create windows just to notify)
      // Each window's renderer will handle the notification if it has tabs that need closing
      const allWindows = BrowserWindow.getAllWindows();
      for (const win of allWindows) {
        if (!win.isDestroyed()) {
          try {
            win.webContents.send(EIpcRendererEvent.CHAT_DELETED, {
              chatId,
            });
          } catch {
            // Window might be destroyed, ignore
          }
        }
      }

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

      // Get or create chat window
      const { window: chatWindow } = await this.windowService.getChatWindow();

      // Load messages for this chat
      const messages = this.chatService.loadChatMessages(chatId);

      // Send messages to chat window
      chatWindow.webContents.send(EIpcRendererEvent.CHAT_LOAD_MESSAGES_DATA, {
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
      this.logger.error('Failed to save user message in prompt select: %s', errorText);
    }

    this.logger.info('Send chat-window-data: %s, chatId=%s', prompt, String(chatId));
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

      chatWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
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
    chatWindow.webContents.send(EIpcRendererEvent.OLLAMA_RESPONSE, {
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
        this.chatService.updateChatTitle(chatId, title);
        this.logger.info('Title generated and saved: chatId=%s, title="%s"', String(chatId), title);

        // Send title update event to chat window if it already exists (don't create window just to notify)
        try {
          // #region agent log
          try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:539',message:'Before getChatWindow call for title update',data:{chatId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})+'\n');}catch(_){}
          // #endregion
          this.logger.info('Attempting to send title update event: chatId=%s', String(chatId));
          const { window: chatWindow, created: chatWindowCreated } = await this.windowService.getChatWindow();
          // #region agent log
          try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:542',message:'After getChatWindow call for title update',data:{chatId,chatWindowCreated,isDestroyed:chatWindow.isDestroyed()},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})+'\n');}catch(_){}
          // #endregion
          // Only send notification if window already existed (created === false)
          // If window was just created (created === true), don't send notification and close it
          if (chatWindowCreated === false && !chatWindow.isDestroyed()) {
            // #region agent log
            try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:545',message:'Sending CHAT_TITLE_UPDATED notification to existing window',data:{chatId,title},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})+'\n');}catch(_){}
            // #endregion
            chatWindow.webContents.send(EIpcRendererEvent.CHAT_TITLE_UPDATED, {
              chatId,
              title,
            });
            this.logger.info('Title update event sent: chatId=%s, title="%s"', String(chatId), title);
          } else if (chatWindowCreated === true) {
            // #region agent log
            try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:554',message:'Window was created unnecessarily for title update, closing it',data:{chatId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})+'\n');}catch(_){}
            // #endregion
            // Window was created unnecessarily - close it to prevent it from showing
            chatWindow.close();
          } else if (chatWindow.isDestroyed()) {
            this.logger.warn('Chat window is destroyed, cannot send title update event: chatId=%s', String(chatId));
          }
        } catch (error: unknown) {
          const errorText = error instanceof Error ? error.message : String(error);
          // #region agent log
          try{fs.appendFileSync('/home/dmitry/github/writing-tools/.cursor/debug.log',JSON.stringify({location:'IpcHandlers.ts:561',message:'Error sending title update event',data:{chatId,error:errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'B'})+'\n');}catch(_){}
          // #endregion
          this.logger.error('Failed to send title update event: %s', errorText);
          // Don't throw - title update event failure shouldn't break chat functionality
        }
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
          role: 'user',
          content: prompt,
        },
      ]);

      if (!response.success) {
        this.logger.error('Failed to generate chat title: %s', response.error);

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
      this.logger.error('Error generating chat title: %s', errorText);

      return null;
    }
  }
}

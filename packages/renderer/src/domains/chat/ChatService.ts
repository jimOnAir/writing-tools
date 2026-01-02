import type { IChatWindowData, IChatMessage, TChatResponse, TIpcEvent, IChatInfo } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent, logger } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import type { TIpcRenderListener } from '../../types/TIpcRenderListener';
import { isErrorResponse } from '../../utils/responseTypeGuards';

/**
 * Service for managing chat domain logic
 * Handles message state, IPC communication, and chat operations
 */
export class ChatService {
  private readonly ipcAdapter: IIpcAdapter;
  private messages: IChatMessage[] = [];
  private isLoading = false;
  private error: string | null = null;
  private historyIndex = -1;
  private isHandlingOllamaResponse = false;
  private chatWindowDataListener: TIpcRenderListener | null = null;
  private ollamaResponseListener: TIpcRenderListener | null = null;
  private chatTitleUpdatedListener: TIpcRenderListener | null = null;
  private chatLoadMessagesDataListener: TIpcRenderListener | null = null;
  private chatDeletedListener: TIpcRenderListener | null = null;
  private currentChatId: number | null = null;

  // Callbacks for component state updates
  private onMessagesChange?: (messages: IChatMessage[]) => void;
  private onLoadingChange?: (isLoading: boolean) => void;
  private onErrorChange?: (error: string | null) => void;
  private onHistoryIndexChange?: (index: number) => void;
  private onHandlingResponseChange?: (isHandling: boolean) => void;
  private onTitleChange?: (title: string) => void;

  public constructor(ipcAdapter: IIpcAdapter) {
    this.ipcAdapter = ipcAdapter;
  }

  /**
   * Register callbacks for state changes
   */
  public setCallbacks(callbacks: {
    onMessagesChange?: (messages: IChatMessage[]) => void,
    onLoadingChange?: (isLoading: boolean) => void,
    onErrorChange?: (error: string | null) => void,
    onHistoryIndexChange?: (index: number) => void,
    onHandlingResponseChange?: (isHandling: boolean) => void,
    onTitleChange?: (title: string) => void,
  }): void {
    this.onMessagesChange = callbacks.onMessagesChange;
    this.onLoadingChange = callbacks.onLoadingChange;
    this.onErrorChange = callbacks.onErrorChange;
    this.onHistoryIndexChange = callbacks.onHistoryIndexChange;
    this.onHandlingResponseChange = callbacks.onHandlingResponseChange;
    this.onTitleChange = callbacks.onTitleChange;
  }

  /**
   * Initialize IPC listeners for chat events
   */
  public initializeListeners(): void {
    const handleChatWindowData = (data: IChatWindowData) => {
      if (data.prompt) {
        logger.info('Clearing previous conversation and starting new one with prompt: %s, chatId=%s', data.prompt, data.chatId !== undefined ? String(data.chatId) : 'undefined');
        const initialMessages: IChatMessage[] = [
          {
            id: Date.now().toString(),
            role: 'user',
            content: data.prompt,
            timestamp: new Date(),
          },
        ];

        this.setMessages(initialMessages);
        this.setLoading(true);
        // Set currentChatId if provided (for hotkey/prompt select flows), otherwise reset to null
        if (data.chatId !== undefined) {
          this.currentChatId = data.chatId;
          logger.info('ChatId set from CHAT_WINDOW_DATA: chatId=%s', String(data.chatId));
        } else {
          this.currentChatId = null;
        }
      }
    };

    const handleOllamaResponse = (response: TChatResponse) => {
      logger.info('Current messages count: %s', this.messages.length.toString());

      // Update currentChatId if provided (for hotkey/prompt select flows)
      if (response.chatId !== undefined && this.currentChatId === null) {
        this.currentChatId = response.chatId;
        logger.info('ChatId set from response: chatId=%s', String(response.chatId));
      }

      this.setHandlingResponse(true);

      // Handle error response
      if (isErrorResponse(response)) {
        const errorMessage: IChatMessage = {
          id: `${Date.now().toString()}-error`,
          role: 'assistant',
          content: `Error: ${response.error}`,
          timestamp: new Date(),
        };
        this.addMessage(errorMessage);
        this.setLoading(false);

        setTimeout(() => {
          this.setHandlingResponse(false);
        }, 100);

        return;
      }

      // Handle successful response
      if ('result' in response) {
        const assistantMessage: IChatMessage = {
          id: `${Date.now().toString()}-response`,
          role: 'assistant',
          content: response.result,
          timestamp: new Date(),
        };

        this.addMessage(assistantMessage);
        this.setLoading(false);

        setTimeout(() => {
          this.setHandlingResponse(false);
        }, 100);
      }
    };

    const handleChatTitleUpdated = (data: { chatId: number, title: string }) => {
      // Update title if it matches the current chat, or if currentChatId is null
      // (which happens when chat is created via hotkey/prompt select)
      if (this.currentChatId === data.chatId || this.currentChatId === null) {
        logger.info('Title updated for current chat: chatId=%s, title="%s", currentChatId=%s', String(data.chatId), data.title, this.currentChatId === null ? 'null' : String(this.currentChatId));
        this.onTitleChange?.(data.title);
        // If currentChatId was null, set it now so future updates match correctly
        if (this.currentChatId === null) {
          this.currentChatId = data.chatId;
        }
      } else {
        logger.info('Title update ignored: chatId=%s does not match currentChatId=%s', String(data.chatId), String(this.currentChatId));
      }
    };

    const handleChatLoadMessagesData = (data: { chatId: number, messages: IChatMessage[] }) => {
      logger.info('Loading messages for chat: chatId=%s, messageCount=%s', String(data.chatId), String(data.messages.length));
      this.currentChatId = data.chatId;
      this.setMessages(data.messages);
      this.setLoading(false);
      this.setError(null);
    };

    const handleChatDeleted = (data: { chatId: number }) => {
      // If the deleted chat is the current chat, close the window
      if (this.currentChatId === data.chatId) {
        logger.info('Current chat was deleted, closing window: chatId=%s', String(data.chatId));
        globalThis.close();
      }
    };

    try {
      this.chatWindowDataListener = this.ipcAdapter.onChatWindowData(handleChatWindowData);
      this.ollamaResponseListener = this.ipcAdapter.onOllamaResponse(handleOllamaResponse);
      this.chatTitleUpdatedListener = this.ipcAdapter.onChatTitleUpdated(handleChatTitleUpdated);
      this.chatLoadMessagesDataListener = this.ipcAdapter.onChatLoadMessagesData(handleChatLoadMessagesData);
      this.chatDeletedListener = this.ipcAdapter.onChatDeleted(handleChatDeleted);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize chat listeners: %s', errorText);
    }
  }

  /**
   * Cleanup IPC listeners
   */
  public cleanupListeners(): void {
    if (this.chatWindowDataListener) {
      this.ipcAdapter.offChatWindowData(this.chatWindowDataListener);
      this.chatWindowDataListener = null;
    }

    if (this.ollamaResponseListener) {
      this.ipcAdapter.offOllamaResponse(this.ollamaResponseListener);
      this.ollamaResponseListener = null;
    }

    if (this.chatTitleUpdatedListener) {
      this.ipcAdapter.offChatTitleUpdated(this.chatTitleUpdatedListener);
      this.chatTitleUpdatedListener = null;
    }

    if (this.chatLoadMessagesDataListener) {
      this.ipcAdapter.offChatLoadMessagesData(this.chatLoadMessagesDataListener);
      this.chatLoadMessagesDataListener = null;
    }

    if (this.chatDeletedListener) {
      this.ipcAdapter.offChatDeleted(this.chatDeletedListener);
      this.chatDeletedListener = null;
    }
  }

  /**
   * Send a message to the chat
   */
  public async sendMessage(inputValue: string): Promise<string | null> {
    if (!inputValue.trim() || this.isLoading) {
      return null;
    }

    // Ensure we have a chatId before sending
    if (this.currentChatId === null) {
      const chatId = await this.createNewChatSession();
      if (chatId === null) {
        logger.error('Cannot send message: no chat session available');
        this.setError('Failed to create chat session');

        return 'Failed to create chat session';
      }
    }

    this.setHandlingResponse(true);

    const userMessage: IChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    this.addMessage(userMessage);
    this.setLoading(true);
    this.setError(null);
    this.setHistoryIndex(-1);

    const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_SEND_MESSAGE> = {
      channel: EIpcChannel.CHAT,
      event: EIpcEvent.CHAT_SEND_MESSAGE,
      payload: { chatId: this.currentChatId!, messages: this.messages },
    };

    try {
      const response = await this.ipcAdapter.invoke(EIpcChannel.CHAT, payload);

      if (isErrorResponse(response)) {
        throw new Error(response.error);
      }

      const assistantMessage: IChatMessage = {
        id: `${Date.now().toString()}-response`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };
      this.addMessage(assistantMessage);

      return null;
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);

      logger.error('Failed to send message: %s', errorText);
      this.setError(`Failed to send message: ${errorText}`);

      const errorMessage: IChatMessage = {
        id: `${Date.now().toString()}-error`,
        role: 'assistant',
        content: `Error: ${errorText}`,
        timestamp: new Date(),
      };
      this.addMessage(errorMessage);

      return errorText;
    } finally {
      this.setLoading(false);
      setTimeout(() => {
        this.setHandlingResponse(false);
      }, 100);
    }
  }

  /**
   * Navigate message history (Arrow Up)
   */
  public navigateHistoryUp(): string | null {
    const userMessages = this.messages.filter(
      msg => msg.role === 'user' && msg.content.trim() !== '',
    );

    if (userMessages.length === 0) {
      return null;
    }

    if (this.historyIndex === -1) {
      this.setHistoryIndex(0);

      return userMessages[userMessages.length - 1].content;
    } else if (this.historyIndex < userMessages.length - 1) {
      const newIndex = this.historyIndex + 1;
      this.setHistoryIndex(newIndex);

      return userMessages[userMessages.length - 1 - newIndex].content;
    }

    return null;
  }

  /**
   * Navigate message history (Arrow Down)
   */
  public navigateHistoryDown(): string | null {
    const userMessages = this.messages.filter(
      msg => msg.role === 'user' && msg.content.trim() !== '',
    );

    if (userMessages.length === 0 || this.historyIndex === -1) {
      return null;
    }

    if (this.historyIndex > 0) {
      const newIndex = this.historyIndex - 1;
      this.setHistoryIndex(newIndex);

      return userMessages[userMessages.length - 1 - newIndex].content;
    } else {
      this.setHistoryIndex(-1);

      return '';
    }
  }

  /**
   * Get current messages
   */
  public getMessages(): IChatMessage[] {
    return this.messages;
  }

  /**
   * Get loading state
   */
  public getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Get error state
   */
  public getError(): string | null {
    return this.error;
  }

  /**
   * Get history index
   */
  public getHistoryIndex(): number {
    return this.historyIndex;
  }

  /**
   * Get handling response state
   */
  public getIsHandlingResponse(): boolean {
    return this.isHandlingOllamaResponse;
  }

  /**
   * Get current chat ID
   */
  public getCurrentChatId(): number | null {
    return this.currentChatId;
  }

  /**
   * Get chat info by ID
   */
  public async getChatInfo(chatId: number): Promise<IChatInfo | null> {
    try {
      const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_GET> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_GET,
        payload: { chatId },
      };

      const response = await this.ipcAdapter.invoke(EIpcChannel.CHAT, payload);

      if (isErrorResponse(response)) {
        logger.error('Failed to get chat info: %s', response.error);

        return null;
      }

      return response.chat;
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to get chat info: %s', errorText);

      return null;
    }
  }

  /**
   * Load messages for a specific chat
   */
  public async loadChatMessages(chatId: number): Promise<void> {
    try {
      const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LOAD_MESSAGES> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LOAD_MESSAGES,
        payload: { chatId },
      };

      const response = await this.ipcAdapter.invoke(EIpcChannel.CHAT, payload);

      if (isErrorResponse(response)) {
        logger.error('Failed to load messages: %s', response.error);
        this.setError(`Failed to load messages: ${response.error}`);

        return;
      }

      this.currentChatId = chatId;
      this.setMessages(response.messages);
      this.setLoading(false);
      this.setError(null);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to load messages: %s', errorText);
      this.setError(`Failed to load messages: ${errorText}`);
    }
  }

  /**
   * Delete a chat
   */
  public async deleteChat(chatId: number): Promise<string | null> {
    try {
      const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_DELETE> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_DELETE,
        payload: { chatId },
      };

      const response = await this.ipcAdapter.invoke(EIpcChannel.CHAT, payload);

      if (isErrorResponse(response)) {
        logger.error('Failed to delete chat: %s', response.error);

        return response.error;
      }

      // If the deleted chat is the current chat, clear the state
      if (this.currentChatId === chatId) {
        this.currentChatId = null;
        this.setMessages([]);
      }

      return null;
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to delete chat: %s', errorText);

      return errorText;
    }
  }

  /**
   * Create a new chat session in the database
   */
  private async createNewChatSession(): Promise<number | null> {
    try {
      const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_CREATE_SESSION> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_CREATE_SESSION,
        payload: {},
      };

      const response = await this.ipcAdapter.invoke(EIpcChannel.CHAT, payload);

      if (isErrorResponse(response)) {
        logger.error('Failed to create chat session: %s', response.error);
        this.currentChatId = null;

        return null;
      } else {
        this.currentChatId = response.chatId;
        logger.info('Created new chat session with ID: %s', response.chatId.toString());

        return response.chatId;
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to create chat session: %s', errorText);
      this.currentChatId = null;

      return null;
    }
  }

  // Private setters that trigger callbacks
  private setMessages(messages: IChatMessage[]): void {
    this.messages = messages;
    this.onMessagesChange?.(messages);
  }

  private addMessage(message: IChatMessage): void {
    this.messages = [...this.messages, message];
    this.onMessagesChange?.(this.messages);
  }

  private setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    this.onLoadingChange?.(isLoading);
  }

  private setError(error: string | null): void {
    this.error = error;
    this.onErrorChange?.(error);
  }

  private setHistoryIndex(index: number): void {
    this.historyIndex = index;
    this.onHistoryIndexChange?.(index);
  }

  private setHandlingResponse(isHandling: boolean): void {
    this.isHandlingOllamaResponse = isHandling;
    this.onHandlingResponseChange?.(isHandling);
  }
}

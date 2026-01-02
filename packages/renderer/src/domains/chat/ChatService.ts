import type { IChatWindowData, IChatMessage, TChatResponse, TIpcEvent } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent, logger } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import type { TIpcRenderListener } from '../../types/TIpcRenderListener';

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

  // Callbacks for component state updates
  private onMessagesChange?: (messages: IChatMessage[]) => void;
  private onLoadingChange?: (isLoading: boolean) => void;
  private onErrorChange?: (error: string | null) => void;
  private onHistoryIndexChange?: (index: number) => void;
  private onHandlingResponseChange?: (isHandling: boolean) => void;

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
  }): void {
    this.onMessagesChange = callbacks.onMessagesChange;
    this.onLoadingChange = callbacks.onLoadingChange;
    this.onErrorChange = callbacks.onErrorChange;
    this.onHistoryIndexChange = callbacks.onHistoryIndexChange;
    this.onHandlingResponseChange = callbacks.onHandlingResponseChange;
  }

  /**
   * Initialize IPC listeners for chat events
   */
  public initializeListeners(): void {
    const handleChatWindowData = (data: IChatWindowData) => {
      if (data.prompt) {
        logger.info('Clearing previous conversation and starting new one with prompt: %s', data.prompt);
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
      }
    };

    const handleOllamaResponse = (response: TChatResponse) => {
      logger.info('Current messages count: %s', this.messages.length.toString());

      this.setHandlingResponse(true);

      // Handle error response
      if ('error' in response) {
        const errorMessage: IChatMessage = {
          id: Date.now().toString() + '-error',
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
          id: Date.now().toString() + '-response',
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

    try {
      this.chatWindowDataListener = this.ipcAdapter.onChatWindowData(handleChatWindowData);
      this.ollamaResponseListener = this.ipcAdapter.onOllamaResponse(handleOllamaResponse);
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
  }

  /**
   * Send a message to the chat
   */
  public async sendMessage(inputValue: string): Promise<string | null> {
    if (!inputValue.trim() || this.isLoading) {
      return null;
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
      payload: { messages: this.messages },
    };

    try {
      const response = await this.ipcAdapter.invoke(EIpcChannel.CHAT, payload);

      if ('error' in response) {
        throw new Error(response.error);
      }

      const assistantMessage: IChatMessage = {
        id: Date.now().toString() + '-response',
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };
      this.addMessage(assistantMessage);

      return null;
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);

      logger.error('Failed to send message to Ollama: %s', errorText);
      this.setError(`Failed to send message: ${errorText}`);

      const errorMessage: IChatMessage = {
        id: Date.now().toString() + '-error',
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

import type { IChatFollowUpQuestions, IChatMessage, TChatResponse, TIpcEvent, IChatInfo, IChatStreamChunk, IChatStreamEnd, ILogger, IMessageStatistics, IPreconfiguredPrompt, IPromptSelectorData, EStreamingErrorType } from '@writing-tools/shared';
import { classifyStreamingError, EIpcChannel, EIpcEvent } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import type { TIpcRenderListener } from '../../types/TIpcRenderListener';
import { isErrorResponse } from '../../utils/responseTypeGuards';

// TODO: generate unique chat uuid and use it as idempotency key
/**
 * Service for managing chat domain logic
 * Handles message state, IPC communication, and chat operations
 */
export class ChatService {
  private readonly ipcAdapter: IIpcAdapter;
  private readonly logger: ILogger;
  private messages: IChatMessage[] = [];
  private isLoading = false;
  private error: string | null = null;
  private errorType: EStreamingErrorType | undefined = undefined;
  private historyIndex = -1;
  private isHandlingOllamaResponse = false;
  private isStreaming = false;
  private streamingMessageId: string | null = null;
  private streamingContent = '';
  private promptSelectedListener: TIpcRenderListener | null = null;
  private ollamaResponseListener: TIpcRenderListener | null = null;
  private chatTitleUpdatedListener: TIpcRenderListener | null = null;
  private chatLoadMessagesDataListener: TIpcRenderListener | null = null;
  private chatDeletedListener: TIpcRenderListener | null = null;
  private chatStreamChunkListener: TIpcRenderListener | null = null;
  private chatStreamEndListener: TIpcRenderListener | null = null;
  private currentChatId: number | null = null;

  // UI state persisted across tab switches (and restored on reopen)
  private modelOverride: { model: string, provider: 'ollama' | 'lmstudio' } | null = null;
  private scrollPosition = 0;

  // Prompt-selector state (pushed by MultiChatService via setPromptSelectorData)
  private selectedText = '';
  private preconfiguredPrompts: IPreconfiguredPrompt[] = [];

  // Callbacks for component state updates
  private onMessagesChange?: (messages: IChatMessage[]) => void;
  private onLoadingChange?: (isLoading: boolean) => void;
  private onErrorChange?: (error: string | null, errorType?: EStreamingErrorType) => void;
  private onHistoryIndexChange?: (index: number) => void;
  private onHandlingResponseChange?: (isHandling: boolean) => void;
  private onModelOverrideChange?: (override: { model: string, provider: 'ollama' | 'lmstudio' } | null) => void;
  private onTitleChange?: (title: string) => void;
  private onStreamingChange?: (isStreaming: boolean) => void;
  private onFollowUpQuestionsChange?: (chatId: number, questions: string[]) => void;
  private onPromptsChange?: (prompts: IPreconfiguredPrompt[]) => void;
  private onSelectedTextChange?: (text: string) => void;
  // Support multiple title change callbacks (for ChatComponent and MultiChatService)
  private readonly onTitleChangeCallbacks = new Set<(title: string) => void>();
  private chatFollowUpQuestionsListener: TIpcRenderListener | null = null;

  public constructor(ipcAdapter: IIpcAdapter, logger: ILogger) {
    this.ipcAdapter = ipcAdapter;
    this.logger = logger;
  }

  /**
   * Register callbacks for state changes
   */
  public setCallbacks(callbacks: {
    onErrorChange?: (error: string | null, errorType?: EStreamingErrorType) => void,
    onFollowUpQuestionsChange?: (chatId: number, questions: string[]) => void,
    onHandlingResponseChange?: (isHandling: boolean) => void,
    onHistoryIndexChange?: (index: number) => void,
    onLoadingChange?: (isLoading: boolean) => void,
    onMessagesChange?: (messages: IChatMessage[]) => void,
    onModelOverrideChange?: (override: { model: string, provider: 'ollama' | 'lmstudio' } | null) => void,
    onPromptsChange?: (prompts: IPreconfiguredPrompt[]) => void,
    onSelectedTextChange?: (text: string) => void,
    onStreamingChange?: (isStreaming: boolean) => void,
    onTitleChange?: (title: string) => void,
  }): void {
    this.onErrorChange = callbacks.onErrorChange;
    this.onFollowUpQuestionsChange = callbacks.onFollowUpQuestionsChange;
    this.onHandlingResponseChange = callbacks.onHandlingResponseChange;
    this.onHistoryIndexChange = callbacks.onHistoryIndexChange;
    this.onLoadingChange = callbacks.onLoadingChange;
    this.onMessagesChange = callbacks.onMessagesChange;
    this.onModelOverrideChange = callbacks.onModelOverrideChange;
    this.onPromptsChange = callbacks.onPromptsChange;
    this.onSelectedTextChange = callbacks.onSelectedTextChange;
    this.onStreamingChange = callbacks.onStreamingChange;
    this.onTitleChange = callbacks.onTitleChange;
    // Also add to multiple callbacks set for title changes
    if (callbacks.onTitleChange !== undefined) {
      this.onTitleChangeCallbacks.add(callbacks.onTitleChange);
    }
  }

  /**
   * Add a title change callback (for MultiChatService to update tab titles)
   * This allows multiple components to listen to title changes
   */
  public addTitleChangeCallback(callback: (title: string) => void): () => void {
    this.onTitleChangeCallbacks.add(callback);

    // Return cleanup function
    return () => {
      this.onTitleChangeCallbacks.delete(callback);
    };
  }

  /**
   * Initialize IPC listeners for chat events
   * Note: PROMPT_SELECTED listener is disabled when used in multi-tab context
   * MultiChatService handles routing PROMPT_SELECTED events to the appropriate tab
   */
  public initializeListeners(): void {
    // PROMPT_SELECTED listener is NOT set up here
    // When used in multi-tab context, MultiChatService handles PROMPT_SELECTED routing
    // This prevents multiple ChatService instances from creating duplicate chats

    const handleOllamaResponse = (response: TChatResponse) => {
      this.logger.info('Current messages count: %s', this.messages.length.toString());

      // Update currentChatId if provided (for hotkey/prompt select flows)
      // Only set it if we're currently handling a response (isLoading or isHandlingOllamaResponse)
      // This prevents other tabs from incorrectly adopting chatIds from responses meant for different tabs
      if (response.chatId !== undefined && this.currentChatId === null && (this.isLoading || this.isHandlingOllamaResponse)) {
        this.currentChatId = response.chatId;
        this.logger.info('ChatId set from response: chatId=%s', String(response.chatId));
      } else if (response.chatId !== undefined && this.currentChatId === null) {
        this.logger.info('Ignoring chatId from response: chatId=%s (not handling response for this service)', String(response.chatId));
      }

      // Only process if this response is for our chat
      if (response.chatId !== undefined && this.currentChatId !== null && response.chatId !== this.currentChatId) {
        this.logger.info('Ignoring OLLAMA_RESPONSE: chatId=%s does not match currentChatId=%s', String(response.chatId), String(this.currentChatId));

        return;
      }

      this.setHandlingResponse(true);

      // Handle error response
      if (isErrorResponse(response)) {
        const errorText = response.error ?? 'Unknown error';
        const type = classifyStreamingError(errorText);
        this.setError(`Streaming error: ${errorText}`, type);
        const errorMessage: IChatMessage = {
          content: `Error: ${errorText}`,
          errorType: type,
          id: `${Date.now().toString()}-error`,
          role: 'assistant',
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
        // Skip adding if we already have the assistant message (e.g. from a late loadChatMessages call).
        // loadChatMessages can be called twice (MultiChatService + ChatComponent useEffect), and the
        // second call may return [user, assistant] after streaming completes. Adding here would duplicate.
        const lastMessage = this.messages.at(-1);
        if (lastMessage !== undefined && lastMessage.role === 'assistant') {
          this.logger.info('Skipping duplicate assistant message: last message is already assistant');
          // Merge statistics if we have them in the response but the message lacks them (e.g. race: loadChatMessages returned before statistics were saved)
          if (response.statistics !== undefined && lastMessage.statistics === undefined) {
            this.updateMessageStatistics(lastMessage.id, response.statistics);
          }
          this.setLoading(false);
          setTimeout(() => {
            this.setHandlingResponse(false);
          }, 100);

          return;
        }

        const assistantMessage: IChatMessage = {
          content: response.result,
          id: `${Date.now().toString()}-response`,
          role: 'assistant',
          statistics: response.statistics,
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
      // Update title only if it matches the current chat
      // Do NOT accept title updates when currentChatId is null - this causes bugs in multi-tab context
      // where multiple ChatService instances receive the same event and the one with null accepts it incorrectly
      if (this.currentChatId === data.chatId) {
        this.logger.info('Title updated for current chat: chatId=%s, title="%s"', String(data.chatId), data.title);
        // Call both the single callback (for backward compatibility) and all registered callbacks
        this.onTitleChange?.(data.title);
        this.onTitleChangeCallbacks.forEach(callback => {
          callback(data.title);
        });
      } else {
        this.logger.info('Title update ignored: chatId=%s does not match currentChatId=%s', String(data.chatId), this.currentChatId === null ? 'null' : String(this.currentChatId));
      }
    };

    const handleChatLoadMessagesData = (data: { chatId: number, messages: IChatMessage[] }) => {
      // Only accept CHAT_LOAD_MESSAGES_DATA if currentChatId is null (new tab) or matches the event's chatId
      // This prevents other tabs from incorrectly adopting chatIds from load events meant for different tabs
      if (this.currentChatId !== null && this.currentChatId !== data.chatId) {
        this.logger.info('Ignoring CHAT_LOAD_MESSAGES_DATA: chatId=%s does not match currentChatId=%s', String(data.chatId), String(this.currentChatId));

        return;
      }

      this.logger.info('Loading messages for chat: chatId=%s, messageCount=%s', String(data.chatId), String(data.messages.length));
      this.currentChatId = data.chatId;

      const hasUserMessage = data.messages.some(m => m.role === 'user');
      const hasAssistantMessage = data.messages.some(m => m.role === 'assistant');
      const hasStreamingError = this.error !== null && this.error.startsWith('Streaming error:');
      const isActivelyStreaming = this.streamingMessageId !== null;

      // When actively streaming, never apply CHAT_LOAD_MESSAGES_DATA. For existing chats the first
      // payload after send contains previous history (hasAssistantMessage true), which would
      // overwrite [user, placeholder] and clear loading. Wait until CHAT_STREAM_END clears
      // streaming state; the next CHAT_LOAD_MESSAGES_DATA (after assistant is saved) will apply.
      if (isActivelyStreaming) {
        this.logger.debug('Ignoring CHAT_LOAD_MESSAGES_DATA during streaming: chatId=%s', String(data.chatId));

        return;
      }

      // If we have a streaming error and DB lacks assistant message, append error message
      // (CHAT_LOAD_MESSAGES_DATA can arrive after CHAT_STREAM_END - would otherwise replace error with [user])
      let messagesToSet = data.messages;
      if (hasStreamingError && hasUserMessage && !hasAssistantMessage && this.error !== null) {
        const errorText = this.error.replace(/^Streaming error: /, '');
        const errorMessage: IChatMessage = {
          content: `Error: ${errorText}`,
          errorType: this.errorType,
          id: `${Date.now().toString()}-error`,
          role: 'assistant',
          timestamp: new Date(),
        };
        messagesToSet = [...data.messages, errorMessage];
      }

      this.setMessages(messagesToSet);
      this.setLoading(false);
      // Do NOT clear error here - CHAT_LOAD_MESSAGES_DATA is pushed by DbWatcher when messages change.
      // It can arrive after a streaming error, racing with CHAT_STREAM_END. Clearing would hide the error.
    };

    const handleChatDeleted = (data: { chatId: number }) => {
      // If the deleted chat is the current chat, clear the current chat
      // Do NOT close the window - MultiChatService will handle closing the tab
      // Closing the window when a chat is deleted is not desired behavior
      if (this.currentChatId === data.chatId) {
        this.logger.info('Current chat was deleted, clearing current chat: chatId=%s', String(data.chatId));
        this.currentChatId = null;
        this.setMessages([]);
        this.setError(null);
        // MultiChatService will handle closing the tab, so we don't need to close the window
      }
    };

    const handleStreamChunk = (data: IChatStreamChunk) => {
      // Only process chunks for the current chat
      if (this.currentChatId !== data.chatId) {
        return;
      }

      // Update streaming content
      this.streamingContent += data.content;

      // Update the streaming message in the messages array
      if (this.streamingMessageId !== null) {
        // Update both content and statistics if available (runtime-guarded for older shared typings)
        const chunkStatistics = (data as unknown as { statistics?: IMessageStatistics }).statistics;
        this.updateStreamingMessage(this.streamingContent, chunkStatistics);
      }

      // If this was the final chunk, stop treating the message as streaming immediately
      // so UI actions (like statistics tooltip) can appear without waiting for CHAT_STREAM_END.
      if (data.done) {
        this.setStreaming(false);
      }
    };

    const handleStreamEnd = (data: IChatStreamEnd) => {
      // Only process stream end for the current chat
      if (this.currentChatId !== data.chatId) {
        return;
      }

      this.logger.info('Stream ended for chatId=%s, error=%s', String(data.chatId), data.error ?? 'none');

      // Handle error
      if (data.error !== undefined) {
        const errorType = data.errorType ?? classifyStreamingError(data.error);
        this.setError(`Streaming error: ${data.error}`, errorType);
        // Update the streaming message if it exists, or add error message if placeholder was removed (e.g. by CHAT_LOAD_MESSAGES_DATA race)
        if (this.streamingMessageId !== null) {
          const hasPlaceholder = this.messages.some((msg) => msg.id === this.streamingMessageId);
          if (hasPlaceholder) {
            this.updateStreamingMessage(`Error: ${data.error}`, undefined, errorType);
          } else {
            const errorMessage: IChatMessage = {
              content: `Error: ${data.error}`,
              errorType,
              id: `${Date.now().toString()}-error`,
              role: 'assistant',
              timestamp: new Date(),
            };
            this.addMessage(errorMessage);
          }
        }
      } else {
        // Finalize the message with the full content
        if (this.streamingMessageId !== null) {
          this.updateStreamingMessage(data.fullContent);
        }
      }

      // Reset streaming state
      this.streamingMessageId = null;
      this.streamingContent = '';
      this.setStreaming(false);
      this.setLoading(false);
      this.setHandlingResponse(false);
    };

    try {
      // PROMPT_SELECTED listener intentionally not set up - MultiChatService handles routing
      this.ollamaResponseListener = this.ipcAdapter.onOllamaResponse(handleOllamaResponse);
      this.chatTitleUpdatedListener = this.ipcAdapter.onChatTitleUpdated(handleChatTitleUpdated);
      this.chatLoadMessagesDataListener = this.ipcAdapter.onChatLoadMessagesData(handleChatLoadMessagesData);
      this.chatDeletedListener = this.ipcAdapter.onChatDeleted(handleChatDeleted);
      this.chatStreamChunkListener = this.ipcAdapter.onChatStreamChunk(handleStreamChunk);
      this.chatStreamEndListener = this.ipcAdapter.onChatStreamEnd(handleStreamEnd);
      this.chatFollowUpQuestionsListener = this.ipcAdapter.onChatFollowUpQuestions((data: IChatFollowUpQuestions) => {
        // Only invoke callback for the chat that owns this service (same as CHAT_STREAM_END)
        if (this.currentChatId !== data.chatId) {
          return;
        }
        this.onFollowUpQuestionsChange?.(data.chatId, data.questions);
      });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize chat listeners: %s', errorText);
    }
  }

  /**
   * Cleanup IPC listeners
   */
  public cleanupListeners(): void {
    if (this.promptSelectedListener) {
      this.ipcAdapter.offPromptSelected(this.promptSelectedListener);
      this.promptSelectedListener = null;
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

    if (this.chatStreamChunkListener) {
      this.ipcAdapter.offChatStreamChunk(this.chatStreamChunkListener);
      this.chatStreamChunkListener = null;
    }

    if (this.chatStreamEndListener) {
      this.ipcAdapter.offChatStreamEnd(this.chatStreamEndListener);
      this.chatStreamEndListener = null;
    }

    if (this.chatFollowUpQuestionsListener) {
      this.ipcAdapter.offChatFollowUpQuestions(this.chatFollowUpQuestionsListener);
      this.chatFollowUpQuestionsListener = null;
    }
  }

  /**
   * Send a message to the chat (uses streaming by default)
   * @param options - Optional model/provider override for this request
   */
  public async sendMessage(
    inputValue: string,
    options?: { model?: string, provider?: 'ollama' | 'lmstudio' },
  ): Promise<string | null> {
    if (!inputValue.trim() || this.isLoading) {
      return null;
    }

    // Ensure we have a chatId before sending
    let chatId = this.currentChatId;
    if (chatId === null) {
      const newChatId = await this.createNewChatSession();
      if (newChatId === null) {
        this.logger.error('Cannot send message: no chat session available');
        this.setError('Failed to create chat session');

        return 'Failed to create chat session';
      }
      chatId = newChatId;
      this.currentChatId = chatId;
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

    // Create a placeholder message for streaming
    const streamingMessageId = `${Date.now().toString()}-response`;
    const streamingMessage: IChatMessage = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    this.addMessage(streamingMessage);
    this.streamingMessageId = streamingMessageId;
    this.streamingContent = '';
    this.setStreaming(true);

    const payload: { chatId: number, messages: IChatMessage[], model?: string, provider?: 'ollama' | 'lmstudio' } = {
      chatId,
      messages: this.messages.slice(0, -1), // Exclude the placeholder message
    };
    if (options?.model !== undefined && options.model !== '') {
      payload.model = options.model;
      payload.provider = options.provider;
    }
    const message: TIpcEvent<EIpcChannel.MESSAGE, EIpcEvent.MESSAGE_SEND_STREAM> = {
      channel: EIpcChannel.MESSAGE,
      event: EIpcEvent.MESSAGE_SEND_STREAM,
      payload,
    };

    try {
      const response = await this.ipcAdapter.invoke(message.channel, message);

      if ('error' in response) {
        throw new Error(response.error);
      }

      // Streaming has started, the actual content will come via CHAT_STREAM_CHUNK events
      this.logger.info('Streaming started for chatId=%s', String(chatId));

      return null;
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      const errorType = classifyStreamingError(errorText);

      this.logger.error('Failed to start streaming: %s', errorText);
      this.setError(`Failed to send message: ${errorText}`, errorType);

      // Update the placeholder message to show error with error type
      this.updateStreamingMessage(`Error: ${errorText}`, undefined, errorType);
      this.streamingMessageId = null;
      this.streamingContent = '';
      this.setStreaming(false);
      this.setLoading(false);
      this.setHandlingResponse(false);

      return errorText;
    }
  }

  /**
   * Retry the last message (remove failed assistant message and re-invoke streaming).
   * Use when the last message is an assistant error message.
   * @param options - Optional model/provider override for this request
   */
  public async retryLastMessage(
    options?: { model?: string, provider?: 'ollama' | 'lmstudio' },
  ): Promise<string | null> {
    if (this.currentChatId === null || this.isLoading) {
      return null;
    }

    const lastMessage = this.messages.at(-1);
    if (lastMessage === undefined || lastMessage.role !== 'assistant') {
      return null;
    }

    this.messages = this.messages.slice(0, -1);
    this.onMessagesChange?.(this.messages);

    this.setHandlingResponse(true);
    const streamingMessageId = `${Date.now().toString()}-response`;
    const streamingMessage: IChatMessage = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    this.addMessage(streamingMessage);
    this.streamingMessageId = streamingMessageId;
    this.streamingContent = '';
    this.setStreaming(true);
    this.setLoading(true);
    this.setError(null);

    const payload: { chatId: number, messages: IChatMessage[], model?: string, provider?: 'ollama' | 'lmstudio' } = {
      chatId: this.currentChatId,
      messages: this.messages.slice(0, -1),
    };
    if (options?.model !== undefined && options.model !== '') {
      payload.model = options.model;
      payload.provider = options.provider;
    }
    const message: TIpcEvent<EIpcChannel.MESSAGE, EIpcEvent.MESSAGE_SEND_STREAM> = {
      channel: EIpcChannel.MESSAGE,
      event: EIpcEvent.MESSAGE_SEND_STREAM,
      payload,
    };

    try {
      const response = await this.ipcAdapter.invoke(message.channel, message);

      if ('error' in response) {
        throw new Error(response.error);
      }

      this.logger.info('Retry streaming started for chatId=%s', String(this.currentChatId));

      return null;
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      const errorType = classifyStreamingError(errorText);

      this.logger.error('Failed to retry streaming: %s', errorText);
      this.setError(`Failed to send message: ${errorText}`, errorType);
      this.updateStreamingMessage(`Error: ${errorText}`, undefined, errorType);
      this.streamingMessageId = null;
      this.streamingContent = '';
      this.setStreaming(false);
      this.setLoading(false);
      this.setHandlingResponse(false);

      return errorText;
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

      return userMessages[userMessages.length - 1]?.content ?? null;
    } else if (this.historyIndex < userMessages.length - 1) {
      const newIndex = this.historyIndex + 1;
      this.setHistoryIndex(newIndex);

      const targetIndex = userMessages.length - 1 - newIndex;

      return userMessages[targetIndex]?.content ?? null;
    } else {
      return null;
    }
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
   * Get error type (for display variants, e.g. network vs generic)
   */
  public getErrorType(): EStreamingErrorType | undefined {
    return this.errorType;
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
   * Get streaming state
   */
  public getIsStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Get current chat ID
   */
  public getCurrentChatId(): number | null {
    return this.currentChatId;
  }

  /**
   * Set prompt selector data (pushed by MultiChatService when PROMPT_SELECTOR_DATA arrives)
   */
  public setPromptSelectorData(data: IPromptSelectorData): void {
    this.setSelectedText(data.selectedText);
    this.setPreconfiguredPrompts(data.preconfiguredPrompts);
  }

  /**
   * Get selected text
   */
  public getSelectedText(): string {
    return this.selectedText;
  }

  /**
   * Get preconfigured prompts
   */
  public getPreconfiguredPrompts(): IPreconfiguredPrompt[] {
    return this.preconfiguredPrompts;
  }

  /**
   * Get model override (persisted across tab switches)
   */
  public getModelOverride(): { model: string, provider: 'ollama' | 'lmstudio' } | null {
    return this.modelOverride;
  }

  /**
   * Set model override (persisted across tab switches)
   */
  public setModelOverride(override: { model: string, provider: 'ollama' | 'lmstudio' } | null): void {
    this.modelOverride = override;
    this.onModelOverrideChange?.(override);
  }

  /**
   * Seed model override from chat info when loading (for reopen - uses last saved model from DB)
   * Only sets if modelOverride is null and chatInfo has a valid model
   */
  public seedModelOverrideFromChatInfo(chatInfo: IChatInfo): void {
    if (this.modelOverride !== null) {
      return;
    }
    const model = chatInfo.model;
    const provider = chatInfo.provider === 'lmstudio' ? 'lmstudio' : 'ollama';
    if (model !== '') {
      this.setModelOverride({ model, provider });
    }
  }

  /**
   * Get scroll position (persisted across tab switches)
   */
  public getScrollPosition(): number {
    return this.scrollPosition;
  }

  /**
   * Set scroll position (persisted across tab switches)
   */
  public setScrollPosition(position: number): void {
    this.scrollPosition = Math.max(0, position);
  }

  /**
   * Select a preconfigured prompt
   */
  public async selectPrompt(promptObj: IPreconfiguredPrompt): Promise<void> {
    const prompt = this.processPromptTemplate(promptObj.prompt);

    const message: TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT> = {
      channel: EIpcChannel.PROMPT_SELECTOR,
      event: EIpcEvent.PROMPT_SELECT,
      payload: {
        model: promptObj.model,
        prompt,
        provider: promptObj.provider,
      },
    };

    try {
      await this.ipcAdapter.invoke(message.channel, message);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      this.logger.error('Error selecting prompt: %s', errorText);
      throw err;
    }
  }

  /**
   * Submit a custom prompt
   */
  public async submitCustomPrompt(customPrompt: string): Promise<void> {
    if (customPrompt.trim() === '') {
      return;
    }

    const prompt = this.processPromptTemplate(customPrompt);

    const message: TIpcEvent<EIpcChannel.PROMPT_SELECTOR, EIpcEvent.PROMPT_SELECT> = {
      channel: EIpcChannel.PROMPT_SELECTOR,
      event: EIpcEvent.PROMPT_SELECT,
      payload: {
        prompt,
      },
    };

    try {
      await this.ipcAdapter.invoke(message.channel, message);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      this.logger.error('Error selecting prompt: %s', errorText);
      throw err;
    }
  }

  /**
   * Get chat info by ID
   */
  public async getChatInfo(chatId: number): Promise<IChatInfo | null> {
    try {
      const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_GET> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_GET,
        payload: { chatId },
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

      if (isErrorResponse(response)) {
        this.logger.error('Failed to get chat info: %s', response.error);

        return null;
      }

      return response.chat;
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to get chat info: %s', errorText);

      return null;
    }
  }

  /**
   * Load messages for a specific chat
   * Clears prompt-selector state so the messages view is shown instead of the prompt selector UI
   */
  public async loadChatMessages(chatId: number): Promise<void> {
    this.clearPromptSelectorData();
    try {
      const message: TIpcEvent<EIpcChannel.MESSAGE, EIpcEvent.MESSAGES_LOAD> = {
        channel: EIpcChannel.MESSAGE,
        event: EIpcEvent.MESSAGES_LOAD,
        payload: { chatId },
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

      if (isErrorResponse(response)) {
        this.logger.error('Failed to load messages: %s', response.error);
        this.setError(`Failed to load messages: ${response.error}`);

        return;
      }

      this.currentChatId = chatId;
      const hasUserMessage = response.messages.some(m => m.role === 'user');
      const hasAssistantMessage = response.messages.some(m => m.role === 'assistant');
      const hasStreamingError = this.error !== null && this.error.startsWith('Streaming error:');

      // If we have a streaming error and DB lacks assistant message, append error message and don't show loading
      // (loadChatMessages can arrive after CHAT_STREAM_END - would otherwise replace error with [user] and show loading)
      let messagesToSet = response.messages;
      let shouldShowLoading = hasUserMessage && !hasAssistantMessage;

      if (hasStreamingError && hasUserMessage && !hasAssistantMessage && this.error !== null) {
        const errorText = this.error.replace(/^Streaming error: /, '');
        const errorMessage: IChatMessage = {
          content: `Error: ${errorText}`,
          errorType: this.errorType,
          id: `${Date.now().toString()}-error`,
          role: 'assistant',
          timestamp: new Date(),
        };
        messagesToSet = [...response.messages, errorMessage];
        shouldShowLoading = false;
      }

      this.setMessages(messagesToSet);
      this.setLoading(shouldShowLoading);
      // Preserve streaming errors - they are cleared only when user sends a new message
      if (this.error === null || !this.error.startsWith('Streaming error:')) {
        this.setError(null);
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to load messages: %s', errorText);
      this.setError(`Failed to load messages: ${errorText}`);
    }
  }

  /**
   * Delete a chat
   */
  public async deleteChat(chatId: number): Promise<string | null> {
    try {
      const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_DELETE> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_DELETE,
        payload: { chatId },
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

      if (isErrorResponse(response)) {
        this.logger.error('Failed to delete chat: %s', response.error);

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
      this.logger.error('Failed to delete chat: %s', errorText);

      return errorText;
    }
  }

  /**
   * Create a new chat session in the database
   */
  private async createNewChatSession(): Promise<number | null> {
    try {
      const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_CREATE> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_CREATE,
        payload: {},
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

      if (isErrorResponse(response)) {
        this.logger.error('Failed to create chat session: %s', response.error);
        this.currentChatId = null;

        return null;
      } else {
        this.currentChatId = response.chatId;
        this.logger.info('Created new chat session with ID: %s', response.chatId.toString());

        return response.chatId;
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to create chat session: %s', errorText);
      this.currentChatId = null;

      return null;
    }
  }

  /**
   * Process a prompt template by replacing {text} placeholder with selected text
   */
  private processPromptTemplate(template: string): string {
    let prompt = template;
    if (!prompt.includes('{text}')) {
      prompt += '\n{text}';
    }

    return prompt.replaceAll('{text}', this.selectedText);
  }

  private setSelectedText(text: string): void {
    this.selectedText = text;
    this.onSelectedTextChange?.(text);
  }

  private setPreconfiguredPrompts(prompts: IPreconfiguredPrompt[]): void {
    this.preconfiguredPrompts = prompts;
    this.onPromptsChange?.(prompts);
  }

  /**
   * Clear prompt-selector state so the messages view is shown (e.g. after selecting a prompt)
   */
  private clearPromptSelectorData(): void {
    this.setSelectedText('');
    this.setPreconfiguredPrompts([]);
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

  private setError(error: string | null, errorType?: EStreamingErrorType): void {
    this.error = error;
    this.errorType = error === null ? undefined : errorType;
    this.onErrorChange?.(error, this.errorType);
  }

  private setHistoryIndex(index: number): void {
    this.historyIndex = index;
    this.onHistoryIndexChange?.(index);
  }

  private setHandlingResponse(isHandling: boolean): void {
    this.isHandlingOllamaResponse = isHandling;
    this.onHandlingResponseChange?.(isHandling);
  }

  private setStreaming(isStreaming: boolean): void {
    this.isStreaming = isStreaming;
    this.onStreamingChange?.(isStreaming);
  }

  private updateMessageStatistics(messageId: string, statistics: IMessageStatistics): void {
    const updatedMessages = this.messages.map(msg =>
      msg.id === messageId
        ? { ...msg, statistics }
        : msg,
    );

    this.messages = updatedMessages;
    this.onMessagesChange?.(this.messages);
  }

  private updateStreamingMessage(content: string, statistics?: IMessageStatistics, errorType?: EStreamingErrorType): void {
    if (this.streamingMessageId === null) {
      return;
    }

    // Find and update the streaming message
    const updatedMessages = this.messages.map(msg => {
      if (msg.id === this.streamingMessageId) {
        // Preserve existing statistics if new statistics are not provided
        const updatedMessage: IChatMessage = {
          ...msg,
          content,
        };
        if (errorType !== undefined) {
          updatedMessage.errorType = errorType;
        }
        if (statistics !== undefined) {
          updatedMessage.statistics = statistics;
        }

        return updatedMessage;
      }

      return msg;
    });

    this.messages = updatedMessages;
    this.onMessagesChange?.(this.messages);
  }
}

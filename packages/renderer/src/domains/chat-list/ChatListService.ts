import type { IChatInfo, TIpcEvent } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent, logger } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import type { TIpcRenderListener } from '../../types/TIpcRenderListener';
import { isErrorResponse, isFailedResponse } from '../../utils/responseTypeGuards';

const PAGE_SIZE = 20;

/**
 * Service for managing chat list domain logic
 * Handles chat list operations, IPC communication, and state management
 */
export class ChatListService {
  private readonly ipcAdapter: IIpcAdapter;
  private chats: IChatInfo[] = [];
  private deletingChatId: number | null = null;
  private error: string | null = null;
  private hasMore = false;
  private isLoading = false;
  private isLoadingMore = false;
  private chatCreatedListener: TIpcRenderListener | null = null;
  private chatTitleUpdatedListener: TIpcRenderListener | null = null;

  private regeneratingChatId: number | null = null;

  // Callbacks for component state updates
  private onChatsChange?: (chats: IChatInfo[]) => void;
  private onDeletingChatIdChange?: (chatId: number | null) => void;
  private onErrorChange?: (error: string | null) => void;
  private onHasMoreChange?: (hasMore: boolean) => void;
  private onLoadingChange?: (isLoading: boolean) => void;
  private onLoadingMoreChange?: (isLoadingMore: boolean) => void;
  private onRegeneratingChatIdChange?: (chatId: number | null) => void;

  public constructor(ipcAdapter: IIpcAdapter) {
    this.ipcAdapter = ipcAdapter;
  }

  /**
   * Initialize IPC listeners for chat events
   */
  public initializeListeners(): void {
    const handleChatCreated = (_data: { chatId: number }) => {
      void this.loadChats();
    };

    const handleChatTitleUpdated = (_data: { chatId: number, title: string }) => {
      void this.loadChats();
    };

    this.chatCreatedListener = this.ipcAdapter.onChatCreated(handleChatCreated);
    this.chatTitleUpdatedListener = this.ipcAdapter.onChatTitleUpdated(handleChatTitleUpdated);
  }

  /**
   * Cleanup IPC listeners
   */
  public cleanupListeners(): void {
    if (this.chatCreatedListener) {
      this.ipcAdapter.offChatCreated(this.chatCreatedListener);
      this.chatCreatedListener = null;
    }

    if (this.chatTitleUpdatedListener) {
      this.ipcAdapter.offChatTitleUpdated(this.chatTitleUpdatedListener);
      this.chatTitleUpdatedListener = null;
    }
  }

  /**
   * Register callbacks for state changes
   */
  public setCallbacks(callbacks: {
    onChatsChange?: (chats: IChatInfo[]) => void,
    onDeletingChatIdChange?: (chatId: number | null) => void,
    onErrorChange?: (error: string | null) => void,
    onHasMoreChange?: (hasMore: boolean) => void,
    onLoadingChange?: (isLoading: boolean) => void,
    onLoadingMoreChange?: (isLoadingMore: boolean) => void,
    onRegeneratingChatIdChange?: (chatId: number | null) => void,
  }): void {
    this.onChatsChange = callbacks.onChatsChange;
    this.onDeletingChatIdChange = callbacks.onDeletingChatIdChange;
    this.onErrorChange = callbacks.onErrorChange;
    this.onHasMoreChange = callbacks.onHasMoreChange;
    this.onLoadingChange = callbacks.onLoadingChange;
    this.onLoadingMoreChange = callbacks.onLoadingMoreChange;
    this.onRegeneratingChatIdChange = callbacks.onRegeneratingChatIdChange;
  }

  /**
   * Load first page of chats from the database
   */
  public async loadChats(): Promise<void> {
    this.setLoading(true);
    this.setError(null);

    try {
      const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LIST> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LIST,
        payload: { limit: PAGE_SIZE, offset: 0 },
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

      if (isErrorResponse(response)) {
        throw new Error(response.error);
      }

      if ('chats' in response && Array.isArray(response.chats)) {
        this.setChats(response.chats);
        const hasMore = 'hasMore' in response && typeof response.hasMore === 'boolean' ? response.hasMore : false;

        this.setHasMore(hasMore);
      } else {
        throw new Error('Invalid response: missing chats');
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to load chats: %s', errorText);
      this.setError(errorText);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Load next page of chats and append to current list
   */
  public async loadMoreChats(): Promise<void> {
    if (this.isLoadingMore || !this.hasMore) {
      return;
    }

    this.setLoadingMore(true);

    try {
      const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LIST> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LIST,
        payload: { limit: PAGE_SIZE, offset: this.chats.length },
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

      if (isErrorResponse(response)) {
        throw new Error(response.error);
      }

      if ('chats' in response && Array.isArray(response.chats)) {
        this.appendChats(response.chats);
        const hasMore = 'hasMore' in response && typeof response.hasMore === 'boolean' ? response.hasMore : false;

        this.setHasMore(hasMore);
      } else {
        throw new Error('Invalid response: missing chats');
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to load more chats: %s', errorText);
      this.setError(errorText);
    } finally {
      this.setLoadingMore(false);
    }
  }

  /**
   * Open a chat by ID
   */
  public async openChat(chatId: number): Promise<void> {
    try {
      const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_OPEN> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_OPEN,
        payload: { chatId },
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

      if (isFailedResponse(response)) {
        throw new Error(response.error);
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to open chat: %s', errorText);
      this.setError(errorText);
    }
  }

  /**
   * Delete a chat by ID
   */
  public async deleteChat(chatId: number): Promise<string | null> {
    this.setDeletingChatId(chatId);

    try {
      const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_DELETE> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_DELETE,
        payload: { chatId },
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

      if (isFailedResponse(response)) {
        throw new Error(response.error);
      }

      // Refresh chat list after successful deletion
      await this.loadChats();

      return null;
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to delete chat: %s', errorText);
      this.setError(errorText);

      return errorText;
    } finally {
      this.setDeletingChatId(null);
    }
  }

  /**
   * Regenerate chat title via LLM (does not save to DB; returns title for UI to display/save).
   */
  public async regenerateTitle(chatId: number): Promise<{ ok: true, title: string } | { ok: false, error: string }> {
    this.setRegeneratingChatId(chatId);

    try {
      const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_REGENERATE_TITLE> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_REGENERATE_TITLE,
        payload: { chatId },
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

      if ('success' in response && response.success === true && 'title' in response) {
        return { ok: true, title: response.title };
      }

      const errorMsg = 'error' in response && typeof response.error === 'string'
        ? response.error
        : 'Failed to generate title';

      return { ok: false, error: errorMsg };
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to regenerate title: %s', errorText);

      return { ok: false, error: errorText };
    } finally {
      this.setRegeneratingChatId(null);
    }
  }

  /**
   * Update chat title (save to DB).
   */
  public async updateTitle(chatId: number, title: string): Promise<string | null> {
    try {
      const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_UPDATE_TITLE> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_UPDATE_TITLE,
        payload: { chatId, title },
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

      if ('success' in response && response.success === true) {
        return null;
      }

      return 'error' in response && typeof response.error === 'string' ? response.error : 'Failed to update title';
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to update title: %s', errorText);

      return errorText;
    }
  }

  // Private setters that trigger callbacks
  private appendChats(newChats: IChatInfo[]): void {
    this.chats = [...this.chats, ...newChats];
    this.onChatsChange?.(this.chats);
  }

  private setChats(chats: IChatInfo[]): void {
    this.chats = chats;
    this.onChatsChange?.(chats);
  }

  private setHasMore(hasMore: boolean): void {
    this.hasMore = hasMore;
    this.onHasMoreChange?.(hasMore);
  }

  private setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    this.onLoadingChange?.(isLoading);
  }

  private setError(error: string | null): void {
    this.error = error;
    this.onErrorChange?.(error);
  }

  private setDeletingChatId(chatId: number | null): void {
    this.deletingChatId = chatId;
    this.onDeletingChatIdChange?.(chatId);
  }

  private setRegeneratingChatId(chatId: number | null): void {
    this.regeneratingChatId = chatId;
    this.onRegeneratingChatIdChange?.(chatId);
  }

  private setLoadingMore(isLoadingMore: boolean): void {
    this.isLoadingMore = isLoadingMore;
    this.onLoadingMoreChange?.(isLoadingMore);
  }
}

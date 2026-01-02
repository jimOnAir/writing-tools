import type { IChatInfo, TIpcEvent } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent, logger } from '@writing-tools/shared';
import React, { useState, useEffect, useMemo } from 'react';

import { ElectronIpcAdapter } from '../infrastructure/ipc';
import { ButtonStyles, BackgroundStyles, TypographyStyles, ColorPalette } from '../styles/Styles';

const ChatListComponent: React.FC = () => {
  const [chats, setChats] = useState<IChatInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<number | null>(null);

  const ipcAdapter = useMemo(() => new ElectronIpcAdapter(), []);

  // Load chats on mount
  useEffect(() => {
    void loadChats();
  }, []);

  const loadChats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LIST_CHATS> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LIST_CHATS,
        payload: {},
      };

      const response = await ipcAdapter.invoke(EIpcChannel.CHAT, payload);

      if ('error' in response) {
        throw new Error(response.error);
      }

      setChats(response.chats);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to load chats: %s', errorText);
      setError(errorText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChat = async (chatId: number) => {
    try {
      const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_OPEN> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_OPEN,
        payload: { chatId },
      };

      const response = await ipcAdapter.invoke(EIpcChannel.CHAT, payload);

      if ('error' in response) {
        throw new Error(response.error);
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to open chat: %s', errorText);
      setError(errorText);
    }
  };

  const handleDeleteChat = async (chatId: number, event: React.MouseEvent) => {
    event.stopPropagation();

    // Confirm deletion
    const confirmed = globalThis.confirm('Are you sure you want to delete this chat? This action cannot be undone.');

    if (confirmed === false) {
      return;
    }

    setDeletingChatId(chatId);

    try {
      const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_DELETE> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_DELETE,
        payload: { chatId },
      };

      const response = await ipcAdapter.invoke(EIpcChannel.CHAT, payload);

      if ('error' in response) {
        throw new Error(response.error);
      }

      // Refresh chat list
      await loadChats();
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to delete chat: %s', errorText);
      setError(errorText);
    } finally {
      setDeletingChatId(null);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const DAYS_IN_WEEK = 7;

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < DAYS_IN_WEEK) {
      return `${diffDays} days ago`;
    } else {
      const isDifferentYear = date.getFullYear() !== now.getFullYear();

      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: isDifferentYear ? 'numeric' : undefined });
    }
  };

  return (
    <div className={`flex flex-col h-full p-4 w-full ${BackgroundStyles.main}`}>
      <h1 className={TypographyStyles.h1}>Chat List</h1>

      {error && (
        <div className={`mb-3 p-3 ${BackgroundStyles.card} ${ColorPalette.text.secondary} rounded`}>
          Error: {error}
        </div>
      )}

      {isLoading && (
        <div className={`flex-1 flex items-center justify-center ${ColorPalette.text.muted}`}>
          <p>Loading chats...</p>
        </div>
      )}
      {!isLoading && chats.length === 0 && (
        <div className={`flex-1 flex items-center justify-center ${ColorPalette.text.muted}`}>
          <p>No chats yet. Start a new conversation to see it here.</p>
        </div>
      )}
      {!isLoading && chats.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {chats.map((chat) => {
            const hasTitle = chat.title.trim().length > 0;
            const displayTitle = hasTitle ? chat.title : 'New Chat';
            const isDeleting = deletingChatId === chat.id;

            return (
              <div
                key={chat.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  void handleOpenChat(chat.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleOpenChat(chat.id);
                  }
                }}
                className={`${BackgroundStyles.cardHover} p-3 rounded cursor-pointer flex items-center justify-between w-full`}
              >
                <div className="flex-1 min-w-0">
                  <div className={`${TypographyStyles.h3} ${ColorPalette.text.primary} truncate`}>
                    {displayTitle}
                  </div>
                  <div className={`text-xs ${ColorPalette.text.muted} mt-1`}>
                    {formatDate(chat.updated_at)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    void handleDeleteChat(chat.id, e);
                  }}
                  disabled={isDeleting}
                  className={`ml-3 ${ButtonStyles.base} ${isDeleting ? ButtonStyles.disabled : ButtonStyles.ghost} whitespace-nowrap`}
                >
                  {isDeleting ? 'Removing...' : 'Remove'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatListComponent;

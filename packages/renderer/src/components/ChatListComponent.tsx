import type { IChatInfo } from '@writing-tools/shared';
import React, { useState, useEffect } from 'react';

import type { ChatListService } from '../domains/chat-list';
import { ButtonStyles, BackgroundStyles, TypographyStyles, ColorPalette } from '../styles/Styles';
import { renderMarkdown } from '../utils/markdownRenderer';

interface ChatListComponentProps {
  readonly chatListService: ChatListService;
  readonly onChatSelect: (chatId: number) => void;
}

const ChatListComponent: React.FC<ChatListComponentProps> = ({ chatListService, onChatSelect }) => {
  const [chats, setChats] = useState<IChatInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<number | null>(null);

  // Register callbacks
  useEffect(() => {
    chatListService.setCallbacks({
      onChatsChange: setChats,
      onLoadingChange: setIsLoading,
      onErrorChange: setError,
      onDeletingChatIdChange: setDeletingChatId,
    });
  }, [chatListService]);

  // Initialize listeners
  useEffect(() => {
    chatListService.initializeListeners();

    return () => {
      chatListService.cleanupListeners();
    };
  }, [chatListService]);

  // Load chats on mount
  useEffect(() => {
    void chatListService.loadChats();
  }, [chatListService]);

  const handleOpenChat = (chatId: number): void => {
    onChatSelect(chatId);
  };

  const handleDeleteChat = async (chatId: number, event: React.MouseEvent) => {
    event.stopPropagation();

    // Confirm deletion
    const confirmed = globalThis.confirm('Are you sure you want to delete this chat? This action cannot be undone.');

    if (!confirmed) {
      return;
    }

    await chatListService.deleteChat(chatId);
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
      return `${String(diffDays)} days ago`;
    } else {
      const isDifferentYear = date.getFullYear() !== now.getFullYear();

      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: isDifferentYear ? 'numeric' : undefined });
    }
  };

  return (
    <div className="flex flex-col h-full p-2 overflow-hidden">
      {error && (
        <div className={`mb-2 p-2 ${BackgroundStyles.card} ${ColorPalette.text.secondary} rounded text-sm`}>
          Error: {error}
        </div>
      )}

      {isLoading && (
        <div className={`flex-1 flex items-center justify-center ${ColorPalette.text.muted}`}>
          <p className="text-sm">Loading chats...</p>
        </div>
      )}
      {!isLoading && chats.length === 0 && (
        <div className={`flex-1 flex items-center justify-center ${ColorPalette.text.muted} px-2`}>
          <p className="text-sm text-center">No chats yet. Start a new conversation to see it here.</p>
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
                className={`${BackgroundStyles.cardHover} p-3 rounded cursor-pointer flex items-center justify-between w-full`}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleOpenChat(chat.id);
                  }}
                  className="flex-1 min-w-0 text-left"
                  aria-label={`Open chat: ${displayTitle}`}
                >
                  <div
                    className={`${TypographyStyles.h3} ${ColorPalette.text.primary} truncate markdown-content`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(displayTitle) }}
                  />
                  <div className={`text-xs ${ColorPalette.text.muted} mt-1`}>
                    {formatDate(chat.updated_at)}
                  </div>
                </button>
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

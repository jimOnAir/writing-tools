import type { IChatInfo } from '@writing-tools/shared';
import React, { useState, useEffect, useRef, useMemo } from 'react';

import type { ChatListService } from '../domains/chat-list';
import type { ITabInfo, MultiChatService } from '../domains/multi-chat';
import { BackgroundStyles, TypographyStyles, ColorPalette } from '../styles/Styles';
import type { IChatListState } from '../types/IChatListState';
import { renderMarkdown } from '../utils/markdownRenderer';

import { CloseIcon, LoadingIcon } from './icons';
import { Tooltip } from './Tooltip';

interface ChatListComponentProps {
  readonly chatListService: ChatListService;
  readonly chatListState?: IChatListState;
  readonly multiChatService?: MultiChatService;
  readonly onChatSelect: (chatId: number) => void;
}

const SCROLL_TIMEOUT_MS = 500;
// TODO: add chat renaming (regenerate title)
const ChatListComponent: React.FC<ChatListComponentProps> = ({ chatListService, chatListState, multiChatService, onChatSelect }) => {
  const [uncontrolledChats, setUncontrolledChats] = useState<IChatInfo[]>([]);
  const [uncontrolledDeletingChatId, setUncontrolledDeletingChatId] = useState<number | null>(null);
  const [uncontrolledError, setUncontrolledError] = useState<string | null>(null);
  const [uncontrolledHasMore, setUncontrolledHasMore] = useState(false);
  const [uncontrolledLoading, setUncontrolledLoading] = useState(true);
  const [uncontrolledLoadingMore, setUncontrolledLoadingMore] = useState(false);
  const [tabs, setTabs] = useState<readonly ITabInfo[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isControlled = chatListState !== undefined;
  const chats: IChatInfo[] = isControlled ? chatListState.chats : uncontrolledChats;
  const deletingChatId: number | null = isControlled ? chatListState.deletingChatId : uncontrolledDeletingChatId;
  const error: string | null = isControlled ? chatListState.error : uncontrolledError;
  const hasMore: boolean = isControlled ? chatListState.hasMore : uncontrolledHasMore;
  const isLoading: boolean = isControlled ? chatListState.isLoading : uncontrolledLoading;
  const isLoadingMore: boolean = isControlled ? chatListState.isLoadingMore : uncontrolledLoadingMore;

  // Extract opened chat IDs from tabs
  const openedChatIds = useMemo(() => {
    if (!multiChatService) {
      return new Set<number>();
    }

    const chatIds = new Set<number>();
    for (const tab of tabs) {
      if (tab.chatId !== null) {
        chatIds.add(tab.chatId);
      }
    }

    return chatIds;
  }, [multiChatService, tabs]);

  // When uncontrolled, subscribe to ChatListService for state
  useEffect(() => {
    if (isControlled) {
      return;
    }

    chatListService.setCallbacks({
      onChatsChange: setUncontrolledChats,
      onDeletingChatIdChange: setUncontrolledDeletingChatId,
      onErrorChange: setUncontrolledError,
      onHasMoreChange: setUncontrolledHasMore,
      onLoadingChange: setUncontrolledLoading,
      onLoadingMoreChange: setUncontrolledLoadingMore,
    });
    chatListService.initializeListeners();
    void chatListService.loadChats();

    return () => {
      chatListService.cleanupListeners();
    };
  }, [chatListService, isControlled]);

  // Subscribe to tab changes from MultiChatService
  useEffect(() => {
    if (!multiChatService) {
      return;
    }

    const handleTabsChange = (updatedTabs: readonly ITabInfo[]): void => {
      setTabs(updatedTabs);
    };

    multiChatService.setCallbacks({
      onTabsChange: handleTabsChange,
    });

    // Initialize with current tabs
    setTabs(multiChatService.getAllTabs());

    return () => {
      multiChatService.removeCallbacks({
        onTabsChange: handleTabsChange,
      });
    };
  }, [multiChatService]);

  // Add scroll detection for scrollbar visibility
  useEffect(() => {
    const element = scrollContainerRef.current;
    if (element === null) {
      return;
    }

    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = (): void => {
      element.classList.add('scrolling');
      if (scrollTimeout !== null) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        element.classList.remove('scrolling');
      }, SCROLL_TIMEOUT_MS);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (scrollTimeout !== null) {
        clearTimeout(scrollTimeout);
      }
    };
  }, []);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const sentinel = sentinelRef.current;
    if (scrollContainer === null || sentinel === null) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        const entry = entries[0];
        if (entry === undefined || !entry.isIntersecting) {
          return;
        }
        if (!hasMore || isLoadingMore) {
          return;
        }

        void chatListService.loadMoreChats();
      },
      {
        root: scrollContainer,
        rootMargin: '0px',
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [chatListService, hasMore, isLoadingMore]);

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
    <div className="flex flex-col h-full overflow-hidden">
      {error && (
        <div className={`m-4 mb-3 p-3 ${BackgroundStyles.card} ${ColorPalette.text.secondary} rounded-xl text-sm`}>
          Error: {error}
        </div>
      )}

      {isLoading && (
        <div className={`flex-1 flex items-center justify-center ${ColorPalette.text.muted}`}>
          <p className="text-sm">Loading chats...</p>
        </div>
      )}
      {!isLoading && chats.length === 0 && (
        <div className={`flex-1 flex flex-col items-center justify-center ${ColorPalette.text.muted} px-4`}>
          <p className="text-sm text-center mb-2">No chats yet</p>
          <p className="text-xs text-center opacity-75">Start a new conversation to see it here</p>
        </div>
      )}
      {!isLoading && chats.length > 0 && (
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 space-y-3">
            {chats.map((chat) => {
              const hasTitle = chat.title.trim().length > 0;
              const displayTitle = hasTitle ? chat.title : 'New Chat';
              const isDeleting = deletingChatId === chat.id;
              const isOpened = openedChatIds.has(chat.id);

              const openedBorder = isOpened ? `border-l-4 ${ColorPalette.border.accent}` : '';
              const baseCard
                = `${BackgroundStyles.cardHover} p-3 rounded-xl cursor-pointer flex items-center justify-between w-full transition-all duration-300`;
              const cardClassName = `${baseCard} ${openedBorder}`;
              const titleClassName
                = `${TypographyStyles.h3} ${ColorPalette.text.primary} truncate markdown-content chat-title mb-1 min-w-0 overflow-hidden`;

              return (
                <div key={chat.id} className={cardClassName}>
                  <Tooltip content={displayTitle}>
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenChat(chat.id);
                      }}
                      className="flex-1 min-w-0 text-left overflow-hidden"
                      aria-label={`Open chat: ${displayTitle}`}
                    >
                      <div
                        className={titleClassName}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(displayTitle) }}
                      />
                      <div className={`text-xs ${ColorPalette.text.muted} mt-0.5`}>
                        {formatDate(chat.updated_at)}
                      </div>
                    </button>
                  </Tooltip>
                  <button
                    type="button"
                    onClick={(e) => {
                      void handleDeleteChat(chat.id, e);
                    }}
                    disabled={isDeleting}
                    className="ml-3 p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-red-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Delete chat"
                  >
                    {isDeleting ? (
                      <LoadingIcon size={14} className="text-gray-400" />
                    ) : (
                      <CloseIcon size={16} />
                    )}
                  </button>
                </div>
              );
            })}
            <div ref={sentinelRef} className="h-1 min-h-1" aria-hidden="true" />
            {isLoadingMore && (
              <div className={`flex items-center justify-center py-4 ${ColorPalette.text.muted}`}>
                <LoadingIcon size={20} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatListComponent;

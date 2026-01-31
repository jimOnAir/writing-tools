import type { IChatInfo } from '@writing-tools/shared';
import React, { useMemo, useState, useEffect } from 'react';

import { BackgroundStyles, ButtonStyles, ColorPalette, TypographyStyles } from '../styles/Styles';
import { getNativeStyles } from '../styles/NativeStyles';
import { getPlatform } from '../utils/platformDetection';
import { renderMarkdown } from '../utils/markdownRenderer';

import { PlusIcon } from './icons';
import type { IChatListState } from '../types/IChatListState';

const RECENT_CHATS_LIMIT = 10;

export interface RecentChatsViewProps {
  readonly chatListState: IChatListState;
  readonly onChatSelect: (chatId: number) => void;
  readonly onCreateNewChat: () => void;
}

function formatDate(dateString: string): string {
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
}

export const RecentChatsView: React.FC<RecentChatsViewProps> = ({ chatListState, onChatSelect, onCreateNewChat }) => {
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');
  const { chats, error, isLoading } = chatListState;
  const recentChats = useMemo(() => chats.slice(0, RECENT_CHATS_LIMIT), [chats]);

  useEffect(() => {
    void getPlatform().then(p => {
      setPlatform(p);
    });
  }, []);

  const nativeStyles = getNativeStyles(platform);

  if (error !== null) {
    return (
      <div className={`flex flex-col flex-1 items-center justify-center p-6 ${BackgroundStyles.main}`}>
        <div className={`max-w-md p-4 ${BackgroundStyles.card} ${ColorPalette.text.secondary} rounded-xl text-sm`}>
          Error: {error}
        </div>
        <button
          type="button"
          onClick={onCreateNewChat}
          className={`mt-6 ${ButtonStyles.base} ${nativeStyles.tabs.newChatButton} px-6 py-3 rounded-xl flex items-center gap-2 whitespace-nowrap`}
          aria-label="New Chat"
        >
          <PlusIcon size={18} />
          <span>New Chat</span>
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex flex-1 items-center justify-center ${ColorPalette.text.muted}`}>
        <p className="text-sm">Loading chats...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 min-h-0 overflow-hidden p-6 ${BackgroundStyles.main}`}>
      <div className="flex flex-col flex-1 min-h-0 items-center max-w-2xl mx-auto w-full">
        <h1 className={`${TypographyStyles.h1} mb-2 flex-shrink-0`}>Recent chats</h1>
        <p className={`${TypographyStyles.description} mb-6 flex-shrink-0`}>
          Open an existing chat or start a new conversation.
        </p>
        <button
          type="button"
          onClick={onCreateNewChat}
          className={`mb-8 w-full flex-shrink-0 ${nativeStyles.tabs.newChatButton} flex items-center justify-center gap-2 py-3 rounded-xl whitespace-nowrap`}
          aria-label="New Chat"
        >
          <PlusIcon size={18} />
          <span>New Chat</span>
        </button>
        {recentChats.length === 0 ? (
          <p className={`${TypographyStyles.emptyState} text-center flex-shrink-0`}>No chats yet. Start a new conversation to see it here.</p>
        ) : (
          <div className="w-full space-y-3 overflow-y-auto flex-1 min-h-0">
            {recentChats.map((chat: IChatInfo) => {
              const hasTitle = chat.title.trim().length > 0;
              const displayTitle = hasTitle ? chat.title : 'New Chat';

              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => {
                    onChatSelect(chat.id);
                  }}
                  className={`${BackgroundStyles.cardHover} p-4 rounded-xl w-full text-left transition-all duration-300 block`}
                  aria-label={`Open chat: ${displayTitle}`}
                >
                  <div
                    className={`${TypographyStyles.h3} ${ColorPalette.text.primary} truncate markdown-content chat-title mb-1 min-w-0 overflow-hidden`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(displayTitle) }}
                  />
                  <div className={`text-xs ${ColorPalette.text.muted} mt-0.5`}>
                    {formatDate(chat.updated_at)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

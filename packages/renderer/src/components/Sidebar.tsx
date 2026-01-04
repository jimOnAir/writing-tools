import React, { useState, useEffect } from 'react';

import type { ChatListService } from '../domains/chat-list';
import { getNativeStyles } from '../styles/NativeStyles';
import { getPlatform } from '../utils/platformDetection';

import ChatListComponent from './ChatListComponent';

interface SidebarProps {
  readonly chatListService: ChatListService;
  readonly onChatSelect: (chatId: number) => void;
  readonly onCreateNewTab: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ chatListService, onChatSelect, onCreateNewTab }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');

  useEffect(() => {
    void getPlatform().then(p => {
      setPlatform(p);
    });
  }, []);

  const nativeStyles = getNativeStyles(platform);

  const toggleSidebar = (): void => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={`
        ${nativeStyles.sidebar.background}
        ${nativeStyles.sidebar.border}
        ${isExpanded ? nativeStyles.sidebar.width.expanded : nativeStyles.sidebar.width.collapsed}
        flex flex-col transition-all duration-300 ease-in-out
        h-full overflow-hidden
      `}
    >
      <div className="p-2 border-b border-gray-700/30 space-y-2">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <h2 className="text-sm font-semibold text-white">Chats</h2>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? '<' : '>'}
          </button>
        </div>
        {isExpanded && (
          <button
            type="button"
            onClick={onCreateNewTab}
            className={`${nativeStyles.tabs.newChatButton} w-full whitespace-nowrap`}
            aria-label="New Chat"
          >
            + New Chat
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="flex-1 overflow-hidden">
          <ChatListComponent chatListService={chatListService} onChatSelect={onChatSelect} />
        </div>
      )}
    </div>
  );
};

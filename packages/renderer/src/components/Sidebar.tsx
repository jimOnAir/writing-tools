import React, { useState, useEffect } from 'react';

import type { ChatListService } from '../domains/chat-list';
import type { MultiChatService } from '../domains/multi-chat';
import { getNativeStyles } from '../styles/NativeStyles';
import type { IChatListState } from '../types/IChatListState';
import { getPlatform } from '../utils/platformDetection';

import ChatListComponent from './ChatListComponent';
import { ChevronLeftIcon, ChevronRightIcon, GearIcon, PlusIcon } from './icons';

interface SidebarProps {
  readonly chatListService: ChatListService;
  readonly chatListState: IChatListState;
  readonly multiChatService: MultiChatService;
  readonly onChatSelect: (chatId: number) => void;
  readonly onCreateNewTab: () => void;
  readonly onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ chatListService, chatListState, multiChatService, onChatSelect, onCreateNewTab, onOpenSettings }) => {
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
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <h2 className="text-sm font-semibold text-white transition-opacity duration-300">Chats</h2>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-300 active:scale-95"
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? <ChevronLeftIcon size={18} /> : <ChevronRightIcon size={18} />}
          </button>
        </div>
        {isExpanded && (
          <button
            type="button"
            onClick={onCreateNewTab}
            className={`${nativeStyles.tabs.newChatButton} w-full whitespace-nowrap flex items-center justify-center gap-2`}
            aria-label="New Chat"
          >
            <PlusIcon size={18} />
            <span>New Chat</span>
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="flex-1 overflow-auto">
          <ChatListComponent chatListService={chatListService} chatListState={chatListState} multiChatService={multiChatService} onChatSelect={onChatSelect} />
        </div>
      )}
      {isExpanded && (
        <div className="sticky bottom-0 p-3">
          <button
            type="button"
            onClick={onOpenSettings}
            className={`${nativeStyles.button.settings} w-full whitespace-nowrap flex items-center justify-center gap-2`}
            aria-label="Open settings"
          >
            <GearIcon size={18} />
            <span>Settings</span>
          </button>
        </div>
      )}
    </div>
  );
};

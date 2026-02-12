import type { IChatInfo } from '@writing-tools/shared';
import React, { useState, useEffect, useMemo } from 'react';

import type { ChatListService } from '../domains/chat-list';
import type { ITabInfo, MultiChatService } from '../domains/multi-chat';
import type { SettingsService } from '../domains/settings';
import { BackgroundStyles } from '../styles/Styles';
import type { IChatListState } from '../types/IChatListState';
import { getPlatform } from '../utils/platformDetection';
import { isErrorResponse } from '../utils/responseTypeGuards';

import ChatComponent from './ChatComponent';
import { RecentChatsView } from './RecentChatsView';
import { SettingsModal } from './SettingsModal';
import { Sidebar } from './Sidebar';
import { TabBar } from './tabs';

export type { IChatListState };

interface MainLayoutProps {
  readonly chatListService: ChatListService;
  readonly multiChatService: MultiChatService;
  readonly settingsService: SettingsService;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  chatListService,
  multiChatService,
  settingsService,
}) => {
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabsVersion, setTabsVersion] = useState(0);
  const [chats, setChats] = useState<IChatInfo[]>([]);
  const [chatListError, setChatListError] = useState<string | null>(null);
  const [chatListHasMore, setChatListHasMore] = useState(false);
  const [chatListLoading, setChatListLoading] = useState(true);
  const [chatListLoadingMore, setChatListLoadingMore] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');

  // Own chat list state and subscribe to ChatListService (single source of truth for sidebar and recent chats view)
  useEffect(() => {
    chatListService.setCallbacks({
      onChatsChange: setChats,
      onDeletingChatIdChange: setDeletingChatId,
      onErrorChange: setChatListError,
      onHasMoreChange: setChatListHasMore,
      onLoadingChange: setChatListLoading,
      onLoadingMoreChange: setChatListLoadingMore,
    });
    chatListService.initializeListeners();
    void chatListService.loadChats();

    return () => {
      chatListService.cleanupListeners();
    };
  }, [chatListService]);

  useEffect(() => {
    void getPlatform().then(p => {
      setPlatform(p);
    });

    const callbacks = {
      onActiveTabChange: (tabId: string | null) => {
        setActiveTabId(tabId);
      },
      onTabsChange: (_tabs: readonly ITabInfo[]) => {
        // Force re-render when tabs change (e.g., when tab type changes)
        setTabsVersion(prev => prev + 1);
      },
    };

    multiChatService.setCallbacks(callbacks);

    multiChatService.initializeListeners();

    // Load saved tabs on mount; do not auto-create a tab when none exist
    // Only restore from DB when we have no in-memory tabs (avoids overwriting tabs user opened before loadTabs returned)
    (async () => {
      try {
        const response = await multiChatService.loadTabs();

        const hasTabsFromDb = response !== undefined && response !== null && !isErrorResponse(response) && 'tabs' in response && Array.isArray(response.tabs) && response.tabs.length > 0;
        const hasTabsInMemory = multiChatService.getAllTabs().length > 0;

        if (hasTabsFromDb && !hasTabsInMemory) {
          await multiChatService.restoreTabs(response.tabs, response.scrollPositionsByChatId);
        }
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        console.error('Failed to load tabs: %s', errorText);
      }

      setActiveTabId(multiChatService.getActiveTabId());
    })().catch((error: unknown) => {
      const errorText = error instanceof Error ? error.message : String(error);
      console.error('Error loading tabs: %s', errorText);
      setActiveTabId(multiChatService.getActiveTabId());
    });

    return () => {
      // Don't save tabs on unmount - it causes race condition during app restart
      // Tabs are saved via window close event handler instead
      multiChatService.removeCallbacks(callbacks);
      multiChatService.cleanupListeners();
    };
  }, [multiChatService]);

  const handleCreateNewTab = (): void => {
    multiChatService.createNewChatTab();
  };

  const handleChatSelect = (chatId: number): void => {
    multiChatService.openChatTab(chatId);
  };

  // Get active tab - recompute when activeTabId, tabsVersion, or multiChatService changes
  const activeTab = useMemo(() => {
    const tab = multiChatService.getActiveTab();

    return tab;
  }, [multiChatService, activeTabId, tabsVersion]);

  const chatListState: IChatListState = useMemo(
    () => ({
      chats,
      deletingChatId,
      error: chatListError,
      hasMore: chatListHasMore,
      isLoading: chatListLoading,
      isLoadingMore: chatListLoadingMore,
    }),
    [chats, chatListError, chatListHasMore, chatListLoading, chatListLoadingMore, deletingChatId],
  );

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${BackgroundStyles.main}`}>
      <Sidebar
        chatListService={chatListService}
        chatListState={chatListState}
        multiChatService={multiChatService}
        onChatSelect={handleChatSelect}
        onCreateNewTab={handleCreateNewTab}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
        }}
      />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabBar multiChatService={multiChatService} />
        <div className={`flex flex-col flex-1 min-h-0 overflow-hidden p-6 ${BackgroundStyles.main}`}>
          {(() => {
            if (activeTab === null) {
              return (
                <RecentChatsView
                  chatListState={chatListState}
                  onChatSelect={handleChatSelect}
                  onCreateNewChat={handleCreateNewTab}
                />
              );
            }

            return (
              <ChatComponent
                key={activeTab.tabId}
                chatId={activeTab.chatId}
                chatService={activeTab.chatService}
                settingsService={settingsService}
              />
            );
          })()}
        </div>
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
        }}
        settingsService={settingsService}
      />
    </div>
  );
};

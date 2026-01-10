import React, { useState, useEffect, useMemo } from 'react';

import type { ChatListService } from '../domains/chat-list';
import type { ITabInfo, MultiChatService } from '../domains/multi-chat';
import type { PromptSelectorService } from '../domains/prompt-selector';
import type { SettingsService } from '../domains/settings';
import { BackgroundStyles } from '../styles/Styles';
import { getPlatform } from '../utils/platformDetection';
import { isErrorResponse } from '../utils/responseTypeGuards';

import ChatComponent from './ChatComponent';
import PromptSelectorComponent from './PromptSelectorComponent';
import { SettingsModal } from './SettingsModal';
import { Sidebar } from './Sidebar';
import { TabBar } from './tabs';

interface MainLayoutProps {
  readonly multiChatService: MultiChatService;
  readonly chatListService: ChatListService;
  readonly settingsService: SettingsService;
  readonly promptSelectorService: PromptSelectorService;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  multiChatService,
  chatListService,
  settingsService,
  promptSelectorService,
}) => {
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabsVersion, setTabsVersion] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');

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

    // Set prompt selector service for MultiChatService
    multiChatService.setPromptSelectorService(promptSelectorService);

    // Initialize listeners (this will set up prompt selector data handling and save tabs request)
    multiChatService.initializeListeners();

    // Initialize prompt selector service listener
    promptSelectorService.initializeListeners();

    // Load saved tabs on mount (before creating initial tab)
    (async () => {
      try {
        const response = await multiChatService.loadTabs();

        if (response !== undefined && response !== null) {
          if (isErrorResponse(response)) {
            // Error response - create initial tab if none exist
            const tabs = multiChatService.getAllTabs();
            if (!tabs || tabs.length === 0) {
              multiChatService.createNewChatTab();
            }
          } else if ('tabs' in response && Array.isArray(response.tabs) && response.tabs.length > 0) {
            await multiChatService.restoreTabs(response.tabs);
          } else {
            // No saved tabs, create initial tab if none exist
            const tabs = multiChatService.getAllTabs();
            if (!tabs || tabs.length === 0) {
              multiChatService.createNewChatTab();
            }
          }
        } else {
          // Response is undefined/null - create initial tab if none exist
          const tabs = multiChatService.getAllTabs();
          if (!tabs || tabs.length === 0) {
            multiChatService.createNewChatTab();
          }
        }
      } catch (error: unknown) {
        const errorText = error instanceof Error ? error.message : String(error);
        console.error('Failed to load tabs: %s', errorText);
        // On error, create initial tab if none exist
        const tabs = multiChatService.getAllTabs();
        if (!tabs || tabs.length === 0) {
          multiChatService.createNewChatTab();
        }
      }

      // Set initial active tab
      setActiveTabId(multiChatService.getActiveTabId());
    })().catch((error: unknown) => {
      const errorText = error instanceof Error ? error.message : String(error);
      console.error('Error loading tabs: %s', errorText);
      // On error, create initial tab if none exist
      const tabs = multiChatService.getAllTabs();
      if (!tabs || tabs.length === 0) {
        multiChatService.createNewChatTab();
      }
      setActiveTabId(multiChatService.getActiveTabId());
    });

    return () => {
      // Don't save tabs on unmount - it causes race condition during app restart
      // Tabs are saved via window close event handler instead
      multiChatService.removeCallbacks(callbacks);
      multiChatService.cleanupListeners();
      promptSelectorService.cleanupListeners();
    };
  }, [multiChatService, promptSelectorService]);

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

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${BackgroundStyles.main}`}>
      <Sidebar
        chatListService={chatListService}
        multiChatService={multiChatService}
        onChatSelect={handleChatSelect}
        onCreateNewTab={handleCreateNewTab}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
        }}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TabBar multiChatService={multiChatService} />
        <div className={`flex-1 overflow-hidden p-6 ${BackgroundStyles.main}`}>
          {(() => {
            if (!activeTab) {
              return (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <p className="text-base mb-2">No active chat</p>
                  <p className="text-sm">Create a new chat to get started</p>
                </div>
              );
            }

            if (activeTab.type === 'prompt-selector' && activeTab.promptSelectorService) {
              return <PromptSelectorComponent key={`${activeTab.tabId}-prompt-selector`} promptSelectorService={activeTab.promptSelectorService} />;
            }

            if (activeTab.type === 'chat' && activeTab.chatService) {
              return <ChatComponent key={`${activeTab.tabId}-chat`} chatService={activeTab.chatService} chatId={activeTab.chatId} />;
            }

            return (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-base">Invalid tab type</p>
              </div>
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

import React, { useState, useEffect, useMemo } from 'react';

import type { ChatListService } from '../domains/chat-list';
import type { MultiChatService } from '../domains/multi-chat';
import type { PromptSelectorService } from '../domains/prompt-selector';
import type { SettingsService } from '../domains/settings';
import { getNativeStyles } from '../styles/NativeStyles';
import { BackgroundStyles } from '../styles/Styles';
import { getPlatform } from '../utils/platformDetection';

import ChatComponent from './ChatComponent';
import { SettingsIcon } from './icons';
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
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');

  useEffect(() => {
    void getPlatform().then(p => {
      setPlatform(p);
    });

    const callbacks = {
      onActiveTabChange: (tabId: string | null) => {
        setActiveTabId(tabId);
      },
      onTabsChange: () => {
        // Force re-render when tabs change (e.g., when tab type changes)
        setTabsVersion(prev => prev + 1);
      },
    };

    multiChatService.setCallbacks(callbacks);

    // Set prompt selector service for MultiChatService
    multiChatService.setPromptSelectorService(promptSelectorService);

    // Initialize listeners (this will set up prompt selector data handling)
    multiChatService.initializeListeners();

    // Initialize prompt selector service listener
    promptSelectorService.initializeListeners();

    // Create initial tab if none exist
    if (multiChatService.getAllTabs().length === 0) {
      multiChatService.createNewChatTab();
    }

    // Set initial active tab
    setActiveTabId(multiChatService.getActiveTabId());

    return () => {
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
    return multiChatService.getActiveTab();
  }, [multiChatService, activeTabId, tabsVersion]);
  const nativeStyles = getNativeStyles(platform);

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${BackgroundStyles.main}`}>
      <Sidebar chatListService={chatListService} onChatSelect={handleChatSelect} onCreateNewTab={handleCreateNewTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`${nativeStyles.header.background} ${nativeStyles.header.border} flex items-center justify-between px-6 py-3`}>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => {
              setIsSettingsOpen(true);
            }}
            className={`${nativeStyles.button.settings} flex items-center gap-2`}
            aria-label="Open settings"
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
          </button>
        </div>
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

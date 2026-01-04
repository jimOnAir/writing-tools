import React, { useState, useEffect } from 'react';

import type { MultiChatService, ITabInfo } from '../../domains/multi-chat';
import { getNativeStyles } from '../../styles/NativeStyles';
import { getPlatform } from '../../utils/platformDetection';

import { Tab } from './Tab';

interface TabBarProps {
  readonly multiChatService: MultiChatService;
}

export const TabBar: React.FC<TabBarProps> = ({ multiChatService }) => {
  const [tabs, setTabs] = useState<readonly ITabInfo[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');

  useEffect(() => {
    void getPlatform().then(p => {
      setPlatform(p);
    });

    const callbacks = {
      onTabsChange: setTabs,
      onActiveTabChange: setActiveTabId,
    };

    multiChatService.setCallbacks(callbacks);

    // Initialize tabs list
    setTabs(multiChatService.getAllTabs());
    setActiveTabId(multiChatService.getActiveTabId());

    // Cleanup: remove callbacks on unmount
    return () => {
      multiChatService.removeCallbacks(callbacks);
    };
  }, [multiChatService]);

  const handleTabSelect = (tabId: string): void => {
    multiChatService.switchToTab(tabId);
  };

  const handleTabClose = (tabId: string): void => {
    multiChatService.closeChatTab(tabId);
  };

  const nativeStyles = getNativeStyles(platform);

  return (
    <div className={`${nativeStyles.tabs.container} flex items-center gap-1 overflow-x-auto`}>
      <div className="flex items-center gap-1 overflow-x-auto flex-1">
        {tabs.map((tab) => (
          <Tab
            key={tab.tabId}
            tab={tab}
            isActive={activeTabId === tab.tabId}
            onSelect={() => {
              handleTabSelect(tab.tabId);
            }}
            onClose={() => {
              handleTabClose(tab.tabId);
            }}
            platform={platform}
          />
        ))}
      </div>
    </div>
  );
};

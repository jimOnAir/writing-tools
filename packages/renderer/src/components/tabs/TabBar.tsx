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
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

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

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, tabId: string): void => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tabId);

    // Use a minimal transparent drag image so the tooltip is not captured
    const dragImage = globalThis.document.createElement('div');
    dragImage.style.width = '1px';
    dragImage.style.height = '1px';
    dragImage.style.opacity = '0';
    dragImage.style.pointerEvents = 'none';
    globalThis.document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);

    // Clean up drag image on next tick
    globalThis.window.setTimeout(() => {
      if (dragImage.parentNode) {
        dragImage.parentNode.removeChild(dragImage);
      }
    }, 0);

    setDraggedTabId(tabId);
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>, tabId: string): void => {
    event.preventDefault();

    if (tabId !== dragOverTabId) {
      setDragOverTabId(tabId);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>, targetTabId: string): void => {
    event.preventDefault();

    // Only clear state for invalid drops - valid drops will be handled by handleDragEnd
    if (draggedTabId === null || draggedTabId === targetTabId) {
      setDraggedTabId(null);
      setDragOverTabId(null);
    }
  };

  const handleDragEnd = (): void => {
    if (draggedTabId !== null && dragOverTabId !== null && draggedTabId !== dragOverTabId) {
      const fromIndex = tabs.findIndex(tab => tab.tabId === draggedTabId);
      const toIndex = tabs.findIndex(tab => tab.tabId === dragOverTabId);

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        multiChatService.reorderTabs(fromIndex, toIndex);
      }
    }

    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const nativeStyles = getNativeStyles(platform);

  return (
    <div className={`${nativeStyles.tabs.container} flex items-center gap-1 overflow-x-auto transition-all duration-300`}>
      <div className="flex items-center gap-1 overflow-x-auto flex-1">
        {tabs.map((tab) => (
          <Tab
            key={tab.tabId}
            tab={tab}
            isActive={activeTabId === tab.tabId}
            isDragging={draggedTabId === tab.tabId}
            isDragOver={dragOverTabId === tab.tabId}
            onDragStart={(event) => {
              handleDragStart(event, tab.tabId);
            }}
            onDragOver={(event) => {
              handleDragOver(event, tab.tabId);
            }}
            onDrop={(event) => {
              handleDrop(event, tab.tabId);
            }}
            onDragEnd={handleDragEnd}
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

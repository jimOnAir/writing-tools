import React, { useState, useEffect, useRef } from 'react';

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
  const tabBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void getPlatform().then(p => {
      setPlatform(p);
    });

    const callbacks = {
      onTabsChange: (tabs: readonly ITabInfo[]) => {
        setTabs(tabs);
      },
      onActiveTabChange: (tabId: string | null) => {
        setActiveTabId(tabId);
      },
    };

    multiChatService.setCallbacks(callbacks);

    // Initialize tabs list from service (only if service has tabs)
    // This ensures we get the current state, but callbacks will update us if tabs change
    const initialTabs = multiChatService.getAllTabs();
    const initialActiveTabId = multiChatService.getActiveTabId();
    if (initialTabs.length > 0) {
      setTabs(initialTabs);
    }
    if (initialActiveTabId !== null) {
      setActiveTabId(initialActiveTabId);
    }

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

  const findTabAtPosition = (clientX: number, clientY: number): string | null => {
    if (!tabBarRef.current) {
      return null;
    }

    const tabElements = tabBarRef.current.querySelectorAll('[data-tab-id]');
    let targetTabId: string | null = null;
    let minDistance = Infinity;

    tabElements.forEach((tabElement) => {
      const rect = tabElement.getBoundingClientRect();
      const tabId = tabElement.getAttribute('data-tab-id');

      if (!tabId) {
        return;
      }

      // Check if mouse is within tab bounds
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        const centerX = rect.left + rect.width / 2;
        const distance = Math.abs(clientX - centerX);

        if (distance < minDistance) {
          minDistance = distance;
          targetTabId = tabId;
        }
      } else {
        // Check distance to tab center for nearby tabs
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));

        if (distance < minDistance && distance < 100) {
          minDistance = distance;
          targetTabId = tabId;
        }
      }
    });

    return targetTabId;
  };

  const handleTabBarDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();

    if (draggedTabId === null) {
      return;
    }

    const targetTabId = findTabAtPosition(event.clientX, event.clientY);

    if (targetTabId !== null && targetTabId !== draggedTabId && targetTabId !== dragOverTabId) {
      setDragOverTabId(targetTabId);
    }
  };

  const handleTabBarDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();

    if (draggedTabId === null) {
      return;
    }

    // If dragOverTabId is not set or is the same as dragged tab, try to find target tab
    let targetTabId = dragOverTabId;
    if (targetTabId === null || targetTabId === draggedTabId) {
      targetTabId = findTabAtPosition(event.clientX, event.clientY);
      if (targetTabId !== null && targetTabId !== draggedTabId) {
        setDragOverTabId(targetTabId);
      }
    }
  };

  return (
    <div
      ref={tabBarRef}
      className={`${nativeStyles.tabs.container} flex items-center gap-1 overflow-x-auto transition-all duration-300`}
      onDragOver={handleTabBarDragOver}
      onDrop={handleTabBarDrop}
    >
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

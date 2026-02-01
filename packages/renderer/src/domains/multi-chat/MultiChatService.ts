import type { IChatWindowData, ILogger, IPromptSelectorData, TIpcEvent, TOpenTab } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import type { TIpcRenderListener } from '../../types/TIpcRenderListener';
import { isErrorResponse } from '../../utils/responseTypeGuards';
import { ChatService } from '../chat';

export type TabType = 'chat';

export interface ITabInfo {
  readonly chatService: ChatService;
  chatId: number | null;
  readonly tabId: string;
  title: string | null;
  readonly type: TabType;
  removeTitleChangeCallback?: () => void;
}

// TODO: create new chat with CTRL+N

/**
 * Service for managing multiple chat tabs
 * Handles tab creation, switching, closing, and IPC event routing
 */
export class MultiChatService {
  private readonly ipcAdapter: IIpcAdapter;
  private readonly logger: ILogger;
  private readonly tabs: ITabInfo[] = [];
  private activeTabId: string | null = null;
  private chatWindowDataListener: TIpcRenderListener | null = null;
  private chatDeletedListener: TIpcRenderListener | null = null;
  private promptSelectorDataListener: TIpcRenderListener | null = null;
  private isRestoringTabs = false;
  private saveTabsTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private keydownListener: ((event: KeyboardEvent) => void) | null = null;
  /** Scroll position per chatId when tab was closed; restored when same chat is reopened */
  private readonly scrollPositionByChatId = new Map<number, number>();

  // Callbacks for component state updates (support multiple subscribers)
  private readonly onTabsChangeCallbacks = new Set<(tabs: ITabInfo[]) => void>();
  private readonly onActiveTabChangeCallbacks = new Set<(tabId: string | null) => void>();

  public constructor(ipcAdapter: IIpcAdapter, logger: ILogger) {
    this.ipcAdapter = ipcAdapter;
    this.logger = logger;
  }

  /**
   * Register callbacks for state changes
   * Supports multiple subscribers - callbacks are not replaced, but added to a set
   */
  public setCallbacks(callbacks: {
    onTabsChange?: (tabs: ITabInfo[]) => void,
    onActiveTabChange?: (tabId: string | null) => void,
  }): void {
    if (callbacks.onTabsChange !== undefined) {
      this.onTabsChangeCallbacks.add(callbacks.onTabsChange);
      // Immediately notify the new callback with current tabs state
      // Only notify if we're not currently restoring tabs AND we have tabs (to avoid sending 0 tabs during app startup)
      if (!this.isRestoringTabs && this.tabs.length > 0) {
        callbacks.onTabsChange([...this.tabs]);
      }
    }
    if (callbacks.onActiveTabChange !== undefined) {
      this.onActiveTabChangeCallbacks.add(callbacks.onActiveTabChange);
      // Immediately notify the new callback with current active tab
      // Only notify if we're not currently restoring tabs AND we have an active tab (to avoid sending null during app startup)
      if (!this.isRestoringTabs && this.activeTabId !== null) {
        callbacks.onActiveTabChange(this.activeTabId);
      }
    }
  }

  /**
   * Remove callbacks for state changes
   * Use this when a component unmounts to prevent memory leaks
   */
  public removeCallbacks(callbacks: {
    onTabsChange?: (tabs: ITabInfo[]) => void,
    onActiveTabChange?: (tabId: string | null) => void,
  }): void {
    if (callbacks.onTabsChange !== undefined) {
      this.onTabsChangeCallbacks.delete(callbacks.onTabsChange);
    }
    if (callbacks.onActiveTabChange !== undefined) {
      this.onActiveTabChangeCallbacks.delete(callbacks.onActiveTabChange);
    }
  }

  /**
   * Initialize IPC listeners for chat events
   */
  public initializeListeners(): void {
    const handleChatWindowData = (data: IChatWindowData) => {
      const promptText = data.prompt === '' ? 'none' : data.prompt;
      const chatIdText = data.chatId === undefined ? 'undefined' : String(data.chatId);
      this.logger.info('MultiChatService received CHAT_WINDOW_DATA: prompt=%s, chatId=%s', promptText, chatIdText);

      if (data.prompt === undefined || data.prompt === '' || data.chatId === undefined) {
        return;
      }

      const activeTab = this.getActiveTab();
      // CHAT_WINDOW_DATA is only sent from prompt-select (IpcPromptSelectorHandler); always reuse active tab when present
      let tab: ITabInfo;
      if (activeTab?.chatService !== undefined) {
        tab = activeTab;
      } else {
        tab = this.createNewChatTab();
      }

      tab.chatId = data.chatId;
      this.saveTabsIfNotRestoring();
      void tab.chatService.loadChatMessages(data.chatId);
      this.switchToTab(tab.tabId);
    };

    const handleChatDeleted = (data: { chatId: number }) => {
      this.logger.info('MultiChatService received CHAT_DELETED: chatId=%s', String(data.chatId));

      const tabToClose = this.tabs.find(t => t.chatId === data.chatId);
      if (tabToClose !== undefined) {
        this.closeChatTab(tabToClose.tabId);
      }
    };

    const handlePromptSelectorData = (data: IPromptSelectorData) => {
      const selectedTextStatus = data.selectedText === '' ? 'empty' : 'present';
      const promptsCount = String(data.preconfiguredPrompts.length);
      this.logger.info('MultiChatService received PROMPT_SELECTOR_DATA: selectedText=%s, promptsCount=%s', selectedTextStatus, promptsCount);

      const newTab = this.createNewChatTab();
      newTab.chatService.setPromptSelectorData(data);
    };

    this.chatWindowDataListener = this.ipcAdapter.onChatWindowData(handleChatWindowData);
    this.chatDeletedListener = this.ipcAdapter.onChatDeleted(handleChatDeleted);
    this.promptSelectorDataListener = this.ipcAdapter.onPromptSelectorData(handlePromptSelectorData);

    const handleKeydown = (event: KeyboardEvent) => {
      const isCtrlPressed = event.ctrlKey || event.metaKey;
      if (isCtrlPressed && event.key === 'w') {
        event.preventDefault();

        const activeTab = this.getActiveTab();
        if (activeTab !== null && this.tabs.length > 0) {
          this.logger.info('Ctrl+W pressed, closing current active tab');
          this.closeChatTab(activeTab.tabId);
        }
      }
    };

    this.keydownListener = handleKeydown;
    document.addEventListener('keydown', this.keydownListener);
  }

  /**
   * Cleanup IPC listeners
   */
  public cleanupListeners(): void {
    if (this.chatWindowDataListener !== null) {
      this.ipcAdapter.offChatWindowData(this.chatWindowDataListener);
      this.chatWindowDataListener = null;
    }
    if (this.chatDeletedListener !== null) {
      this.ipcAdapter.offChatDeleted(this.chatDeletedListener);
      this.chatDeletedListener = null;
    }
    if (this.promptSelectorDataListener !== null) {
      this.ipcAdapter.offPromptSelectorData(this.promptSelectorDataListener);
      this.promptSelectorDataListener = null;
    }

    // Cleanup keyboard listener
    if (this.keydownListener !== null) {
      document.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }

    // Clear any pending save operation
    if (this.saveTabsTimeoutId !== null) {
      clearTimeout(this.saveTabsTimeoutId);
      this.saveTabsTimeoutId = null;
    }
  }

  /**
   * Create a new chat tab
   * Note: This does NOT remove empty tabs - call removeEmptyTabs() separately if needed
   */
  public createNewChatTab(): ITabInfo {
    const tabId = this.generateTabId();
    const chatService = new ChatService(this.ipcAdapter, this.logger);

    // Initialize listeners for the new chat service
    chatService.initializeListeners();

    // Listen to title changes to update tab title
    const handleTitleChange = (title: string) => {
      const foundTab = this.tabs.find(t => t.tabId === tabId);
      if (foundTab?.chatService) {
        const serviceChatId = foundTab.chatService.getCurrentChatId();
        // Only update title if tab's chatId matches service's currentChatId, or if both are null (new chat)
        // This prevents updating title for wrong chat when tab.chatId and service.currentChatId are out of sync
        if (foundTab.chatId === serviceChatId || (foundTab.chatId === null && serviceChatId !== null)) {
          // If tab.chatId is null but service has a chatId, update tab.chatId to sync them
          if (foundTab.chatId === null && serviceChatId !== null) {
            foundTab.chatId = serviceChatId;
          }
          foundTab.title = title;
          this.notifyTabsChange();
        }
      }
    };

    // Add title change callback (using addTitleChangeCallback to support multiple callbacks)
    // This allows ChatComponent to also receive title updates via setCallbacks
    const removeTitleChangeCallback = chatService.addTitleChangeCallback(handleTitleChange);

    const tab: ITabInfo = {
      tabId,
      type: 'chat',
      chatId: null,
      chatService,
      title: null,
      removeTitleChangeCallback,
    };

    this.tabs.push(tab);

    // Notify tabs change first so UI knows about the new tab
    this.notifyTabsChange();

    // Always switch to the new tab and notify
    this.switchToTab(tabId);

    return tab;
  }

  /**
   * Open an existing chat in a new tab (or switch to existing tab if already open)
   */
  public openChatTab(chatId: number): ITabInfo {
    // Check if chat is already open in a tab
    const existingTab = this.tabs.find(t => t.chatId === chatId);
    if (existingTab) {
      this.switchToTab(existingTab.tabId);

      return existingTab;
    }

    // Create new tab for this chat
    const tab = this.createNewChatTab();
    tab.chatId = chatId;

    const savedScroll = this.scrollPositionByChatId.get(chatId);
    if (savedScroll !== undefined) {
      tab.chatService.setScrollPosition(savedScroll);
      this.scrollPositionByChatId.delete(chatId);
    }

    // #region agent log
    if (typeof globalThis.fetch === 'function') {
      globalThis.fetch('http://127.0.0.1:7242/ingest/1426d91e-479d-41a6-b4cb-9d63e420a78a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'MultiChatService.ts:openChatTab', message: 'openChatTab new tab', data: { chatId, scrollPositionOnNewService: tab.chatService.getScrollPosition() }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1-H5' }) }).catch(() => {});
    }
    // #endregion

    // Save tabs to database (chatId is now set)
    this.saveTabsIfNotRestoring();

    // Load messages for this chat
    const tabChatService = tab.chatService;
    if (tabChatService) {
      void tabChatService.loadChatMessages(chatId).then(() => {
        // Fetch title after loading messages
        void tabChatService.getChatInfo(chatId).then(chatInfo => {
          if (chatInfo) {
            tab.title = chatInfo.title || null;
            this.notifyTabsChange();
            // Save tabs after title is updated
            this.saveTabsIfNotRestoring();
          }
        });
      });
    }

    return tab;
  }

  /**
   * Close a chat tab
   */
  public closeChatTab(tabId: string): void {
    this.logger.info('Closing tab: tabId=%s, total tabs=%s', tabId, String(this.tabs.length));

    const tabIndex = this.tabs.findIndex(t => t.tabId === tabId);
    if (tabIndex === -1) {
      this.logger.warn('Tab not found for closing: tabId=%s', tabId);

      return;
    }

    const tab = this.tabs[tabIndex];
    const wasActive = this.activeTabId === tabId;
    const isLastTab = this.tabs.length === 1;

    if (tab.chatId !== null) {
      this.scrollPositionByChatId.set(tab.chatId, tab.chatService.getScrollPosition());
    }

    // #region agent log
    const closedScroll = tab.chatService?.getScrollPosition?.() ?? -1;
    if (typeof globalThis.fetch === 'function') {
      globalThis.fetch('http://127.0.0.1:7242/ingest/1426d91e-479d-41a6-b4cb-9d63e420a78a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'MultiChatService.ts:closeChatTab', message: 'closeChatTab before splice', data: { tabId, chatId: tab.chatId, closedScrollPosition: closedScroll }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1-H5' }) }).catch(() => {});
    }
    // #endregion

    if (tab.chatService !== undefined) {
      tab.chatService.cleanupListeners();
    }
    if (tab.removeTitleChangeCallback !== undefined) {
      tab.removeTitleChangeCallback();
    }

    this.tabs.splice(tabIndex, 1);
    this.logger.info('Tab removed. Remaining tabs: %s', String(this.tabs.length));

    if (isLastTab) {
      this.activeTabId = null;
      this.notifyActiveTabChange();
    } else if (wasActive) {
      const newIndex = Math.max(0, tabIndex - 1);
      this.logger.info('Switching to tab at index: %s', String(newIndex));
      this.switchToTab(this.tabs[newIndex].tabId);
    }

    this.notifyTabsChange();
    void this.saveTabs();
  }

  /**
   * Switch to a specific tab
   */
  public switchToTab(tabId: string): void {
    const tab = this.tabs.find(t => t.tabId === tabId);
    if (tab === undefined) {
      return;
    }

    this.activeTabId = tabId;
    this.notifyActiveTabChange();

    // Save tabs to database after active tab change
    this.saveTabsIfNotRestoring();
  }

  /**
   * Get the active tab ID
   */
  public getActiveTabId(): string | null {
    return this.activeTabId;
  }

  /**
   * Get the active tab
   */
  public getActiveTab(): ITabInfo | null {
    if (this.activeTabId === null) {
      return null;
    }

    const tab = this.tabs.find(t => t.tabId === this.activeTabId) || null;

    return tab;
  }

  /**
   * Get all tabs
   */
  public getAllTabs(): readonly ITabInfo[] {
    return this.tabs;
  }

  /**
   * Load tabs from main process
   */
  public async loadTabs(): Promise<{ scrollPositionsByChatId?: Record<number, number>, tabs: TOpenTab[] } | { error: string }> {
    try {
      const payload: TIpcEvent<EIpcChannel.TAB, EIpcEvent.TABS_LOAD> = {
        channel: EIpcChannel.TAB,
        event: EIpcEvent.TABS_LOAD,
        payload: {},
      };

      const response = await this.ipcAdapter.invoke(payload.channel, payload);

      if ('error' in response) {
        this.logger.error('Failed to load tabs: %s', response.error);
      } else {
        this.logger.info('Loaded %d tabs', String(response.tabs.length));
      }

      return response;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to load tabs: %s', errorText);

      return { error: errorText };
    }
  }

  /**
   * Save current tabs to main process (open tabs plus scroll-only rows for closed chats, tabOrder -1)
   */
  public async saveTabs(): Promise<void> {
    try {
      const openChatIds = new Set(
        this.tabs
          .filter((tab): tab is ITabInfo & { chatId: number } => tab.chatId !== null)
          .map(tab => tab.chatId),
      );
      const chatTabs = this.tabs.map((tab, index) => ({
        chatId: tab.chatId,
        isActive: tab.tabId === this.activeTabId,
        scrollPosition: tab.chatService.getScrollPosition(),
        tabOrder: index,
      }));
      const scrollOnlyTabs: TOpenTab[] = [...this.scrollPositionByChatId.entries()]
        .filter(([chatId]) => !openChatIds.has(chatId))
        .map(([chatId, scrollPosition]) => ({
          chatId,
          isActive: false,
          scrollPosition,
          tabOrder: -1,
        }));
      const tabs = [...chatTabs, ...scrollOnlyTabs];

      const payload: TIpcEvent<EIpcChannel.TAB, EIpcEvent.TABS_SAVE> = {
        channel: EIpcChannel.TAB,
        event: EIpcEvent.TABS_SAVE,
        payload: { tabs },
      };

      const response = await this.ipcAdapter.invoke(payload.channel, payload);

      if ('error' in response) {
        this.logger.error('Failed to save tabs: %s', response.error);
      } else {
        this.logger.info('Saved %d tabs', String(tabs.length));
      }
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to save tabs: %s', errorText);
    }
  }

  /**
   * Restore tabs from saved state
   * Skips tabs with deleted chatIds
   * Only restores chat tabs
   * Restores tab order and active tab
   * Merges scrollPositionsByChatId (from DB scroll-only rows) into in-memory cache for reopen
   */
  public async restoreTabs(
    savedTabs: TOpenTab[],
    scrollPositionsByChatId?: Record<number, number>,
  ): Promise<void> {
    if (scrollPositionsByChatId !== undefined) {
      for (const [chatId, scrollPosition] of Object.entries(scrollPositionsByChatId)) {
        this.scrollPositionByChatId.set(Number(chatId), scrollPosition);
      }
    }

    // Do not overwrite in-memory tabs (e.g. user opened a chat before loadTabs returned)
    if (this.tabs.length > 0) {
      this.logger.info('Skipping restore: already have %d tabs in memory', String(this.tabs.length));

      return;
    }

    // Prevent concurrent restore operations
    if (this.isRestoringTabs) {
      this.logger.info('Restore already in progress, skipping duplicate call');

      return;
    }

    this.isRestoringTabs = true;

    if (savedTabs.length === 0) {
      this.logger.info('No saved tabs to restore, creating default empty tab');

      try {
        // Clear existing tabs
        this.tabs.length = 0;

        // Create default empty tab
        const defaultTab = this.createNewChatTab();
        this.switchToTab(defaultTab.tabId);
        this.notifyTabsChange();

        return;
      } finally {
        this.isRestoringTabs = false;
      }
    }

    try {
      this.logger.info('Restoring %d saved tabs', String(savedTabs.length));

      // Sort by tabOrder to restore in correct order
      const sortedTabs = [...savedTabs].sort((a, b) => a.tabOrder - b.tabOrder);

      // Validate chatIds exist before restoring
      // We'll check this by trying to load messages for each chatId
      const validTabs: TOpenTab[] = [];

      for (const savedTab of sortedTabs) {
        if (savedTab.chatId === null) {
        // Empty tab - always valid
          validTabs.push(savedTab);
        } else {
        // Check if chat exists by trying to get chat info
          try {
            const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_GET> = {
              channel: EIpcChannel.CHAT,
              event: EIpcEvent.CHAT_GET,
              payload: { chatId: savedTab.chatId },
            };

            const response = await this.ipcAdapter.invoke(message.channel, message);

            if (isErrorResponse(response)) {
              this.logger.info('Skipping tab with deleted chatId=%d', String(savedTab.chatId));
              continue;
            }

            validTabs.push(savedTab);
          } catch (error: unknown) {
            const errorText = error instanceof Error ? error.message : String(error);
            this.logger.warn('Error validating chatId=%d, skipping tab: %s', String(savedTab.chatId), errorText);
            continue;
          }
        }
      }

      // Do not clear if user opened a tab while we were validating (async above)
      if (this.tabs.length > 0) {
        this.logger.info('Skipping restore: user opened tabs during validation (%d tabs)', String(this.tabs.length));
        this.isRestoringTabs = false;

        return;
      }

      // Clear existing tabs
      // Actually, we should keep existing tabs and just restore the saved ones
      // But the plan says to restore tabs, so let's clear all and restore
      // However, we need to ensure at least one tab exists
      this.tabs.length = 0;

      if (validTabs.length === 0) {
        this.logger.info('No valid tabs to restore after filtering deleted chats');
        // Continue to create default empty tab below
      }

      // Restore tabs in order
      let activeTabId: string | null = null;

      for (const savedTab of validTabs) {
        if (savedTab.chatId === null) {
          // Create empty chat tab
          const tab = this.createNewChatTab();
          tab.chatService.setScrollPosition((savedTab as { scrollPosition?: number }).scrollPosition ?? 0);
          if (savedTab.isActive) {
            activeTabId = tab.tabId;
          }
        } else {
          // Open existing chat in tab
          const tab = this.openChatTab(savedTab.chatId);
          const restoredScroll = (savedTab as { scrollPosition?: number }).scrollPosition ?? 0;
          tab.chatService.setScrollPosition(restoredScroll);
          // #region agent log
          if (typeof globalThis.fetch === 'function') {
            globalThis.fetch('http://127.0.0.1:7242/ingest/1426d91e-479d-41a6-b4cb-9d63e420a78a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'MultiChatService.ts:restoreTabs', message: 'restoreTabs setScrollPosition', data: { chatId: savedTab.chatId, restoredScroll }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H2' }) }).catch(() => {});
          }
          // #endregion
          if (savedTab.isActive) {
            activeTabId = tab.tabId;
          }
        }
      }

      // If no tabs were restored, create a default empty tab
      if (this.tabs.length === 0) {
        this.logger.info('No tabs restored, creating default empty tab');
        this.createNewChatTab();
        activeTabId = this.tabs[0]?.tabId ?? null;
      } else if (activeTabId !== null) {
        // Switch to the active tab
        this.switchToTab(activeTabId);
      } else if (this.tabs.length > 0) {
        // If no active tab was marked, switch to first tab
        this.switchToTab(this.tabs[0].tabId);
      }

      this.logger.info('Restored %d tabs, active tab: %s', String(this.tabs.length), activeTabId ?? 'none');

      // Notify UI that tabs have changed
      this.notifyTabsChange();
    } finally {
      this.isRestoringTabs = false;
    }
  }

  /**
   * Reorder tabs by moving a tab from one index to another
   */
  public reorderTabs(fromIndex: number, toIndex: number): void {
    const lastIndex = this.tabs.length - 1;

    if (fromIndex === toIndex) {
      return;
    }

    if (fromIndex < 0 || fromIndex > lastIndex) {
      return;
    }

    if (toIndex < 0 || toIndex > lastIndex) {
      return;
    }

    const [movedTab] = this.tabs.splice(fromIndex, 1);
    this.tabs.splice(toIndex, 0, movedTab);

    this.notifyTabsChange();

    // Save tabs to database after reorder
    this.saveTabsIfNotRestoring();
  }

  /**
   * Check if a tab is empty (new chat with no messages)
   */
  private isTabEmpty(tab: ITabInfo): boolean {
    return tab.chatId === null && tab.chatService.getMessages().length === 0;
  }

  /**
   * Remove all empty chat tabs
   * @param allowRemovingLastTab - If true, allows removing the last tab (useful when we're about to create a new tab)
   */
  private removeEmptyTabs(allowRemovingLastTab = false): void {
    const emptyTabs = this.tabs.filter(emptyTab => this.isTabEmpty(emptyTab));

    for (const emptyTab of emptyTabs) {
      // Don't remove if it's the only tab (unless explicitly allowed)
      if (!allowRemovingLastTab && this.tabs.length <= 1) {
        break;
      }

      const tabIndex = this.tabs.findIndex(t => t.tabId === emptyTab.tabId);
      if (tabIndex !== -1 && emptyTab.chatService) {
        emptyTab.chatService.cleanupListeners();
        if (emptyTab.removeTitleChangeCallback) {
          emptyTab.removeTitleChangeCallback();
        }
        this.tabs.splice(tabIndex, 1);

        // If the removed tab was active, switch to another tab (if available)
        if (this.activeTabId === emptyTab.tabId) {
          if (this.tabs.length > 0) {
            const newIndex = Math.max(0, tabIndex - 1);
            this.switchToTab(this.tabs[newIndex].tabId);
          } else {
            this.activeTabId = null;
            this.notifyActiveTabChange();
          }
        }
      }
    }

    if (emptyTabs.length > 0) {
      this.notifyTabsChange();
    }
  }

  /**
   * Save tabs if not currently restoring (to avoid overwriting during restore)
   * Debounced to prevent multiple rapid saves - only the last call in a batch will execute
   */
  private saveTabsIfNotRestoring() {
    if (this.isRestoringTabs) {
      return;
    }

    // Clear any pending save operation
    if (this.saveTabsTimeoutId !== null) {
      clearTimeout(this.saveTabsTimeoutId);
      this.saveTabsTimeoutId = null;
    }

    // Schedule a new save operation (debounced by 100ms)
    this.saveTabsTimeoutId = setTimeout(() => {
      this.saveTabsTimeoutId = null;
      void this.saveTabs();
    }, 100);
  }

  /**
   * Generate a unique tab ID
   */
  private generateTabId(): string {
    const RADIX = 36;
    const START_INDEX = 2;
    const END_INDEX = 9;
    const timestamp = String(Date.now());
    const randomPart = Math.random().toString(RADIX).substring(START_INDEX, END_INDEX);

    return `tab-${timestamp}-${randomPart}`;
  }

  /**
   * Notify all subscribers of tabs change
   */
  private notifyTabsChange(): void {
    const tabsSnapshot = [...this.tabs];

    for (const callback of this.onTabsChangeCallbacks) {
      callback(tabsSnapshot);
    }
  }

  /**
   * Notify all subscribers of active tab change
   */
  private notifyActiveTabChange(): void {
    for (const callback of this.onActiveTabChangeCallbacks) {
      callback(this.activeTabId);
    }
  }
}

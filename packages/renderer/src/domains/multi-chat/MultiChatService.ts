import type { IChatWindowData, IPromptSelectorData } from '@writing-tools/shared';
import { logger } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import type { TIpcRenderListener } from '../../types/TIpcRenderListener';
import { ChatService } from '../chat';
import type { PromptSelectorService } from '../prompt-selector';

export type TabType = 'chat' | 'prompt-selector';

export interface ITabInfo {
  readonly tabId: string;
  readonly type: TabType;
  chatId: number | null;
  readonly chatService?: ChatService;
  readonly promptSelectorService?: PromptSelectorService;
  title: string | null;
  removeTitleChangeCallback?: () => void;
}

/**
 * Service for managing multiple chat tabs
 * Handles tab creation, switching, closing, and IPC event routing
 */
export class MultiChatService {
  private readonly ipcAdapter: IIpcAdapter;
  private readonly tabs: ITabInfo[] = [];
  private activeTabId: string | null = null;
  private chatWindowDataListener: TIpcRenderListener | null = null;
  private chatDeletedListener: TIpcRenderListener | null = null;
  private promptSelectorDataListener: TIpcRenderListener | null = null;
  private promptSelectorService: PromptSelectorService | null = null;

  // Callbacks for component state updates (support multiple subscribers)
  private readonly onTabsChangeCallbacks = new Set<(tabs: ITabInfo[]) => void>();
  private readonly onActiveTabChangeCallbacks = new Set<(tabId: string | null) => void>();

  public constructor(ipcAdapter: IIpcAdapter) {
    this.ipcAdapter = ipcAdapter;
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
    }
    if (callbacks.onActiveTabChange !== undefined) {
      this.onActiveTabChangeCallbacks.add(callbacks.onActiveTabChange);
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
   * Set the prompt selector service (needed for creating prompt selector tabs)
   */
  public setPromptSelectorService(service: PromptSelectorService): void {
    this.promptSelectorService = service;
  }

  /**
   * Initialize IPC listeners for chat events
   */
  public initializeListeners(): void {
    const handleChatWindowData = (data: IChatWindowData) => {
      const promptText = data.prompt === '' ? 'none' : data.prompt;
      const chatIdText = data.chatId === undefined ? 'undefined' : String(data.chatId);
      logger.info('MultiChatService received CHAT_WINDOW_DATA: prompt=%s, chatId=%s', promptText, chatIdText);

      // Check if there's a prompt selector tab that should be replaced
      // Prefer the active tab if it's a prompt selector, otherwise find any prompt selector tab
      const activeTab = this.getActiveTab();
      let tabToReplace: ITabInfo | null = null;

      if (activeTab !== null && activeTab.type === 'prompt-selector') {
        tabToReplace = activeTab;
        logger.info('Replacing active prompt selector tab with chat tab');
      } else {
        // Find any prompt selector tab to replace
        const promptSelectorTab = this.tabs.find(t => t.type === 'prompt-selector');
        if (promptSelectorTab) {
          tabToReplace = promptSelectorTab;
          logger.info('Replacing prompt selector tab with chat tab');
        }
      }

      // Create a new chat tab (or replace existing prompt selector tab)
      const tab = tabToReplace === null
        ? this.createNewChatTab()
        : this.replacePromptSelectorTabWithChat(tabToReplace.tabId);

      // Set up the chat service to handle the prompt
      // Note: The main process (handlePromptSelect) already sends the message to the LLM
      // and will send OLLAMA_RESPONSE event. We should NOT call sendMessage here to avoid duplicates.
      // Instead, we just set the chatId and load messages - the OLLAMA_RESPONSE listener will handle the response.
      if (data.prompt && tab.chatService) {
        // Set chatId if provided
        if (data.chatId !== undefined) {
          tab.chatId = data.chatId;
          // Load messages for this chat (the main process already saved them)
          void tab.chatService.loadChatMessages(data.chatId);
        }

        this.switchToTab(tab.tabId);
      }
    };

    const handleChatDeleted = (data: { chatId: number }) => {
      logger.info('MultiChatService received CHAT_DELETED: chatId=%s', String(data.chatId));

      // Find and close the tab with this chatId
      const tabToClose = this.tabs.find(t => t.chatId === data.chatId);
      if (tabToClose) {
        this.closeChatTab(tabToClose.tabId);
      }
    };

    const handlePromptSelectorData = (data: IPromptSelectorData) => {
      const selectedTextStatus = data.selectedText === '' ? 'empty' : 'present';
      const promptsCount = String(data.preconfiguredPrompts.length);
      logger.info('MultiChatService received PROMPT_SELECTOR_DATA: selectedText=%s, promptsCount=%s', selectedTextStatus, promptsCount);

      // Find existing prompt selector tab
      let existingPromptSelectorTab = this.tabs.find(t => t.type === 'prompt-selector');

      if (!existingPromptSelectorTab && this.promptSelectorService) {
        // Create a new prompt selector tab if one doesn't exist
        existingPromptSelectorTab = this.createPromptSelectorTab(this.promptSelectorService);
      }

      // Manually forward the data to the service to ensure it receives it
      // This handles the case where the IPC event might have been missed due to timing
      // or if the listener wasn't set up yet
      if (existingPromptSelectorTab?.promptSelectorService) {
        // Manually update the service state with the received data
        existingPromptSelectorTab.promptSelectorService.setPromptSelectorData(data);
        this.switchToTab(existingPromptSelectorTab.tabId);
      }
    };

    this.chatWindowDataListener = this.ipcAdapter.onChatWindowData(handleChatWindowData);
    this.chatDeletedListener = this.ipcAdapter.onChatDeleted(handleChatDeleted);
    this.promptSelectorDataListener = this.ipcAdapter.onPromptSelectorData(handlePromptSelectorData);
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
  }

  /**
   * Create a new prompt selector tab
   * Note: Listeners are already initialized in MainLayout, so we don't initialize them again here
   */
  public createPromptSelectorTab(promptSelectorService: PromptSelectorService): ITabInfo {
    const tabId = this.generateTabId();

    // Listeners are already initialized in MainLayout
    // The service will receive data via its IPC listener

    const tab: ITabInfo = {
      tabId,
      type: 'prompt-selector',
      chatId: null,
      promptSelectorService,
      title: 'Prompt Selector',
    };

    this.tabs.push(tab);

    // Notify tabs change first so UI knows about the new tab
    this.notifyTabsChange();

    // Always switch to the new tab and notify
    this.switchToTab(tabId);

    return tab;
  }

  /**
   * Create a new chat tab
   * Note: This does NOT remove empty tabs - call removeEmptyTabs() separately if needed
   */
  public createNewChatTab(): ITabInfo {
    const tabId = this.generateTabId();
    const chatService = new ChatService(this.ipcAdapter);

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

    // Load messages for this chat
    const tabChatService = tab.chatService;
    if (tabChatService) {
      void tabChatService.loadChatMessages(chatId).then(() => {
        // Fetch title after loading messages
        void tabChatService.getChatInfo(chatId).then(chatInfo => {
          if (chatInfo) {
            tab.title = chatInfo.title || null;
            this.notifyTabsChange();
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
    logger.info('Closing tab: tabId=%s, total tabs=%s', tabId, String(this.tabs.length));

    const tabIndex = this.tabs.findIndex(t => t.tabId === tabId);
    if (tabIndex === -1) {
      logger.warn('Tab not found for closing: tabId=%s', tabId);

      return;
    }

    const tab = this.tabs[tabIndex];
    const wasActive = this.activeTabId === tabId;
    const isLastTab = this.tabs.length === 1;

    // If this was the last tab, create a new empty chat FIRST to ensure we never have 0 tabs
    // This prevents the window from closing when tabs become empty
    let newTab: ITabInfo | null = null;
    if (isLastTab) {
      logger.info('Last tab detected, creating new tab before removal');
      newTab = this.createNewChatTab();
    }

    // Cleanup services
    if (tab.chatService) {
      tab.chatService.cleanupListeners();
    }
    if (tab.removeTitleChangeCallback) {
      tab.removeTitleChangeCallback();
    }
    if (tab.promptSelectorService) {
      tab.promptSelectorService.cleanupListeners();
    }

    // Remove tab from array AFTER creating new tab (if it was the last one)
    // This ensures we never have 0 tabs, preventing window from closing
    this.tabs.splice(tabIndex, 1);
    logger.info('Tab removed. Remaining tabs: %s', String(this.tabs.length));

    // If this was the last tab, switch to the new tab we created
    if (isLastTab && newTab) {
      this.switchToTab(newTab.tabId);
    } else if (wasActive) {
      // Switch to the previous tab (index - 1), or the first tab if we closed the first one
      const newIndex = Math.max(0, tabIndex - 1);
      logger.info('Switching to tab at index: %s', String(newIndex));
      this.switchToTab(this.tabs[newIndex].tabId);
    } else {
      // Tab was not active and not the last tab - no tab switching needed
    }

    // Always notify of tabs change
    this.notifyTabsChange();
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

    return this.tabs.find(t => t.tabId === this.activeTabId) || null;
  }

  /**
   * Get all tabs
   */
  public getAllTabs(): readonly ITabInfo[] {
    return this.tabs;
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
  }

  /**
   * Replace a prompt selector tab with a chat tab
   */
  private replacePromptSelectorTabWithChat(promptSelectorTabId: string): ITabInfo {
    const tabIndex = this.tabs.findIndex(t => t.tabId === promptSelectorTabId);
    if (tabIndex === -1) {
      // Tab not found, just create a new chat tab
      return this.createNewChatTab();
    }

    const oldTab = this.tabs[tabIndex];

    // Cleanup the prompt selector service
    if (oldTab.promptSelectorService) {
      oldTab.promptSelectorService.cleanupListeners();
    }

    // Create new chat service
    const chatService = new ChatService(this.ipcAdapter);
    chatService.initializeListeners();

    // Listen to title changes to update tab title
    const handleTitleChange = (title: string) => {
      const foundTab = this.tabs.find(t => t.tabId === promptSelectorTabId);
      if (foundTab?.chatService) {
        const serviceChatId = foundTab.chatService.getCurrentChatId();
        // Only update title if tab's chatId matches service's currentChatId, or if both are null (new chat)
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

    // Replace the tab in place
    const newTab: ITabInfo = {
      tabId: promptSelectorTabId, // Keep the same tab ID
      type: 'chat',
      chatId: null,
      chatService,
      title: null,
      removeTitleChangeCallback,
    };

    this.tabs[tabIndex] = newTab;

    // Notify tabs change
    this.notifyTabsChange();

    // If this was the active tab, notify active tab change to trigger UI re-render
    // The key change (including type in MainLayout) will cause React to remount the component
    if (this.activeTabId === promptSelectorTabId) {
      this.notifyActiveTabChange();
    }

    return newTab;
  }

  /**
   * Check if a tab is empty (new chat with no messages)
   */
  private isTabEmpty(tab: ITabInfo): boolean {
    if (tab.type !== 'chat' || !tab.chatService) {
      return false; // Prompt selector tabs are never considered empty
    }

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

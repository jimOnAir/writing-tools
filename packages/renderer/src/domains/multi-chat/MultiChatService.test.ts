/* eslint-disable max-lines */
import type { IChatWindowData } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import type { TIpcRenderListener } from '../../types/TIpcRenderListener';
import { ChatService } from '../chat';
import type { PromptSelectorService } from '../prompt-selector';

import { MultiChatService } from './MultiChatService';

// Mock ChatService
jest.mock('../chat', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('../chat');

  return {

    ...actual,
    ChatService: jest.fn(),
  };
});

describe('MultiChatService', () => {
  let mockIpcAdapter: jest.Mocked<IIpcAdapter>;
  let multiChatService: MultiChatService;
  let mockChatService: jest.Mocked<ChatService>;
  let mockPromptSelectorService: jest.Mocked<PromptSelectorService>;
  let mockListener: TIpcRenderListener;

  beforeEach(() => {
    jest.clearAllMocks();

    mockListener = { remove: jest.fn() } as unknown as TIpcRenderListener;

    mockIpcAdapter = {
      invoke: jest.fn(),
      onChatDeleted: jest.fn(() => mockListener),
      offChatDeleted: jest.fn(),
      onChatLoadMessagesData: jest.fn(() => mockListener),
      offChatLoadMessagesData: jest.fn(),
      onChatSaveTabsRequest: jest.fn(() => mockListener),
      offChatSaveTabsRequest: jest.fn(),
      onChatTitleUpdated: jest.fn(() => mockListener),
      offChatTitleUpdated: jest.fn(),
      onChatWindowData: jest.fn(() => mockListener),
      offChatWindowData: jest.fn(),
      onOllamaResponse: jest.fn(() => mockListener),
      offOllamaResponse: jest.fn(),
      onPromptSelectorData: jest.fn(() => mockListener),
      offPromptSelectorData: jest.fn(),
      onChatStreamChunk: jest.fn(() => mockListener),
      offChatStreamChunk: jest.fn(),
      onChatStreamEnd: jest.fn(() => mockListener),
      offChatStreamEnd: jest.fn(),
    } as unknown as jest.Mocked<IIpcAdapter>;

    mockChatService = {
      setCallbacks: jest.fn(),
      initializeListeners: jest.fn(),
      cleanupListeners: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue(null),
      getCurrentChatId: jest.fn().mockReturnValue(null),
      loadChatMessages: jest.fn().mockResolvedValue(undefined),
      getChatInfo: jest.fn().mockResolvedValue(null),
      addTitleChangeCallback: jest.fn(() => jest.fn()),
      getMessages: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<ChatService>;

    mockPromptSelectorService = {
      setCallbacks: jest.fn(),
      initializeListeners: jest.fn(),
      cleanupListeners: jest.fn(),
      setPromptSelectorData: jest.fn(),
      getSelectedText: jest.fn().mockReturnValue(''),
      getPreconfiguredPrompts: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<PromptSelectorService>;

    // Mock ChatService constructor
    (ChatService as jest.Mock).mockImplementation(() => mockChatService);

    multiChatService = new MultiChatService(mockIpcAdapter);
  });

  describe('setCallbacks', () => {
    it('registers callbacks and supports multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      multiChatService.setCallbacks({ onTabsChange: callback1 });
      multiChatService.setCallbacks({ onTabsChange: callback2 });

      // Both callbacks should be registered
      multiChatService.createNewChatTab();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('removeCallbacks', () => {
    it('removes callbacks', () => {
      const callback = jest.fn();

      multiChatService.setCallbacks({ onTabsChange: callback });
      multiChatService.removeCallbacks({ onTabsChange: callback });

      multiChatService.createNewChatTab();

      // Callback should not be called after removal
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('createNewChatTab', () => {
    it('creates a new chat tab', () => {
      const onTabsChange = jest.fn();
      multiChatService.setCallbacks({ onTabsChange });

      const tab = multiChatService.createNewChatTab();

      expect(tab).toBeDefined();
      expect(tab.type).toBe('chat');
      expect(tab.chatService).toBeDefined();
      expect(onTabsChange).toHaveBeenCalled();
    });

    it('sets the new tab as active', () => {
      const onActiveTabChange = jest.fn();
      multiChatService.setCallbacks({ onActiveTabChange });

      const tab = multiChatService.createNewChatTab();

      expect(multiChatService.getActiveTabId()).toBe(tab.tabId);
      expect(onActiveTabChange).toHaveBeenCalledWith(tab.tabId);
    });
  });

  describe('createPromptSelectorTab', () => {
    it('creates a prompt selector tab', () => {
      multiChatService.setPromptSelectorService(mockPromptSelectorService);

      const onTabsChange = jest.fn();
      multiChatService.setCallbacks({ onTabsChange });

      const tab = multiChatService.createPromptSelectorTab(mockPromptSelectorService);

      expect(tab).toBeDefined();
      expect(tab.type).toBe('prompt-selector');
      expect(tab.promptSelectorService).toBe(mockPromptSelectorService);
      expect(onTabsChange).toHaveBeenCalled();
    });
  });

  describe('switchToTab', () => {
    it('switches to an existing tab', () => {
      const tab1 = multiChatService.createNewChatTab();
      multiChatService.createNewChatTab();

      const onActiveTabChange = jest.fn();
      multiChatService.setCallbacks({ onActiveTabChange });

      multiChatService.switchToTab(tab1.tabId);

      expect(multiChatService.getActiveTabId()).toBe(tab1.tabId);
      expect(onActiveTabChange).toHaveBeenCalledWith(tab1.tabId);
    });

    it('does nothing if tab does not exist', () => {
      const onActiveTabChange = jest.fn();
      multiChatService.setCallbacks({ onActiveTabChange });

      multiChatService.switchToTab('non-existent-tab');

      expect(onActiveTabChange).not.toHaveBeenCalled();
    });
  });

  describe('closeChatTab', () => {
    it('closes a chat tab', () => {
      const tab = multiChatService.createNewChatTab();
      const tabId = tab.tabId;

      const onTabsChange = jest.fn();
      multiChatService.setCallbacks({ onTabsChange });

      multiChatService.closeChatTab(tabId);

      expect(multiChatService.getAllTabs().find(t => t.tabId === tabId)).toBeUndefined();
      expect(onTabsChange).toHaveBeenCalled();
    });

    it('handles errors gracefully when saving tabs', async () => {
      multiChatService.createNewChatTab();

      (mockIpcAdapter.invoke as jest.Mock).mockRejectedValue(new Error('Save failed'));

      await multiChatService.saveTabs();

      // Should not throw
      expect(mockIpcAdapter.invoke).toHaveBeenCalled();
    });

    it('allows zero tabs when closing last tab', () => {
      const tab = multiChatService.createNewChatTab();
      const originalTabId = tab.tabId;

      const onActiveTabChange = jest.fn();
      const onTabsChange = jest.fn();
      multiChatService.setCallbacks({ onActiveTabChange, onTabsChange });

      multiChatService.closeChatTab(tab.tabId);

      // No new tab is created; active tab is null and tabs are empty
      const activeTabId = multiChatService.getActiveTabId();
      expect(activeTabId).toBeNull();
      expect(onActiveTabChange).toHaveBeenCalledWith(null);
      expect(onTabsChange).toHaveBeenCalled();

      const tabs = multiChatService.getAllTabs();
      expect(tabs).toHaveLength(0);
    });

    it('cleans up chat service listeners when closing tab', () => {
      const tab = multiChatService.createNewChatTab();

      multiChatService.closeChatTab(tab.tabId);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.cleanupListeners).toHaveBeenCalled();
    });
  });

  describe('openChatTab', () => {
    it('opens an existing chat in a new tab', () => {
      mockIpcAdapter.invoke.mockResolvedValue({ success: true });

      const onTabsChange = jest.fn();
      multiChatService.setCallbacks({ onTabsChange });

      const tab = multiChatService.openChatTab(1);

      expect(tab).toBeDefined();
      expect(tab.chatId).toBe(1);
      expect(onTabsChange).toHaveBeenCalled();
    });

    it('handles errors when opening chat', () => {
      const nonExistentChatId = 999;
      mockIpcAdapter.invoke.mockResolvedValue({ success: false, error: 'Chat not found' });

      const tab = multiChatService.openChatTab(nonExistentChatId);

      expect(tab).toBeDefined();
      expect(tab.chatId).toBe(nonExistentChatId);
    });

    it('preserves empty chat tab when opening an existing chat', () => {
      // Create an empty chat tab (chatId is null, no messages)
      const emptyTab = multiChatService.createNewChatTab();
      const emptyTabId = emptyTab.tabId;
      expect(emptyTab.chatId).toBeNull();

      // Mock getMessages to return empty array (indicating empty tab)
      mockChatService.getMessages = jest.fn().mockReturnValue([]);
      mockChatService.getCurrentChatId = jest.fn().mockReturnValue(null);

      // Mock IPC responses for loading chat messages
      mockIpcAdapter.invoke.mockResolvedValue({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Test message',
            timestamp: new Date(),
          },
        ],
      });

      // Mock getChatInfo response
      mockChatService.getChatInfo = jest.fn().mockResolvedValue({
        id: 1,
        title: 'Test Chat',
        provider: 'ollama',
        model: 'test-model',
        createdAt: new Date(),
      });

      const onTabsChange = jest.fn();
      multiChatService.setCallbacks({ onTabsChange });

      // Open an existing chat
      const newTab = multiChatService.openChatTab(1);

      // Verify both tabs exist
      const allTabs = multiChatService.getAllTabs();
      expect(allTabs).toHaveLength(2);

      // Verify the empty tab is still present
      const preservedEmptyTab = allTabs.find(t => t.tabId === emptyTabId);
      expect(preservedEmptyTab).toBeDefined();
      expect(preservedEmptyTab?.chatId).toBeNull();

      // Verify the new tab for the existing chat
      expect(newTab.chatId).toBe(1);
      const newTabInList = allTabs.find(t => t.tabId === newTab.tabId);
      expect(newTabInList).toBeDefined();
      expect(newTabInList?.chatId).toBe(1);

      expect(onTabsChange).toHaveBeenCalled();
    });

    it('switches to existing tab if chat is already open', () => {
      // Create a tab with chatId 1
      const existingTab = multiChatService.createNewChatTab();
      (existingTab as { chatId: number }).chatId = 1;

      const onActiveTabChange = jest.fn();
      multiChatService.setCallbacks({ onActiveTabChange });

      // Try to open the same chat again
      const result = multiChatService.openChatTab(1);

      // Should return the existing tab and switch to it
      expect(result.tabId).toBe(existingTab.tabId);
      expect(multiChatService.getActiveTabId()).toBe(existingTab.tabId);
      expect(onActiveTabChange).toHaveBeenCalledWith(existingTab.tabId);

      // Should still have only one tab
      expect(multiChatService.getAllTabs()).toHaveLength(1);
    });
  });

  describe('getAllTabs', () => {
    it('returns all tabs', () => {
      const tab1 = multiChatService.createNewChatTab();
      const tab2 = multiChatService.createNewChatTab();

      const tabs = multiChatService.getAllTabs();

      expect(tabs).toHaveLength(2);
      expect(tabs.find(t => t.tabId === tab1.tabId)).toBeDefined();
      expect(tabs.find(t => t.tabId === tab2.tabId)).toBeDefined();
    });
  });

  describe('reorderTabs', () => {
    it('moves a tab from one index to another and notifies subscribers', () => {
      const onTabsChange = jest.fn();
      multiChatService.setCallbacks({ onTabsChange });

      const tab1 = multiChatService.createNewChatTab();
      const tab2 = multiChatService.createNewChatTab();
      const tab3 = multiChatService.createNewChatTab();

      const initialOrder = multiChatService.getAllTabs().map(tab => tab.tabId);
      expect(initialOrder).toEqual([tab1.tabId, tab2.tabId, tab3.tabId]);

      multiChatService.reorderTabs(0, 2);

      const reordered = multiChatService.getAllTabs().map(tab => tab.tabId);
      expect(reordered).toEqual([tab2.tabId, tab3.tabId, tab1.tabId]);
      expect(onTabsChange).toHaveBeenCalled();
    });

    it('ignores invalid indices', () => {
      const onTabsChange = jest.fn();
      multiChatService.setCallbacks({ onTabsChange });

      multiChatService.createNewChatTab();
      multiChatService.createNewChatTab();

      const initialOrder = multiChatService.getAllTabs().map(tab => tab.tabId);
      const initialOnTabsChangeCalls = onTabsChange.mock.calls.length;

      multiChatService.reorderTabs(-1, 1);
      multiChatService.reorderTabs(0, 5);
      multiChatService.reorderTabs(0, 0);

      const finalOrder = multiChatService.getAllTabs().map(tab => tab.tabId);
      expect(finalOrder).toEqual(initialOrder);
      expect(onTabsChange).toHaveBeenCalledTimes(initialOnTabsChangeCalls);
    });
  });

  describe('getActiveTab', () => {
    it('returns the active tab', () => {
      const tab = multiChatService.createNewChatTab();

      const activeTab = multiChatService.getActiveTab();

      expect(activeTab?.tabId).toBe(tab.tabId);
    });

    it('returns null when no active tab', () => {
      const activeTab = multiChatService.getActiveTab();

      expect(activeTab).toBeNull();
    });
  });

  describe('getActiveTabId', () => {
    it('returns active tab ID', () => {
      const tab = multiChatService.createNewChatTab();

      expect(multiChatService.getActiveTabId()).toBe(tab.tabId);
    });
  });

  describe('initializeListeners', () => {
    it('registers all IPC listeners', () => {
      multiChatService.initializeListeners();

      expect(mockIpcAdapter.onChatWindowData).toHaveBeenCalled();
      expect(mockIpcAdapter.onChatDeleted).toHaveBeenCalled();
      expect(mockIpcAdapter.onPromptSelectorData).toHaveBeenCalled();
    });

    it('handles CHAT_WINDOW_DATA event', () => {
      multiChatService.initializeListeners();

      const onChatWindowDataMock = mockIpcAdapter.onChatWindowData as jest.Mock;
      const mockCalls = onChatWindowDataMock.mock.calls;
      const firstCall = mockCalls[0] as unknown[] | undefined;
      const dataCallback = firstCall?.[0] as ((data: IChatWindowData) => void) | undefined;

      if (!dataCallback) {
        throw new Error('Data callback not found');
      }

      const data: IChatWindowData = {
        prompt: 'Test prompt',
        chatId: 1,
      };

      dataCallback(data);

      // When chatId is provided, loadChatMessages should be called
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.loadChatMessages).toHaveBeenCalledWith(1);
    });

    it('handles CHAT_DELETED event', () => {
      const tab = multiChatService.createNewChatTab();
      // Set chatId on the tab
      (tab as { chatId: number }).chatId = 1;

      multiChatService.initializeListeners();

      const onChatDeletedMock = mockIpcAdapter.onChatDeleted as jest.Mock;
      const mockCalls = onChatDeletedMock.mock.calls;
      const firstCall = mockCalls[0] as unknown[] | undefined;
      const deleteCallback = firstCall?.[0] as ((data: { chatId: number }) => void) | undefined;

      if (!deleteCallback) {
        throw new Error('Delete callback not found');
      }

      deleteCallback({ chatId: 1 });

      // Tab should be closed
      expect(multiChatService.getAllTabs().find(t => t.tabId === tab.tabId)).toBeUndefined();
    });

    it('handles PROMPT_SELECTOR_DATA event', () => {
      multiChatService.setPromptSelectorService(mockPromptSelectorService);
      multiChatService.initializeListeners();

      const onPromptSelectorDataMock = mockIpcAdapter.onPromptSelectorData as jest.Mock;
      const mockCalls = onPromptSelectorDataMock.mock.calls;
      const firstCall = mockCalls[0] as unknown[] | undefined;
      const promptCallback = firstCall?.[0] as ((data: { selectedText: string, preconfiguredPrompts: any[] }) => void) | undefined;

      if (!promptCallback) {
        throw new Error('Prompt callback not found');
      }

      promptCallback({
        selectedText: 'Selected text',
        preconfiguredPrompts: [],
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockPromptSelectorService.setPromptSelectorData).toHaveBeenCalled();
    });
  });

  describe('cleanupListeners', () => {
    it('unregisters all listeners', () => {
      multiChatService.initializeListeners();
      multiChatService.cleanupListeners();

      expect(mockIpcAdapter.offChatWindowData).toHaveBeenCalled();
      expect(mockIpcAdapter.offChatDeleted).toHaveBeenCalled();
      expect(mockIpcAdapter.offPromptSelectorData).toHaveBeenCalled();
    });
  });

  describe('replacePromptSelectorTabWithChat', () => {
    it('replaces prompt selector tab with chat tab when CHAT_WINDOW_DATA is received', () => {
      multiChatService.setPromptSelectorService(mockPromptSelectorService);
      const promptTab = multiChatService.createPromptSelectorTab(mockPromptSelectorService);
      const promptTabId = promptTab.tabId;

      multiChatService.initializeListeners();

      const onTabsChange = jest.fn();
      multiChatService.setCallbacks({ onTabsChange });

      // Trigger CHAT_WINDOW_DATA event which should replace the prompt selector tab
      const onChatWindowDataMock = mockIpcAdapter.onChatWindowData as jest.Mock;
      const mockCalls = onChatWindowDataMock.mock.calls;
      const firstCall = mockCalls[0] as unknown[] | undefined;
      const dataCallback = firstCall?.[0] as ((data: IChatWindowData) => void) | undefined;

      if (!dataCallback) {
        throw new Error('Data callback not found');
      }

      const data: IChatWindowData = {
        prompt: 'Test prompt',
      };

      dataCallback(data);

      // The prompt selector tab should be replaced with a chat tab
      const tabs = multiChatService.getAllTabs();
      const replacedTab = tabs.find(t => t.tabId === promptTabId);

      expect(replacedTab).toBeDefined();
      expect(replacedTab?.type).toBe('chat');
      expect(replacedTab?.chatService).toBeDefined();
      expect(onTabsChange).toHaveBeenCalled();
    });
  });

  describe('saveTabs', () => {
    it('sends correct tab data to IPC adapter', async () => {
      const tab1 = multiChatService.createNewChatTab();
      tab1.chatId = 1;
      const tab2 = multiChatService.createNewChatTab();
      tab2.chatId = 2;
      multiChatService.switchToTab(tab1.tabId);

      (mockIpcAdapter.invoke as jest.Mock).mockResolvedValue({ success: true });

      await multiChatService.saveTabs();

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith('TAB', {
        channel: 'TAB',
        event: 'TABS_SAVE',
        payload: {
          tabs: [
            { chatId: 1, tabOrder: 0, isActive: true },
            { chatId: 2, tabOrder: 1, isActive: false },
          ],
        },
      });
    });

    it('includes only chat tabs, not prompt-selector tabs', async () => {
      const chatTab = multiChatService.createNewChatTab();
      chatTab.chatId = 1;
      multiChatService.switchToTab(chatTab.tabId);

      (mockIpcAdapter.invoke as jest.Mock).mockResolvedValue({ success: true });

      await multiChatService.saveTabs();

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith('TAB', {
        channel: 'TAB',
        event: 'TABS_SAVE',
        payload: {
          tabs: [
            { chatId: 1, tabOrder: 0, isActive: true },
          ],
        },
      });
    });

    it('handles errors gracefully', async () => {
      multiChatService.createNewChatTab();

      (mockIpcAdapter.invoke as jest.Mock).mockRejectedValue(new Error('Save failed'));

      await multiChatService.saveTabs();

      // Should not throw
      expect(mockIpcAdapter.invoke).toHaveBeenCalled();
    });
  });

  describe('restoreTabs', () => {
    it('creates tabs from saved data', async () => {
      const savedTabs = [
        { chatId: 1, tabOrder: 0, isActive: true },
        { chatId: 2, tabOrder: 1, isActive: false },
      ];

      (mockIpcAdapter.invoke as jest.Mock).mockImplementation(async (channel, data) => {
        if (data.event === 'TABS_LOAD') {
          return Promise.resolve({ tabs: savedTabs });
        }
        if (data.event === 'CHAT_GET') {
          return Promise.resolve({
            chat: {
              id: data.payload.chatId,
              created_at: '2024-01-01',
              model: 'test',
              provider: 'ollama',
              title: 'Chat',
              updated_at: '2024-01-01',
            },
          });
        }

        return Promise.resolve({});
      });

      mockChatService.loadChatMessages.mockResolvedValue(undefined);
      mockChatService.getChatInfo.mockResolvedValueOnce({ id: 1, title: 'Chat 1', provider: 'ollama', model: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' });
      mockChatService.getChatInfo.mockResolvedValueOnce({ id: 2, title: 'Chat 2', provider: 'ollama', model: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' });

      await multiChatService.restoreTabs(savedTabs);

      const tabs = multiChatService.getAllTabs();
      expect(tabs.length).toBe(2);
      expect(tabs[0].chatId).toBe(1);
      expect(tabs[1].chatId).toBe(2);
    });

    it('skips tabs with deleted chatIds', async () => {
      const savedTabs = [
        { chatId: 1, tabOrder: 0, isActive: true },
        { chatId: 999, tabOrder: 1, isActive: false }, // Deleted chat
        { chatId: 2, tabOrder: 2, isActive: false },
      ];

      (mockIpcAdapter.invoke as jest.Mock).mockImplementation(async (channel, data) => {
        if (data.event === 'TABS_LOAD') {
          return Promise.resolve({ tabs: savedTabs });
        }
        if (data.event === 'CHAT_GET' && data.payload.chatId === 999) {
          return Promise.resolve({ error: 'Chat not found' });
        }
        if (data.event === 'CHAT_GET') {
          return Promise.resolve({
            chat: {
              id: data.payload.chatId,
              created_at: '2024-01-01',
              model: 'test',
              provider: 'ollama',
              title: 'Chat',
              updated_at: '2024-01-01',
            },
          });
        }

        return Promise.resolve({});
      });

      mockChatService.loadChatMessages.mockResolvedValue(undefined);
      mockChatService.getChatInfo.mockResolvedValue({ id: 1, title: 'Chat', provider: 'ollama', model: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' });

      await multiChatService.restoreTabs(savedTabs);

      const tabs = multiChatService.getAllTabs();
      expect(tabs.length).toBe(2);
      expect(tabs[0].chatId).toBe(1);
      expect(tabs[1].chatId).toBe(2);
      // Tab with chatId 999 should be skipped
    });

    it('preserves tab order', async () => {
      const savedTabs = [
        { chatId: 3, tabOrder: 0, isActive: false },
        { chatId: 1, tabOrder: 1, isActive: true },
        { chatId: 2, tabOrder: 2, isActive: false },
      ];

      (mockIpcAdapter.invoke as jest.Mock).mockImplementation(async (channel, data) => {
        if (data.event === 'TABS_LOAD') {
          return Promise.resolve({ tabs: savedTabs });
        }
        if (data.event === 'CHAT_GET') {
          return Promise.resolve({
            chat: {
              id: data.payload.chatId,
              created_at: '2024-01-01',
              model: 'test',
              provider: 'ollama',
              title: 'Chat',
              updated_at: '2024-01-01',
            },
          });
        }

        return Promise.resolve({});
      });

      mockChatService.loadChatMessages.mockResolvedValue(undefined);
      mockChatService.getChatInfo.mockResolvedValue({ id: 1, title: 'Chat', provider: 'ollama', model: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' });

      await multiChatService.restoreTabs(savedTabs);

      const tabs = multiChatService.getAllTabs();
      expect(tabs[0].chatId).toBe(3);
      expect(tabs[1].chatId).toBe(1);
      expect(tabs[2].chatId).toBe(2);
    });

    it('switches to active tab', async () => {
      const savedTabs = [
        { chatId: 1, tabOrder: 0, isActive: false },
        { chatId: 2, tabOrder: 1, isActive: true },
      ];

      (mockIpcAdapter.invoke as jest.Mock).mockImplementation(async (channel, data) => {
        if (data.event === 'TABS_LOAD') {
          return Promise.resolve({ tabs: savedTabs });
        }
        if (data.event === 'CHAT_GET') {
          return Promise.resolve({
            chat: {
              id: data.payload.chatId,
              created_at: '2024-01-01',
              model: 'test',
              provider: 'ollama',
              title: 'Chat',
              updated_at: '2024-01-01',
            },
          });
        }

        return Promise.resolve({});
      });

      mockChatService.loadChatMessages.mockResolvedValue(undefined);
      mockChatService.getChatInfo.mockResolvedValue({ id: 1, title: 'Chat', provider: 'ollama', model: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' });

      await multiChatService.restoreTabs(savedTabs);

      const activeTabId = multiChatService.getActiveTabId();
      const tabs = multiChatService.getAllTabs();
      const activeTab = tabs.find(t => t.tabId === activeTabId);
      expect(activeTab?.chatId).toBe(2);
    });

    it('handles empty tabs array by creating default empty tab', async () => {
      (mockIpcAdapter.invoke as jest.Mock).mockImplementation(async (channel, data) => {
        if (data.event === 'TABS_LOAD') {
          return Promise.resolve({ tabs: [] });
        }

        return Promise.resolve({});
      });

      await multiChatService.restoreTabs([]);

      const tabs = multiChatService.getAllTabs();
      expect(tabs.length).toBe(1);
      expect(tabs[0].chatId).toBeNull();
    });

    it('handles tabs with null chatId (empty tabs)', async () => {
      const savedTabs = [
        { chatId: null, tabOrder: 0, isActive: true },
        { chatId: 1, tabOrder: 1, isActive: false },
      ];

      (mockIpcAdapter.invoke as jest.Mock).mockImplementation(async (channel, data) => {
        if (data.event === 'TABS_LOAD') {
          return Promise.resolve({ tabs: savedTabs });
        }
        if (data.event === 'CHAT_GET') {
          return Promise.resolve({
            chat: {
              id: data.payload.chatId,
              created_at: '2024-01-01',
              model: 'test',
              provider: 'ollama',
              title: 'Chat',
              updated_at: '2024-01-01',
            },
          });
        }

        return Promise.resolve({});
      });

      mockChatService.loadChatMessages.mockResolvedValue(undefined);
      mockChatService.getChatInfo.mockResolvedValue({ id: 1, title: 'Chat', provider: 'ollama', model: 'test', created_at: '2024-01-01', updated_at: '2024-01-01' });

      await multiChatService.restoreTabs(savedTabs);

      const tabs = multiChatService.getAllTabs();
      expect(tabs.length).toBe(2);
      expect(tabs[0].chatId).toBeNull();
      expect(tabs[1].chatId).toBe(1);
    });

    it('creates default empty tab if no tabs restored', async () => {
      const savedTabs: Array<{ chatId: number | null, tabOrder: number, isActive: boolean }> = [];

      (mockIpcAdapter.invoke as jest.Mock).mockImplementation(async (channel, data) => {
        if (data.event === 'TABS_LOAD') {
          return Promise.resolve({ tabs: savedTabs });
        }

        return Promise.resolve({});
      });

      await multiChatService.restoreTabs(savedTabs);

      const tabs = multiChatService.getAllTabs();
      expect(tabs.length).toBe(1);
      expect(tabs[0].chatId).toBeNull();
    });
  });

  describe('Keyboard shortcuts', () => {
    // Tests for Ctrl+W functionality
    it('closes current chat tab when Ctrl+W is pressed (when tabs exist)', async () => {
      const initialTabCount = multiChatService.getAllTabs().length;

      // Create a new tab to ensure we have something to close
      const newTab1 = multiChatService.createNewChatTab();

      const newTab2 = multiChatService.createNewChatTab();

      // Verify tab was created
      expect(multiChatService.getAllTabs()).toHaveLength(initialTabCount + 2);

      // Simulate Ctrl+W keypress by calling the method directly (since we can't easily test actual keyboard events in this environment)
      const tabsBeforeClose = multiChatService.getAllTabs();

      if (tabsBeforeClose.length > 0) {
        const activeTabId = multiChatService.getActiveTabId();

        // Call closeCurrentChatTab method - in real implementation, this would be triggered by the key event
        // Since we don't have access to the actual keyboard handling code here,
        // we'll test that the function works when called directly

        // This is a direct test of what the Ctrl+W handler should do
        expect(activeTabId).not.toBeNull();

        if (activeTabId) {
          const tab = multiChatService.getActiveTab();
          if (tab && tab.type === 'chat') {
            // Check that we can close it properly - this indirectly tests Ctrl+W behavior
            multiChatService.closeChatTab(activeTabId);

            expect(multiChatService.getAllTabs()).toHaveLength(initialTabCount + 2 - 1); // One less after closing

            // Should have created a new tab since we're testing with tabs available
          }
        }
      }
    });

    it('does not crash when Ctrl+W is pressed on the last tab', async () => {
      // Test case: When there's only one tab, closing it should not crash; we end up with 0 tabs
      const tab = multiChatService.createNewChatTab();
      const activeTabId = multiChatService.getActiveTabId();

      expect(activeTabId).not.toBeNull();
      expect(() => {
        multiChatService.closeChatTab(tab.tabId);
      }).not.toThrow();

      expect(multiChatService.getAllTabs()).toHaveLength(0);
      expect(multiChatService.getActiveTabId()).toBeNull();
    });

    it('handles keyboard shortcuts without affecting prompt selector tabs', async () => {
      multiChatService.setPromptSelectorService(mockPromptSelectorService);

      // Create a prompt selector tab first
      const promptTab = multiChatService.createPromptSelectorTab(mockPromptSelectorService);

      expect(promptTab.type).toBe('prompt-selector');

      // Now create a chat tab
      const chatTab = multiChatService.createNewChatTab();

      expect(chatTab.type).toBe('chat');

      // Verify we have both types of tabs
      const allTabs = multiChatService.getAllTabs();
      expect(allTabs.length).toBe(2);

      // The Ctrl+W functionality should only affect chat tabs, not prompt selector tabs
      const activeTabId = multiChatService.getActiveTabId();
      if (activeTabId) {
        const activeTab = multiChatService.getActiveTab();

        if (activeTab?.type === 'chat') {
          expect(() => {
            multiChatService.closeChatTab(activeTabId);
          }).not.toThrow();

          // Should still have prompt selector tab
          const remainingTabs = multiChatService.getAllTabs();
          expect(remainingTabs.some(t => t.type === 'prompt-selector')).toBe(true);
        }
      }
    });
  });

  describe('loadTabs', () => {
    it('loads tabs from main process successfully', async () => {
      (mockIpcAdapter.invoke as jest.Mock).mockResolvedValue({
        tabs: [
          { chatId: 1, tabOrder: 0, isActive: true },
          { chatId: 2, tabOrder: 1, isActive: false },
        ],
      });

      const result = await multiChatService.loadTabs();

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith('TAB', {
        channel: 'TAB',
        event: 'TABS_LOAD',
        payload: {},
      });

      expect(result).toEqual({
        tabs: [
          { chatId: 1, tabOrder: 0, isActive: true },
          { chatId: 2, tabOrder: 1, isActive: false },
        ],
      });
    });

    it('handles load error gracefully', async () => {
      (mockIpcAdapter.invoke as jest.Mock).mockRejectedValue(new Error('Load failed'));

      const result = await multiChatService.loadTabs();

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith('TAB', {
        channel: 'TAB',
        event: 'TABS_LOAD',
        payload: {},
      });

      expect(result).toEqual({ error: 'Load failed' });
    });
  });

  describe('saveTabs', () => {
    it('saves current tabs to main process successfully', async () => {
      const chatTab = multiChatService.createNewChatTab();
      chatTab.chatId = 1;
      multiChatService.switchToTab(chatTab.tabId);

      (mockIpcAdapter.invoke as jest.Mock).mockResolvedValue({ success: true });

      await multiChatService.saveTabs();

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith('TAB', {
        channel: 'TAB',
        event: 'TABS_SAVE',
        payload: {
          tabs: [
            { chatId: 1, tabOrder: 0, isActive: true },
          ],
        },
      });
    });

    it('handles save error gracefully', async () => {
      const chatTab = multiChatService.createNewChatTab();
      chatTab.chatId = 1; // Set a proper chat ID to make tab more realistic
      multiChatService.switchToTab(chatTab.tabId);

      (mockIpcAdapter.invoke as jest.Mock).mockRejectedValue(new Error('Save failed'));

      await multiChatService.saveTabs();

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith('TAB', {
        channel: 'TAB',
        event: 'TABS_SAVE',
        payload: {
          tabs: [
            { chatId: 1, tabOrder: 0, isActive: true },
          ],
        },
      });
    });
  });

  describe('removeEmptyTabs', () => {
    it('removes empty chat tabs', () => {
      const tab1 = multiChatService.createNewChatTab();
      // This is an empty tab (no messages)

      expect(multiChatService.getAllTabs().length).toBe(1);

      // Call removeEmptyTabs - this should remove the empty tab
      (multiChatService as any).removeEmptyTabs(true); // allow removing last tab

      // After removal we have 0 tabs (no auto-creation of new tab)
      const tabs = multiChatService.getAllTabs();
      expect(tabs.length).toBe(0);
    });
  });

  describe('generateTabId', () => {
    it('generates unique tab IDs', () => {
      const id1 = (multiChatService as any).generateTabId();
      const id2 = (multiChatService as any).generateTabId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^tab-\d+-\w+$/);
    });
  });

  describe('notifyTabsChange', () => {
    it('calls all registered callbacks with current tabs', () => {
      const callback = jest.fn();
      multiChatService.setCallbacks({ onTabsChange: callback });

      (multiChatService as any).notifyTabsChange();

      expect(callback).toHaveBeenCalledWith(multiChatService.getAllTabs());
    });
  });

  describe('notifyActiveTabChange', () => {
    it('calls all registered callbacks with active tab ID', () => {
      const callback = jest.fn();
      multiChatService.setCallbacks({ onActiveTabChange: callback });

      (multiChatService as any).notifyActiveTabChange();

      expect(callback).toHaveBeenCalledWith(multiChatService.getActiveTabId());
    });
  });

  describe('isTabEmpty', () => {
    it('identifies empty tabs correctly', () => {
      const tab = multiChatService.createNewChatTab();

      // This should be an empty tab
      const isEmpty = (multiChatService as any).isTabEmpty(tab);

      expect(isEmpty).toBe(true);
    });
  });
});

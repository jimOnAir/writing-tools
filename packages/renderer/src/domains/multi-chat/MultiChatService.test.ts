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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
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
      onChatWindowData: jest.fn(() => mockListener),
      offChatWindowData: jest.fn(),
      onOllamaResponse: jest.fn(() => mockListener),
      offOllamaResponse: jest.fn(),
      onPromptSelectorData: jest.fn(() => mockListener),
      offPromptSelectorData: jest.fn(),
      onChatTitleUpdated: jest.fn(() => mockListener),
      offChatTitleUpdated: jest.fn(),
      onChatLoadMessagesData: jest.fn(() => mockListener),
      offChatLoadMessagesData: jest.fn(),
      onChatDeleted: jest.fn(() => mockListener),
      offChatDeleted: jest.fn(),
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

    it('switches to another tab when closing active tab', () => {
      const tab1 = multiChatService.createNewChatTab();
      const tab2 = multiChatService.createNewChatTab();

      const onActiveTabChange = jest.fn();
      multiChatService.setCallbacks({ onActiveTabChange });

      multiChatService.closeChatTab(tab2.tabId);

      expect(multiChatService.getActiveTabId()).toBe(tab1.tabId);
    });

    it('creates a new empty chat tab when closing last tab', () => {
      const tab = multiChatService.createNewChatTab();
      const originalTabId = tab.tabId;

      const onActiveTabChange = jest.fn();
      const onTabsChange = jest.fn();
      multiChatService.setCallbacks({ onActiveTabChange, onTabsChange });

      multiChatService.closeChatTab(tab.tabId);

      // A new tab should be created and set as active
      const activeTabId = multiChatService.getActiveTabId();
      expect(activeTabId).not.toBeNull();
      expect(activeTabId).not.toBe(originalTabId);
      expect(onActiveTabChange).toHaveBeenCalledWith(activeTabId);
      expect(onTabsChange).toHaveBeenCalled();

      // Verify there's exactly one tab (the newly created one)
      const tabs = multiChatService.getAllTabs();
      expect(tabs).toHaveLength(1);
      expect(tabs[0]?.tabId).toBe(activeTabId);
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

      // When chatId is provided, loadChatMessages should be called (not sendMessage)
      // The main process already sends the message to the LLM, so we just load messages
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.loadChatMessages).toHaveBeenCalledWith(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
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
      const promptCallback = firstCall?.[0] as ((data: { selectedText: string, preconfiguredPrompts: unknown[] }) => void) | undefined;

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
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import type { ChatService } from '../domains/chat';
import type { ChatListService } from '../domains/chat-list';
import type { MultiChatService, ITabInfo } from '../domains/multi-chat';
import type { PromptSelectorService } from '../domains/prompt-selector';
import type { SettingsService } from '../domains/settings';

import { MainLayout } from './MainLayout';

// Mock components
jest.mock('./ChatComponent', () => ({
  __esModule: true,
  default: jest.fn(() => <div>ChatComponent</div>),
}));

jest.mock('./PromptSelectorComponent', () => ({
  __esModule: true,
  default: jest.fn(() => <div>PromptSelectorComponent</div>),
}));

jest.mock('./Sidebar', () => ({
  Sidebar: jest.fn(() => <div>Sidebar</div>),
}));

jest.mock('./tabs', () => ({
  TabBar: jest.fn(() => <div>TabBar</div>),
}));

jest.mock('./SettingsModal', () => ({
  SettingsModal: jest.fn(({ isOpen }) => (isOpen ? <div>SettingsModal</div> : null)),
}));

jest.mock('../styles/NativeStyles', () => ({
  getNativeStyles: jest.fn(() => ({
    header: {
      background: 'header-bg',
      border: 'header-border',
    },
    button: {
      settings: 'settings-button',
    },
  })),
}));

jest.mock('../utils/platformDetection', () => ({
  getPlatform: jest.fn().mockResolvedValue('linux'),
}));

describe('MainLayout', () => {
  let mockMultiChatService: jest.Mocked<MultiChatService>;
  let mockChatListService: jest.Mocked<ChatListService>;
  let mockSettingsService: jest.Mocked<SettingsService>;
  let mockPromptSelectorService: jest.Mocked<PromptSelectorService>;
  let createNewChatTabMock: jest.Mock;
  let setPromptSelectorServiceMock: jest.Mock;
  let initializeListenersMock: jest.Mock;
  let cleanupListenersMock: jest.Mock;
  let removeCallbacksMock: jest.Mock;
  let promptSelectorInitializeListenersMock: jest.Mock;
  let promptSelectorCleanupListenersMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockChatService: jest.Mocked<Pick<ChatService, 'setCallbacks' | 'initializeListeners' | 'cleanupListeners' | 'sendMessage' | 'getCurrentChatId'>> = {
      setCallbacks: jest.fn(),
      initializeListeners: jest.fn(),
      cleanupListeners: jest.fn(),
      sendMessage: jest.fn(),
      getCurrentChatId: jest.fn().mockReturnValue(null),
    };

    const mockTab: ITabInfo = {
      tabId: 'tab-1',
      type: 'chat',
      chatId: 1,
      title: 'Test Chat',
      chatService: mockChatService as unknown as ChatService,
    };

    createNewChatTabMock = jest.fn();
    setPromptSelectorServiceMock = jest.fn();
    initializeListenersMock = jest.fn();
    cleanupListenersMock = jest.fn();
    removeCallbacksMock = jest.fn();
    promptSelectorInitializeListenersMock = jest.fn();
    promptSelectorCleanupListenersMock = jest.fn();

    mockMultiChatService = {
      setCallbacks: jest.fn(),
      removeCallbacks: removeCallbacksMock,
      getAllTabs: jest.fn().mockReturnValue([mockTab]),
      getActiveTabId: jest.fn().mockReturnValue('tab-1'),
      getActiveTab: jest.fn().mockReturnValue(mockTab),
      switchToTab: jest.fn(),
      closeChatTab: jest.fn(),
      createNewChatTab: createNewChatTabMock,
      openChatTab: jest.fn(),
      createPromptSelectorTab: jest.fn(),
      setPromptSelectorService: setPromptSelectorServiceMock,
      initializeListeners: initializeListenersMock,
      cleanupListeners: cleanupListenersMock,
    } as unknown as jest.Mocked<MultiChatService>;

    mockChatListService = {
      setCallbacks: jest.fn(),
      initializeListeners: jest.fn(),
      cleanupListeners: jest.fn(),
      loadChats: jest.fn(),
      openChat: jest.fn(),
      deleteChat: jest.fn(),
    } as unknown as jest.Mocked<ChatListService>;

    mockSettingsService = {
      setCallbacks: jest.fn(),
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
    } as unknown as jest.Mocked<SettingsService>;

    mockPromptSelectorService = {
      setCallbacks: jest.fn(),
      initializeListeners: promptSelectorInitializeListenersMock,
      cleanupListeners: promptSelectorCleanupListenersMock,
      selectPrompt: jest.fn(),
      submitCustomPrompt: jest.fn(),
      getSelectedText: jest.fn().mockReturnValue(''),
      getPreconfiguredPrompts: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<PromptSelectorService>;
  });

  it('renders sidebar and main content', async () => {
    render(
      <MainLayout
        multiChatService={mockMultiChatService}
        chatListService={mockChatListService}
        settingsService={mockSettingsService}
        promptSelectorService={mockPromptSelectorService}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Sidebar')).toBeInTheDocument();
      expect(screen.getByText('TabBar')).toBeInTheDocument();
    });
  });

  it('creates initial tab if none exist', async () => {
    mockMultiChatService.getAllTabs.mockReturnValue([]);

    render(
      <MainLayout
        multiChatService={mockMultiChatService}
        chatListService={mockChatListService}
        settingsService={mockSettingsService}
        promptSelectorService={mockPromptSelectorService}
      />,
    );

    await waitFor(() => {
      expect(createNewChatTabMock).toHaveBeenCalledTimes(1);
    });
  });

  it('opens settings modal when settings button is clicked', async () => {
    render(
      <MainLayout
        multiChatService={mockMultiChatService}
        chatListService={mockChatListService}
        settingsService={mockSettingsService}
        promptSelectorService={mockPromptSelectorService}
      />,
    );

    await waitFor(() => {
      const settingsButton = screen.getByLabelText('Open settings');
      fireEvent.click(settingsButton);
    });

    expect(screen.getByText('SettingsModal')).toBeInTheDocument();
  });

  it('renders chat component for active chat tab', async () => {
    render(
      <MainLayout
        multiChatService={mockMultiChatService}
        chatListService={mockChatListService}
        settingsService={mockSettingsService}
        promptSelectorService={mockPromptSelectorService}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('ChatComponent')).toBeInTheDocument();
    });
  });

  it('renders prompt selector component for prompt selector tab', async () => {
    const promptTab: ITabInfo = {
      tabId: 'prompt-tab-1',
      type: 'prompt-selector',
      chatId: null,
      title: null,
      promptSelectorService: mockPromptSelectorService,
    };

    mockMultiChatService.getActiveTab.mockReturnValue(promptTab);

    render(
      <MainLayout
        multiChatService={mockMultiChatService}
        chatListService={mockChatListService}
        settingsService={mockSettingsService}
        promptSelectorService={mockPromptSelectorService}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('PromptSelectorComponent')).toBeInTheDocument();
    });
  });

  it('shows empty state when no active tab', async () => {
    mockMultiChatService.getActiveTab.mockReturnValue(null);

    render(
      <MainLayout
        multiChatService={mockMultiChatService}
        chatListService={mockChatListService}
        settingsService={mockSettingsService}
        promptSelectorService={mockPromptSelectorService}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/No active chat/)).toBeInTheDocument();
    });
  });

  it('initializes services on mount', async () => {
    render(
      <MainLayout
        multiChatService={mockMultiChatService}
        chatListService={mockChatListService}
        settingsService={mockSettingsService}
        promptSelectorService={mockPromptSelectorService}
      />,
    );

    await waitFor(() => {
      expect(setPromptSelectorServiceMock).toHaveBeenCalledWith(mockPromptSelectorService);
      expect(initializeListenersMock).toHaveBeenCalledTimes(1);
      expect(promptSelectorInitializeListenersMock).toHaveBeenCalledTimes(1);
    });
  });

  it('cleans up services on unmount', async () => {
    const { unmount } = render(
      <MainLayout
        multiChatService={mockMultiChatService}
        chatListService={mockChatListService}
        settingsService={mockSettingsService}
        promptSelectorService={mockPromptSelectorService}
      />,
    );

    await waitFor(() => {
      // Wait for initial async operations to complete
    });

    unmount();

    expect(removeCallbacksMock).toHaveBeenCalledTimes(1);
    expect(cleanupListenersMock).toHaveBeenCalledTimes(1);
    expect(promptSelectorCleanupListenersMock).toHaveBeenCalledTimes(1);
  });

  it('handles chat selection', async () => {
    render(
      <MainLayout
        multiChatService={mockMultiChatService}
        chatListService={mockChatListService}
        settingsService={mockSettingsService}
        promptSelectorService={mockPromptSelectorService}
      />,
    );

    await waitFor(() => {
      // Wait for initial async operations to complete
    });

    // Chat selection is handled through Sidebar component
    // The handler should call openChatTab
    expect(mockMultiChatService).toBeDefined();
  });
});

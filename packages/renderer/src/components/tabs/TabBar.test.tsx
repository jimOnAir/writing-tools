import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import type { MultiChatService, ITabInfo } from '../../domains/multi-chat';

import { TabBar } from './TabBar';

// Mock getNativeStyles and getPlatform
jest.mock('../../styles/NativeStyles', () => ({
  getNativeStyles: jest.fn(() => ({
    tabs: {
      container: 'tabs-container',
      tab: {
        base: 'tab-base',
        active: 'tab-active',
        inactive: 'tab-inactive',
        closeButton: 'close-button',
      },
    },
  })),
}));

jest.mock('../../utils/platformDetection', () => ({
  getPlatform: jest.fn().mockResolvedValue('linux'),
}));

describe('TabBar', () => {
  let mockMultiChatService: jest.Mocked<MultiChatService>;
  let mockSetCallbacks: jest.Mock;
  let mockRemoveCallbacks: jest.Mock;
  let mockSwitchToTab: jest.Mock;
  let mockCloseChatTab: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSetCallbacks = jest.fn();
    mockRemoveCallbacks = jest.fn();
    mockSwitchToTab = jest.fn();
    mockCloseChatTab = jest.fn();

    mockMultiChatService = {
      setCallbacks: mockSetCallbacks,
      removeCallbacks: mockRemoveCallbacks,
      getAllTabs: jest.fn().mockReturnValue([]),
      getActiveTabId: jest.fn().mockReturnValue(null),
      switchToTab: mockSwitchToTab,
      closeChatTab: mockCloseChatTab,
      createNewChatTab: jest.fn(),
      openChatTab: jest.fn(),
      createPromptSelectorTab: jest.fn(),
      getActiveTab: jest.fn().mockReturnValue(null),
    } as unknown as jest.Mocked<MultiChatService>;
  });

  it('renders empty state when no tabs', async () => {
    render(<TabBar multiChatService={mockMultiChatService} />);

    await waitFor(() => {
      expect(mockSetCallbacks).toHaveBeenCalled();
    });
  });

  it('renders multiple tabs', async () => {
    const mockTabs: ITabInfo[] = [
      {
        tabId: 'tab-1',
        type: 'chat',
        chatId: 1,
        title: 'Chat 1',
      },
      {
        tabId: 'tab-2',
        type: 'chat',
        chatId: 2,
        title: 'Chat 2',
      },
    ];

    mockMultiChatService.getAllTabs.mockReturnValue(mockTabs);

    render(<TabBar multiChatService={mockMultiChatService} />);

    await waitFor(() => {
      expect(screen.getByText('Chat 1')).toBeInTheDocument();
      expect(screen.getByText('Chat 2')).toBeInTheDocument();
    });
  });

  it('highlights active tab', async () => {
    const mockTabs: ITabInfo[] = [
      {
        tabId: 'tab-1',
        type: 'chat',
        chatId: 1,
        title: 'Chat 1',
      },
    ];

    mockMultiChatService.getAllTabs.mockReturnValue(mockTabs);
    mockMultiChatService.getActiveTabId.mockReturnValue('tab-1');

    render(<TabBar multiChatService={mockMultiChatService} />);

    await waitFor(() => {
      // Active tab should be rendered (styling is tested in Tab component)
      expect(screen.getByText('Chat 1')).toBeInTheDocument();
    });
  });

  it('calls switchToTab when tab is selected', async () => {
    const mockTabs: ITabInfo[] = [
      {
        tabId: 'tab-1',
        type: 'chat',
        chatId: 1,
        title: 'Chat 1',
      },
    ];

    mockMultiChatService.getAllTabs.mockReturnValue(mockTabs);

    render(<TabBar multiChatService={mockMultiChatService} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Switch to tab: Chat 1')).toBeInTheDocument();
    });

    const tabButton = screen.getByLabelText('Switch to tab: Chat 1');
    fireEvent.click(tabButton);

    expect(mockSwitchToTab).toHaveBeenCalledWith('tab-1');
  });

  it('calls closeChatTab when close button is clicked', async () => {
    const mockTabs: ITabInfo[] = [
      {
        tabId: 'tab-1',
        type: 'chat',
        chatId: 1,
        title: 'Chat 1',
      },
    ];

    mockMultiChatService.getAllTabs.mockReturnValue(mockTabs);

    render(<TabBar multiChatService={mockMultiChatService} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Close tab')).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText('Close tab');
    fireEvent.click(closeButton);

    expect(mockCloseChatTab).toHaveBeenCalledWith('tab-1');
  });

  it('removes callbacks on unmount', async () => {
    const { unmount } = render(<TabBar multiChatService={mockMultiChatService} />);

    await waitFor(() => {
      expect(mockSetCallbacks).toHaveBeenCalled();
    });

    unmount();

    expect(mockRemoveCallbacks).toHaveBeenCalled();
  });

  it('updates tabs when callbacks are triggered', async () => {
    let onTabsChangeCallback: ((tabs: ITabInfo[]) => void) | undefined;

    mockSetCallbacks.mockImplementation((callbacks: {
      onTabsChange?: (tabs: ITabInfo[]) => void,
      onActiveTabChange?: (tabId: string | null) => void,
    }) => {
      onTabsChangeCallback = callbacks.onTabsChange;
    });

    render(<TabBar multiChatService={mockMultiChatService} />);

    const newTabs: ITabInfo[] = [
      {
        tabId: 'tab-1',
        type: 'chat',
        chatId: 1,
        title: 'New Chat',
      },
    ];

    const callback = onTabsChangeCallback;
    if (callback !== undefined) {
      act(() => {
        callback(newTabs);
      });
    }

    await waitFor(() => {
      expect(screen.getByText('New Chat')).toBeInTheDocument();
    });
  });
});

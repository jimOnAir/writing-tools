import { createEvent } from '@testing-library/dom';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import type { ChatService } from '../../domains/chat';
import type { ITabInfo, MultiChatService } from '../../domains/multi-chat';

import { TabBar } from './TabBar';

const mockChatServiceForTab = {} as unknown as ChatService;

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
  let mockReorderTabs: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSetCallbacks = jest.fn();
    mockRemoveCallbacks = jest.fn();
    mockSwitchToTab = jest.fn();
    mockCloseChatTab = jest.fn();
    mockReorderTabs = jest.fn();

    mockMultiChatService = {
      closeChatTab: mockCloseChatTab,
      createNewChatTab: jest.fn(),
      getAllTabs: jest.fn().mockReturnValue([]),
      getActiveTab: jest.fn().mockReturnValue(null),
      getActiveTabId: jest.fn().mockReturnValue(null),
      openChatTab: jest.fn(),
      removeCallbacks: mockRemoveCallbacks,
      reorderTabs: mockReorderTabs,
      setCallbacks: mockSetCallbacks,
      switchToTab: mockSwitchToTab,
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
        chatId: 1,
        chatService: mockChatServiceForTab,
        tabId: 'tab-1',
        title: 'Chat 1',
        type: 'chat',
      },
      {
        chatId: 2,
        chatService: mockChatServiceForTab,
        tabId: 'tab-2',
        title: 'Chat 2',
        type: 'chat',
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
        chatId: 1,
        chatService: mockChatServiceForTab,
        tabId: 'tab-1',
        title: 'Chat 1',
        type: 'chat',
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
        chatId: 1,
        chatService: mockChatServiceForTab,
        tabId: 'tab-1',
        title: 'Chat 1',
        type: 'chat',
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
        chatId: 1,
        chatService: mockChatServiceForTab,
        tabId: 'tab-1',
        title: 'Chat 1',
        type: 'chat',
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
        chatId: 1,
        chatService: mockChatServiceForTab,
        tabId: 'tab-1',
        title: 'New Chat',
        type: 'chat',
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

  it('reorders tabs on drag and drop', async () => {
    const mockTabs: ITabInfo[] = [
      {
        chatId: 1,
        chatService: mockChatServiceForTab,
        tabId: 'tab-1',
        title: 'Chat 1',
        type: 'chat',
      },
      {
        chatId: 2,
        chatService: mockChatServiceForTab,
        tabId: 'tab-2',
        title: 'Chat 2',
        type: 'chat',
      },
    ];

    mockMultiChatService.getAllTabs.mockReturnValue(mockTabs);

    render(<TabBar multiChatService={mockMultiChatService} />);

    await waitFor(() => {
      expect(screen.getByText('Chat 1')).toBeInTheDocument();
      expect(screen.getByText('Chat 2')).toBeInTheDocument();
    });

    const tabButtons = screen.getAllByRole('button', { name: /Switch to tab:/i });
    const firstTabButton = tabButtons[0];
    const secondTabButton = tabButtons[1];

    // Create mock dataTransfer object for drag events
    const data: Record<string, string> = {};
    const mockDataTransfer = {
      effectAllowed: 'move' as const,
      dropEffect: 'move' as const,
      data,
      setData: jest.fn((format: string, dataValue: string): void => {
        data[format] = dataValue;
      }),
      getData: jest.fn((format: string): string => {
        return data[format] || '';
      }),
      setDragImage: jest.fn(),
      clearData: jest.fn(),
      files: [],
      items: [],
      types: [],
    };

    // Create drag events with dataTransfer attached
    const dragStartEvent = createEvent.dragStart(firstTabButton);
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: mockDataTransfer,
      writable: true,
    });
    fireEvent(firstTabButton, dragStartEvent);

    const dragOverEvent = createEvent.dragOver(secondTabButton);
    Object.defineProperty(dragOverEvent, 'dataTransfer', {
      value: mockDataTransfer,
      writable: true,
    });
    Object.defineProperty(dragOverEvent, 'preventDefault', {
      value: jest.fn(),
      writable: true,
    });
    fireEvent(secondTabButton, dragOverEvent);

    const dropEvent = createEvent.drop(secondTabButton);
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: mockDataTransfer,
      writable: true,
    });
    Object.defineProperty(dropEvent, 'preventDefault', {
      value: jest.fn(),
      writable: true,
    });
    fireEvent(secondTabButton, dropEvent);

    const dragEndEvent = createEvent.dragEnd(firstTabButton);
    Object.defineProperty(dragEndEvent, 'dataTransfer', {
      value: mockDataTransfer,
      writable: true,
    });
    fireEvent(firstTabButton, dragEndEvent);

    expect(mockReorderTabs).toHaveBeenCalledWith(0, 1);
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import type { ChatListService } from '../domains/chat-list';

import { Sidebar } from './Sidebar';

// Mock getNativeStyles and getPlatform
jest.mock('../styles/NativeStyles', () => ({
  getNativeStyles: jest.fn(() => ({
    sidebar: {
      background: 'sidebar-bg',
      border: 'sidebar-border',
      width: {
        expanded: 'w-64',
        collapsed: 'w-16',
      },
    },
    tabs: {
      newChatButton: 'new-chat-button',
    },
  })),
}));

jest.mock('../utils/platformDetection', () => ({
  getPlatform: jest.fn().mockResolvedValue('linux'),
}));

// Mock ChatListComponent
jest.mock('./ChatListComponent', () => ({
  __esModule: true,
  default: jest.fn(() => <div>ChatListComponent</div>),
}));

describe('Sidebar', () => {
  let mockChatListService: jest.Mocked<ChatListService>;
  let onChatSelect: jest.Mock;
  let onCreateNewTab: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChatListService = {
      setCallbacks: jest.fn(),
      loadChats: jest.fn(),
      openChat: jest.fn(),
      deleteChat: jest.fn(),
    } as unknown as jest.Mocked<ChatListService>;

    onChatSelect = jest.fn();
    onCreateNewTab = jest.fn();
  });

  it('renders sidebar in expanded state by default', async () => {
    render(
      <Sidebar
        chatListService={mockChatListService}
        onChatSelect={onChatSelect}
        onCreateNewTab={onCreateNewTab}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Chats')).toBeInTheDocument();
    });

    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('toggles sidebar when toggle button is clicked', async () => {
    render(
      <Sidebar
        chatListService={mockChatListService}
        onChatSelect={onChatSelect}
        onCreateNewTab={onCreateNewTab}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Collapse sidebar');
    fireEvent.click(toggleButton);

    expect(screen.queryByText('Chats')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('calls onCreateNewTab when "New Chat" button is clicked', async () => {
    render(
      <Sidebar
        chatListService={mockChatListService}
        onChatSelect={onChatSelect}
        onCreateNewTab={onCreateNewTab}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('New Chat')).toBeInTheDocument();
    });

    const newChatButton = screen.getByLabelText('New Chat');
    fireEvent.click(newChatButton);

    expect(onCreateNewTab).toHaveBeenCalledTimes(1);
  });

  it('hides content when collapsed', async () => {
    render(
      <Sidebar
        chatListService={mockChatListService}
        onChatSelect={onChatSelect}
        onCreateNewTab={onCreateNewTab}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Collapse sidebar');
    fireEvent.click(toggleButton);

    expect(screen.queryByText('ChatListComponent')).not.toBeInTheDocument();
  });

  it('shows content when expanded', async () => {
    render(
      <Sidebar
        chatListService={mockChatListService}
        onChatSelect={onChatSelect}
        onCreateNewTab={onCreateNewTab}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('ChatListComponent')).toBeInTheDocument();
    });
  });

  it('has correct accessibility labels', async () => {
    render(
      <Sidebar
        chatListService={mockChatListService}
        onChatSelect={onChatSelect}
        onCreateNewTab={onCreateNewTab}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('New Chat')).toBeInTheDocument();
  });
});

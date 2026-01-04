import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { IChatInfo } from '@writing-tools/shared';
import React from 'react';

import type { ChatListService } from '../domains/chat-list';

import ChatListComponent from './ChatListComponent';

// Mock globalThis.confirm
globalThis.confirm = jest.fn();

describe('ChatListComponent', () => {
  let mockChatListService: jest.Mocked<ChatListService>;
  let onChatSelect: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChatListService = {
      setCallbacks: jest.fn(),
      initializeListeners: jest.fn(),
      cleanupListeners: jest.fn(),
      loadChats: jest.fn(),
      openChat: jest.fn(),
      deleteChat: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ChatListService>;

    onChatSelect = jest.fn();
  });

  it('renders loading state', () => {
    let onLoadingChange: ((loading: boolean) => void) | undefined;

    mockChatListService.setCallbacks.mockImplementation((callbacks) => {
      onLoadingChange = callbacks.onLoadingChange;
    });

    render(<ChatListComponent chatListService={mockChatListService} onChatSelect={onChatSelect} />);

    if (onLoadingChange) {
      const callback = onLoadingChange;
      act(() => {
        callback(true);
      });
    }

    expect(screen.getByText('Loading chats...')).toBeInTheDocument();
  });

  it('renders empty state when no chats', () => {
    let onLoadingChange: ((loading: boolean) => void) | undefined;
    let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;

    mockChatListService.setCallbacks.mockImplementation((callbacks) => {
      onLoadingChange = callbacks.onLoadingChange;
      onChatsChange = callbacks.onChatsChange;
    });

    render(<ChatListComponent chatListService={mockChatListService} onChatSelect={onChatSelect} />);

    if (onLoadingChange) {
      const callback = onLoadingChange;
      act(() => {
        callback(false);
      });
    }
    if (onChatsChange) {
      const callback = onChatsChange;
      act(() => {
        callback([]);
      });
    }

    expect(screen.getByText(/No chats yet/)).toBeInTheDocument();
  });

  it('renders list of chats', () => {
    const mockChats: IChatInfo[] = [
      {
        id: 1,
        title: 'Chat 1',
        provider: 'ollama',
        model: 'test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Chat 2',
        provider: 'ollama',
        model: 'test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    let onLoadingChange: ((loading: boolean) => void) | undefined;
    let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;

    mockChatListService.setCallbacks.mockImplementation((callbacks) => {
      onLoadingChange = callbacks.onLoadingChange;
      onChatsChange = callbacks.onChatsChange;
    });

    render(<ChatListComponent chatListService={mockChatListService} onChatSelect={onChatSelect} />);

    if (onLoadingChange) {
      const callback = onLoadingChange;
      act(() => {
        callback(false);
      });
    }
    if (onChatsChange) {
      const callback = onChatsChange;
      act(() => {
        callback(mockChats);
      });
    }

    expect(screen.getByText('Chat 1')).toBeInTheDocument();
    expect(screen.getByText('Chat 2')).toBeInTheDocument();
  });

  it('calls onChatSelect when chat is clicked', () => {
    const mockChats: IChatInfo[] = [
      {
        id: 1,
        title: 'Chat 1',
        provider: 'ollama',
        model: 'test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    let onLoadingChange: ((loading: boolean) => void) | undefined;
    let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;

    mockChatListService.setCallbacks.mockImplementation((callbacks) => {
      onLoadingChange = callbacks.onLoadingChange;
      onChatsChange = callbacks.onChatsChange;
    });

    render(<ChatListComponent chatListService={mockChatListService} onChatSelect={onChatSelect} />);

    if (onLoadingChange) {
      const callback = onLoadingChange;
      act(() => {
        callback(false);
      });
    }
    if (onChatsChange) {
      const callback = onChatsChange;
      act(() => {
        callback(mockChats);
      });
    }

    const chatButton = screen.getByLabelText('Open chat: Chat 1');
    fireEvent.click(chatButton);

    expect(onChatSelect).toHaveBeenCalledWith(1);
  });

  it('deletes chat when remove button is clicked and confirmed', async () => {
    (globalThis.confirm as jest.Mock).mockReturnValue(true);

    const mockChats: IChatInfo[] = [
      {
        id: 1,
        title: 'Chat 1',
        provider: 'ollama',
        model: 'test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    let onLoadingChange: ((loading: boolean) => void) | undefined;
    let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;

    mockChatListService.setCallbacks.mockImplementation((callbacks) => {
      onLoadingChange = callbacks.onLoadingChange;
      onChatsChange = callbacks.onChatsChange;
    });

    render(<ChatListComponent chatListService={mockChatListService} onChatSelect={onChatSelect} />);

    if (onLoadingChange) {
      const callback = onLoadingChange;
      act(() => {
        callback(false);
      });
    }
    if (onChatsChange) {
      const callback = onChatsChange;
      act(() => {
        callback(mockChats);
      });
    }

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatListService.deleteChat).toHaveBeenCalledWith(1);
    }, { timeout: 1000 });
  });

  it('does not delete chat when confirmation is cancelled', () => {
    (globalThis.confirm as jest.Mock).mockReturnValue(false);

    const mockChats: IChatInfo[] = [
      {
        id: 1,
        title: 'Chat 1',
        provider: 'ollama',
        model: 'test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    let onLoadingChange: ((loading: boolean) => void) | undefined;
    let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;

    mockChatListService.setCallbacks.mockImplementation((callbacks) => {
      onLoadingChange = callbacks.onLoadingChange;
      onChatsChange = callbacks.onChatsChange;
    });

    render(<ChatListComponent chatListService={mockChatListService} onChatSelect={onChatSelect} />);

    if (onLoadingChange) {
      const callback = onLoadingChange;
      act(() => {
        callback(false);
      });
    }
    if (onChatsChange) {
      const callback = onChatsChange;
      act(() => {
        callback(mockChats);
      });
    }

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockChatListService.deleteChat).not.toHaveBeenCalled();
  });

  it('shows deleting state during deletion', () => {
    const mockChats: IChatInfo[] = [
      {
        id: 1,
        title: 'Chat 1',
        provider: 'ollama',
        model: 'test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    let onLoadingChange: ((loading: boolean) => void) | undefined;
    let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;
    let onDeletingChatIdChange: ((chatId: number | null) => void) | undefined;

    mockChatListService.setCallbacks.mockImplementation((callbacks) => {
      onLoadingChange = callbacks.onLoadingChange;
      onChatsChange = callbacks.onChatsChange;
      onDeletingChatIdChange = callbacks.onDeletingChatIdChange;
    });

    render(<ChatListComponent chatListService={mockChatListService} onChatSelect={onChatSelect} />);

    if (onLoadingChange) {
      const callback = onLoadingChange;
      act(() => {
        callback(false);
      });
    }
    if (onChatsChange) {
      const callback = onChatsChange;
      act(() => {
        callback(mockChats);
      });
    }
    if (onDeletingChatIdChange) {
      const callback = onDeletingChatIdChange;
      act(() => {
        callback(1);
      });
    }

    expect(screen.getByText('Removing...')).toBeInTheDocument();
  });

  it('displays error message', () => {
    let onErrorChange: ((error: string | null) => void) | undefined;

    mockChatListService.setCallbacks.mockImplementation((callbacks) => {
      onErrorChange = callbacks.onErrorChange;
    });

    render(<ChatListComponent chatListService={mockChatListService} onChatSelect={onChatSelect} />);

    if (onErrorChange) {
      const callback = onErrorChange;
      act(() => {
        callback('Load failed');
      });
    }

    expect(screen.getByText(/Error: Load failed/)).toBeInTheDocument();
  });

  it('loads chats on mount', () => {
    render(<ChatListComponent chatListService={mockChatListService} onChatSelect={onChatSelect} />);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockChatListService.loadChats).toHaveBeenCalledTimes(1);
  });
});

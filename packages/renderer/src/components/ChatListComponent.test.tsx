import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { IChatInfo } from '@writing-tools/shared';
import React from 'react';

import type { ChatListService } from '../domains/chat-list';
import type { ITabInfo, MultiChatService } from '../domains/multi-chat';

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

    const deleteButton = screen.getByLabelText('Delete chat');
    fireEvent.click(deleteButton);

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

    const deleteButton = screen.getByLabelText('Delete chat');
    fireEvent.click(deleteButton);

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

    // When deleting, the delete button should be disabled
    const deleteButton = screen.getByLabelText('Delete chat');
    expect((deleteButton as HTMLButtonElement).disabled).toBe(true);
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

  describe('opened chat marking', () => {
    const createMockMultiChatService = (tabs: ITabInfo[] = []): jest.Mocked<MultiChatService> => {
      let onTabsChangeCallback: ((tabs: readonly ITabInfo[]) => void) | undefined;

      return {
        setCallbacks: jest.fn((callbacks) => {
          if (callbacks.onTabsChange) {
            onTabsChangeCallback = callbacks.onTabsChange;
            // Immediately notify with current tabs
            callbacks.onTabsChange(tabs);
          }
        }),
        removeCallbacks: jest.fn((callbacks) => {
          if (callbacks.onTabsChange === onTabsChangeCallback) {
            onTabsChangeCallback = undefined;
          }
        }),
        getAllTabs: jest.fn(() => tabs),
      } as unknown as jest.Mocked<MultiChatService>;
    };

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

    it('applies visual styling to opened chats', () => {
      const mockTabs: ITabInfo[] = [
        {
          tabId: 'tab-1',
          type: 'chat',
          chatId: 1,
          title: 'Chat 1',
        },
      ];

      const mockMultiChatService = createMockMultiChatService(mockTabs);

      let onLoadingChange: ((loading: boolean) => void) | undefined;
      let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;

      mockChatListService.setCallbacks.mockImplementation((callbacks) => {
        onLoadingChange = callbacks.onLoadingChange;
        onChatsChange = callbacks.onChatsChange;
      });

      const { container } = render(
        <ChatListComponent
          chatListService={mockChatListService}
          multiChatService={mockMultiChatService}
          onChatSelect={onChatSelect}
        />,
      );

      if (onLoadingChange) {
        const loadingCallback = onLoadingChange;
        act(() => {
          loadingCallback(false);
        });
      }
      if (onChatsChange) {
        const chatsCallback = onChatsChange;
        act(() => {
          chatsCallback(mockChats);
        });
      }

      // Find the chat item container for chat 1 (opened)
      // The button is wrapped in a Tooltip div, so we need to go up two levels
      const chat1Button = screen.getByLabelText('Open chat: Chat 1');
      // Button -> Tooltip div -> Container div
      const chat1Element = chat1Button.parentElement?.parentElement;
      expect(chat1Element).not.toBeNull();
      expect(chat1Element).toBeInTheDocument();
      expect(chat1Element?.className).toContain('border-l-4');
    });

    it('does not apply visual styling to non-opened chats', () => {
      const mockTabs: ITabInfo[] = [
        {
          tabId: 'tab-1',
          type: 'chat',
          chatId: 1,
          title: 'Chat 1',
        },
      ];

      const mockMultiChatService = createMockMultiChatService(mockTabs);

      let onLoadingChange: ((loading: boolean) => void) | undefined;
      let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;

      mockChatListService.setCallbacks.mockImplementation((callbacks) => {
        onLoadingChange = callbacks.onLoadingChange;
        onChatsChange = callbacks.onChatsChange;
      });

      render(
        <ChatListComponent
          chatListService={mockChatListService}
          multiChatService={mockMultiChatService}
          onChatSelect={onChatSelect}
        />,
      );

      if (onLoadingChange) {
        const loadingCallback = onLoadingChange;
        act(() => {
          loadingCallback(false);
        });
      }
      if (onChatsChange) {
        const chatsCallback = onChatsChange;
        act(() => {
          chatsCallback(mockChats);
        });
      }

      // Find the chat item container for chat 2 (not opened)
      // The button is wrapped in a Tooltip div, so we need to go up two levels
      const chat2Button = screen.getByLabelText('Open chat: Chat 2');
      // Button -> Tooltip div -> Container div
      const chat2Element = chat2Button.parentElement?.parentElement;
      expect(chat2Element).not.toBeNull();
      expect(chat2Element).toBeInTheDocument();
      expect(chat2Element?.className).not.toContain('border-l-4');
    });

    it('updates styling when tabs change', () => {
      const mockTabs: ITabInfo[] = [
        {
          tabId: 'tab-1',
          type: 'chat',
          chatId: 1,
          title: 'Chat 1',
        },
      ];

      const mockMultiChatService = createMockMultiChatService(mockTabs);

      let onLoadingChange: ((loading: boolean) => void) | undefined;
      let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;
      let onTabsChangeCallback: ((tabs: readonly ITabInfo[]) => void) | undefined;

      mockChatListService.setCallbacks.mockImplementation((callbacks) => {
        onLoadingChange = callbacks.onLoadingChange;
        onChatsChange = callbacks.onChatsChange;
      });

      mockMultiChatService.setCallbacks.mockImplementation((callbacks) => {
        if (callbacks.onTabsChange) {
          onTabsChangeCallback = callbacks.onTabsChange as (tabs: readonly ITabInfo[]) => void;
          callbacks.onTabsChange(mockTabs);
        }
      });

      render(
        <ChatListComponent
          chatListService={mockChatListService}
          multiChatService={mockMultiChatService}
          onChatSelect={onChatSelect}
        />,
      );

      if (onLoadingChange) {
        const loadingCallback = onLoadingChange;
        act(() => {
          loadingCallback(false);
        });
      }
      if (onChatsChange) {
        const chatsCallback = onChatsChange;
        act(() => {
          chatsCallback(mockChats);
        });
      }

      // Initially, chat 1 is opened
      const chat1Button = screen.getByLabelText('Open chat: Chat 1');
      // Button -> Tooltip div -> Container div
      const chat1Element = chat1Button.parentElement?.parentElement;
      expect(chat1Element).not.toBeNull();
      expect(chat1Element?.className).toContain('border-l-4');

      // Update tabs to open chat 2 instead
      if (onTabsChangeCallback) {
        const tabsCallback = onTabsChangeCallback;
        const updatedTabs: ITabInfo[] = [
          {
            tabId: 'tab-2',
            type: 'chat',
            chatId: 2,
            title: 'Chat 2',
          },
        ];

        act(() => {
          tabsCallback(updatedTabs);
        });
      }

      // Now chat 2 should be marked as opened
      const chat2Button = screen.getByLabelText('Open chat: Chat 2');
      // Button -> Tooltip div -> Container div
      const chat2Element = chat2Button.parentElement?.parentElement;
      expect(chat2Element).not.toBeNull();
      expect(chat2Element?.className).toContain('border-l-4');
    });

    it('handles missing MultiChatService gracefully', () => {
      let onLoadingChange: ((loading: boolean) => void) | undefined;
      let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;

      mockChatListService.setCallbacks.mockImplementation((callbacks) => {
        onLoadingChange = callbacks.onLoadingChange;
        onChatsChange = callbacks.onChatsChange;
      });

      render(<ChatListComponent chatListService={mockChatListService} onChatSelect={onChatSelect} />);

      if (onLoadingChange) {
        const loadingCallback = onLoadingChange;
        act(() => {
          loadingCallback(false);
        });
      }
      if (onChatsChange) {
        const chatsCallback = onChatsChange;
        act(() => {
          chatsCallback(mockChats);
        });
      }

      // Should render chats without opened marking
      expect(screen.getByText('Chat 1')).toBeInTheDocument();
      expect(screen.getByText('Chat 2')).toBeInTheDocument();
    });

    it('handles empty tabs', () => {
      const mockMultiChatService = createMockMultiChatService([]);

      let onLoadingChange: ((loading: boolean) => void) | undefined;
      let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;

      mockChatListService.setCallbacks.mockImplementation((callbacks) => {
        onLoadingChange = callbacks.onLoadingChange;
        onChatsChange = callbacks.onChatsChange;
      });

      render(
        <ChatListComponent
          chatListService={mockChatListService}
          multiChatService={mockMultiChatService}
          onChatSelect={onChatSelect}
        />,
      );

      if (onLoadingChange) {
        const loadingCallback = onLoadingChange;
        act(() => {
          loadingCallback(false);
        });
      }
      if (onChatsChange) {
        const chatsCallback = onChatsChange;
        act(() => {
          chatsCallback(mockChats);
        });
      }

      // No chats should be marked as opened
      const chat1Button = screen.getByLabelText('Open chat: Chat 1');
      // Button -> Tooltip div -> Container div
      const chat1Element = chat1Button.parentElement?.parentElement;
      expect(chat1Element).not.toBeNull();
      expect(chat1Element?.className).not.toContain('border-l-4');
    });

    it('handles tabs with null chatIds', () => {
      const mockTabs: ITabInfo[] = [
        {
          tabId: 'tab-1',
          type: 'chat',
          chatId: null,
          title: null,
        },
      ];

      const mockMultiChatService = createMockMultiChatService(mockTabs);

      let onLoadingChange: ((loading: boolean) => void) | undefined;
      let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;

      mockChatListService.setCallbacks.mockImplementation((callbacks) => {
        onLoadingChange = callbacks.onLoadingChange;
        onChatsChange = callbacks.onChatsChange;
      });

      render(
        <ChatListComponent
          chatListService={mockChatListService}
          multiChatService={mockMultiChatService}
          onChatSelect={onChatSelect}
        />,
      );

      if (onLoadingChange) {
        const loadingCallback = onLoadingChange;
        act(() => {
          loadingCallback(false);
        });
      }
      if (onChatsChange) {
        const chatsCallback = onChatsChange;
        act(() => {
          chatsCallback(mockChats);
        });
      }

      // Tabs with null chatId should not mark any chats as opened
      const chat1Button = screen.getByLabelText('Open chat: Chat 1');
      // Button -> Tooltip div -> Container div
      const chat1Element = chat1Button.parentElement?.parentElement;
      expect(chat1Element).not.toBeNull();
      expect(chat1Element?.className).not.toContain('border-l-4');
    });

    it('handles prompt-selector tabs (should not mark chats as opened)', () => {
      const mockTabs: ITabInfo[] = [
        {
          tabId: 'tab-1',
          type: 'prompt-selector',
          chatId: null,
          title: 'Prompt Selector',
        },
      ];

      const mockMultiChatService = createMockMultiChatService(mockTabs);

      let onLoadingChange: ((loading: boolean) => void) | undefined;
      let onChatsChange: ((chats: IChatInfo[]) => void) | undefined;

      mockChatListService.setCallbacks.mockImplementation((callbacks) => {
        onLoadingChange = callbacks.onLoadingChange;
        onChatsChange = callbacks.onChatsChange;
      });

      render(
        <ChatListComponent
          chatListService={mockChatListService}
          multiChatService={mockMultiChatService}
          onChatSelect={onChatSelect}
        />,
      );

      if (onLoadingChange) {
        const loadingCallback = onLoadingChange;
        act(() => {
          loadingCallback(false);
        });
      }
      if (onChatsChange) {
        const chatsCallback = onChatsChange;
        act(() => {
          chatsCallback(mockChats);
        });
      }

      // Prompt-selector tabs should not mark any chats as opened
      const chat1Button = screen.getByLabelText('Open chat: Chat 1');
      // Button -> Tooltip div -> Container div
      const chat1Element = chat1Button.parentElement?.parentElement;
      expect(chat1Element).not.toBeNull();
      expect(chat1Element?.className).not.toContain('border-l-4');
    });
  });
});

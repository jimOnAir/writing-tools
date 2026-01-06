import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { IChatMessage } from '@writing-tools/shared';
import React from 'react';

import type { ChatService } from '../domains/chat';

import ChatComponent from './ChatComponent';

// Mock the electronAPI for testing
const mockElectronAPI = {
  invoke: jest.fn(),
  onChatWindowData: jest.fn(() => jest.fn()),
  offChatWindowData: jest.fn(),
  onOllamaResponse: jest.fn(() => jest.fn()),
  offOllamaResponse: jest.fn(),
  onPromptSelectorData: jest.fn(() => jest.fn()),
  offPromptSelectorData: jest.fn(),
  onChatTitleUpdated: jest.fn(() => jest.fn()),
  offChatTitleUpdated: jest.fn(),
  onChatLoadMessagesData: jest.fn(() => jest.fn()),
  offChatLoadMessagesData: jest.fn(),
  onChatCreated: jest.fn(() => jest.fn()),
  offChatCreated: jest.fn(),
  onChatDeleted: jest.fn(() => jest.fn()),
  offChatDeleted: jest.fn(),
};

// Mock globalThis.electronAPI
Object.defineProperty(globalThis, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Create mock ChatService
const createMockChatService = (): jest.Mocked<ChatService> => {
  return {
    setCallbacks: jest.fn(),
    initializeListeners: jest.fn(),
    cleanupListeners: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue(null),
    navigateHistoryUp: jest.fn().mockReturnValue(null),
    navigateHistoryDown: jest.fn().mockReturnValue(null),
    getMessages: jest.fn().mockReturnValue([]),
    getIsLoading: jest.fn().mockReturnValue(false),
    getError: jest.fn().mockReturnValue(null),
    getHistoryIndex: jest.fn().mockReturnValue(-1),
    getIsHandlingResponse: jest.fn().mockReturnValue(false),
    getCurrentChatId: jest.fn().mockReturnValue(null),
    getChatInfo: jest.fn().mockResolvedValue(null),
    loadChatMessages: jest.fn().mockResolvedValue(undefined),
    deleteChat: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<ChatService>;
};

describe('ChatComponent', () => {
  let mockChatService: jest.Mocked<ChatService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChatService = createMockChatService();

    // Mock scrollIntoView for DOM elements
    Element.prototype.scrollIntoView = jest.fn();
  });

  test('renders chat interface with empty message list', () => {
    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  test('allows sending a message', async () => {
    // Mock successful response
    mockChatService.sendMessage.mockResolvedValue(null);

    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Type a message and send it
    fireEvent.change(textarea, { target: { value: 'Hello!' } });
    fireEvent.click(sendButton);

    // Verify sendMessage was called
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Hello!');
    });
  });

  test('shows error in UI when service returns error', async () => {
    // Mock error response from service
    mockChatService.sendMessage.mockResolvedValue('Connection refused');

    let onErrorChange: ((error: string | null) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onErrorChange = callbacks.onErrorChange;
    });

    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Type a message and send it
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Verify sendMessage was called with the correct text
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Test message');
    });

    // Simulate service notifying the component about the error
    if (onErrorChange) {
      const callback = onErrorChange;
      act(() => {
        callback('Connection refused');
      });
    }

    // Error message should be rendered in the DOM
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
  });

  test('displays messages from service', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'assistant' as const,
        content: 'Hi there',
        timestamp: new Date(),
      },
    ];

    mockChatService.getMessages.mockReturnValue(mockMessages);

    let onMessagesChange: ((messages: typeof mockMessages) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onMessagesChange = callbacks.onMessagesChange;
    });

    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    if (onMessagesChange) {
      const callback = onMessagesChange;
      act(() => {
        callback(mockMessages);
      });
    }

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  test('shows loading state', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      },
    ];

    let onMessagesChange: ((messages: typeof mockMessages) => void) | undefined;
    let onLoadingChange: ((loading: boolean) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onMessagesChange = callbacks.onMessagesChange;
      onLoadingChange = callbacks.onLoadingChange;
    });

    const { container } = render(<ChatComponent chatService={mockChatService} chatId={null} />);

    // Verify callback was registered
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockChatService.setCallbacks).toHaveBeenCalled();

    // First add messages so the loading UI can be displayed
    if (onMessagesChange) {
      const callback = onMessagesChange;
      act(() => {
        callback(mockMessages);
      });
    }

    // Then set loading state
    if (onLoadingChange) {
      const callback = onLoadingChange;
      act(() => {
        callback(true);
      });
    }

    // Component should show loading state - verify loading UI is rendered
    // The loading UI contains animated dots with specific classes
    const loadingDots = container.querySelectorAll('.animate-bounce');
    expect(loadingDots.length).toBeGreaterThan(0);
  });

  test('displays error message from onErrorChange callback', () => {
    let onErrorChange: ((error: string | null) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onErrorChange = callbacks.onErrorChange;
    });

    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    if (onErrorChange) {
      const callback = onErrorChange;
      act(() => {
        callback('Test error');
      });
    }

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  test('loads messages when chatId is provided', async () => {
    render(<ChatComponent chatService={mockChatService} chatId={1} />);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.loadChatMessages).toHaveBeenCalledWith(1);
    });

    // Wait for the useEffect that calls getChatInfo to complete (to avoid act() warnings)
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.getChatInfo).toHaveBeenCalled();
    });
  });

  test('handles keyboard navigation', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Message 1',
        timestamp: new Date(),
      },
    ];

    mockChatService.navigateHistoryUp.mockReturnValue('Message 1');
    mockChatService.navigateHistoryDown.mockReturnValue('Message 2');

    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    const textarea = screen.getByPlaceholderText('Type your message...');

    // ArrowUp should call navigateHistoryUp and update the input when a value is returned
    fireEvent.keyDown(textarea, { key: 'ArrowUp' });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockChatService.navigateHistoryUp).toHaveBeenCalled();
    expect(textarea.value).toBe('Message 1');

    // ArrowDown should call navigateHistoryDown and update the input when a value is returned
    fireEvent.keyDown(textarea, { key: 'ArrowDown' });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockChatService.navigateHistoryDown).toHaveBeenCalled();
    expect(textarea.value).toBe('Message 2');
  });

  test('pressing Enter without Shift sends the message and clears input on success', async () => {
    mockChatService.sendMessage.mockResolvedValue(null);

    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    const textarea = screen.getByPlaceholderText('Type your message...');

    fireEvent.change(textarea, { target: { value: 'Hello via Enter' } });

    fireEvent.keyDown(textarea, {
      key: 'Enter',
      shiftKey: false,
    });

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Hello via Enter');
      expect(textarea.value).toBe('');
    });
  });

  test('pressing Shift+Enter does not send the message', async () => {
    mockChatService.sendMessage.mockResolvedValue(null);

    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    const textarea = screen.getByPlaceholderText('Type your message...');

    fireEvent.change(textarea, { target: { value: 'Hello with newline' } });

    fireEvent.keyDown(textarea, {
      key: 'Enter',
      shiftKey: true,
    });

    // sendMessage should not be called when Shift+Enter is pressed
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });
  });

  test('pressing Ctrl+Enter sends the message', async () => {
    mockChatService.sendMessage.mockResolvedValue(null);

    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    const textarea = screen.getByPlaceholderText('Type your message...');

    fireEvent.change(textarea, { target: { value: 'Hello via Ctrl+Enter' } });

    fireEvent.keyDown(textarea, {
      key: 'Enter',
      ctrlKey: true,
    });

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Hello via Ctrl+Enter');
    });
  });

  test('does not send message when input is empty or whitespace', async () => {
    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Empty input
    fireEvent.change(textarea, { target: { value: '' } });
    fireEvent.click(sendButton);

    // Whitespace-only input
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });
  });

  test('does not send message and disables button when loading', async () => {
    let onLoadingChange: ((loading: boolean) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onLoadingChange = callbacks.onLoadingChange;
    });

    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(textarea, { target: { value: 'Message while loading' } });

    if (onLoadingChange) {
      const callback = onLoadingChange;
      act(() => {
        callback(true);
      });
    }

    expect(sendButton.disabled).toBe(true);

    fireEvent.click(sendButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });
  });

  test('keeps input value when service returns error string', async () => {
    mockChatService.sendMessage.mockResolvedValue('Service error');

    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(textarea, { target: { value: 'Message that fails' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Message that fails');
    });

    // Input should not be cleared when an error string is returned
    expect(textarea.value).toBe('Message that fails');
  });

  test('scrolls to bottom on new messages when not handling response', () => {
    const mockMessages: IChatMessage[] = [
      {
        id: '1',
        role: 'user' as const,
        content: 'First',
        timestamp: new Date(),
      },
    ];

    let onMessagesChange: ((messages: IChatMessage[]) => void) | undefined;
    let onHandlingResponseChange: ((isHandlingResponse: boolean) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onMessagesChange = callbacks.onMessagesChange;
      onHandlingResponseChange = callbacks.onHandlingResponseChange;
    });

    const scrollSpy = jest.spyOn(Element.prototype, 'scrollIntoView');

    render(<ChatComponent chatService={mockChatService} chatId={null} />);

    // When not handling response, new messages should trigger scrollIntoView
    if (onMessagesChange) {
      const callback = onMessagesChange;
      act(() => {
        callback(mockMessages);
      });
    }

    expect(scrollSpy).toHaveBeenCalled();

    scrollSpy.mockClear();

    // When handling response, new messages should not trigger scrollIntoView
    if (onHandlingResponseChange) {
      const callback = onHandlingResponseChange;
      act(() => {
        callback(true);
      });
    }

    if (onMessagesChange) {
      const callback = onMessagesChange;
      act(() => {
        callback([
          ...mockMessages,
          {
            id: '2',
            role: 'assistant' as const,
            content: 'Second',
            timestamp: new Date(),
          },
        ]);
      });
    }

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test('shows \"New Chat\" header when there is an active chat without a title', async () => {
    mockChatService.getChatInfo.mockResolvedValue(null);

    render(<ChatComponent chatService={mockChatService} chatId={1} />);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.getChatInfo).toHaveBeenCalled();
    });

    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  test('displays chat title when onTitleChange is called', async () => {
    let onTitleChange: ((title: string) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onTitleChange = callbacks.onTitleChange;
    });

    render(<ChatComponent chatService={mockChatService} chatId={1} />);

    // Wait for the useEffect that calls getChatInfo to complete
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.getChatInfo).toHaveBeenCalled();
    });

    if (onTitleChange) {
      const callback = onTitleChange;
      act(() => {
        callback('Test Chat Title');
      });
    }

    // Title should be rendered in the header
    expect(screen.getByText('Test Chat Title')).toBeInTheDocument();
  });
});

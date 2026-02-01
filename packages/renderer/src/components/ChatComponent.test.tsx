import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { IChatMessage } from '@writing-tools/shared';
import { EStreamingErrorType } from '@writing-tools/shared';
import React from 'react';

import type { ChatService } from '../domains/chat';
import type { SettingsService } from '../domains/settings';

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
  onChatStreamChunk: jest.fn(() => jest.fn()),
  offChatStreamChunk: jest.fn(),
  onChatStreamEnd: jest.fn(() => jest.fn()),
  offChatStreamEnd: jest.fn(),
};

// Mock globalThis.electronAPI
Object.defineProperty(globalThis, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Create mock ChatService
const createMockChatService = (): jest.Mocked<ChatService> => {
  return {
    cleanupListeners: jest.fn(),
    deleteChat: jest.fn().mockResolvedValue(null),
    getChatInfo: jest.fn().mockResolvedValue(null),
    getCurrentChatId: jest.fn().mockReturnValue(null),
    getError: jest.fn().mockReturnValue(null),
    getHistoryIndex: jest.fn().mockReturnValue(-1),
    getIsHandlingResponse: jest.fn().mockReturnValue(false),
    getIsLoading: jest.fn().mockReturnValue(false),
    getModelOverride: jest.fn().mockReturnValue(null),
    getMessages: jest.fn().mockReturnValue([]),
    getPreconfiguredPrompts: jest.fn().mockReturnValue([]),
    getScrollPosition: jest.fn().mockReturnValue(0),
    getSelectedText: jest.fn().mockReturnValue(''),
    initializeListeners: jest.fn(),
    loadChatMessages: jest.fn().mockResolvedValue(undefined),
    navigateHistoryDown: jest.fn().mockReturnValue(null),
    navigateHistoryUp: jest.fn().mockReturnValue(null),
    retryLastMessage: jest.fn().mockResolvedValue(null),
    seedModelOverrideFromChatInfo: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue(null),
    setCallbacks: jest.fn(),
    setModelOverride: jest.fn(),
    setScrollPosition: jest.fn(),
  } as unknown as jest.Mocked<ChatService>;
};

const createMockSettingsService = (): jest.Mocked<SettingsService> => {
  return {
    cancelChanges: jest.fn(),
    fetchAvailableModels: jest.fn().mockResolvedValue(undefined),
    getSettings: jest.fn().mockReturnValue({ ollama: {}, lmstudio: {}, provider: 'ollama' }),
    hasUnsavedChanges: jest.fn().mockReturnValue(false),
    loadSettings: jest.fn().mockResolvedValue(undefined),
    saveSettings: jest.fn().mockResolvedValue(true),
    setCallbacks: jest.fn(),
    updateLMStudioAddress: jest.fn(),
    updateLMStudioApiKey: jest.fn(),
    updateLMStudioModel: jest.fn(),
    updateOllamaAddress: jest.fn(),
    updateOllamaApiKey: jest.fn(),
    updateOllamaModel: jest.fn(),
    updateProvider: jest.fn(),
  } as unknown as jest.Mocked<SettingsService>;
};

describe('ChatComponent', () => {
  let mockChatService: jest.Mocked<ChatService>;
  let mockSettingsService: jest.Mocked<SettingsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChatService = createMockChatService();
    mockSettingsService = createMockSettingsService();

    // Mock scrollIntoView for DOM elements
    Element.prototype.scrollIntoView = jest.fn();

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  test('renders chat interface with empty message list', () => {
    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  test('shows prompt-selector UI when chatService has prompt data (selectedText)', () => {
    mockChatService.getSelectedText.mockReturnValue('Selected text');

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    expect(screen.getByText('Select a Prompt')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your custom prompt...')).toBeInTheDocument();
  });

  test('shows prompt-selector UI when chatService has prompt data (preconfiguredPrompts)', () => {
    mockChatService.getPreconfiguredPrompts.mockReturnValue([
      { prompt: 'Summarize {text}', title: 'Summarize' },
    ]);

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    expect(screen.getByText('Select a Prompt')).toBeInTheDocument();
  });

  test('shows normal chat UI when chatService has no prompt data', () => {
    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.queryByText('Select a Prompt')).not.toBeInTheDocument();
  });

  test('allows sending a message', async () => {
    // Mock successful response
    mockChatService.sendMessage.mockResolvedValue(null);

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: 'Send' });

    // Type a message and send it
    fireEvent.change(textarea, { target: { value: 'Hello!' } });
    fireEvent.click(sendButton);

    // Verify sendMessage was called
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Hello!', undefined);
    });
  });

  test('shows error in UI when service returns error', async () => {
    // Mock error response from service
    mockChatService.sendMessage.mockResolvedValue('Connection refused');

    let onErrorChange: ((error: string | null) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onErrorChange = callbacks.onErrorChange;
    });

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: 'Send' });

    // Type a message and send it
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Verify sendMessage was called with the correct text
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Test message', undefined);
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

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    if (onMessagesChange) {
      const callback = onMessagesChange;
      act(() => {
        callback(mockMessages);
      });
    }

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  test('copies message content to clipboard when copy button is clicked', async () => {
    const mockMessages: IChatMessage[] = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Copy this message',
        timestamp: new Date(),
      },
    ];

    let onMessagesChange: ((messages: IChatMessage[]) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onMessagesChange = callbacks.onMessagesChange;
    });

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    if (onMessagesChange) {
      const callback = onMessagesChange;
      act(() => {
        callback(mockMessages);
      });
    }

    const copyButtons = screen.getAllByLabelText('Copy message to clipboard');

    expect(copyButtons.length).toBeGreaterThan(0);

    const writeTextMock = navigator.clipboard.writeText as unknown as jest.Mock;

    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('Copy this message');
      expect(copyButtons[0]).toHaveTextContent('✓');
    });
  });

  test('handles clipboard write errors without throwing', async () => {
    const mockMessages: IChatMessage[] = [
      {
        id: '1',
        role: 'assistant' as const,
        content: 'Message that fails to copy',
        timestamp: new Date(),
      },
    ];

    let onMessagesChange: ((messages: IChatMessage[]) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onMessagesChange = callbacks.onMessagesChange;
    });

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    if (onMessagesChange) {
      const callback = onMessagesChange;
      act(() => {
        callback(mockMessages);
      });
    }

    const writeTextMock = navigator.clipboard.writeText as unknown as jest.Mock;

    writeTextMock.mockRejectedValueOnce(new Error('Copy failed'));

    const copyButtons = screen.getAllByLabelText('Copy message to clipboard');

    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('Message that fails to copy');
    });
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

    const { container } = render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

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
    let onErrorChange: ((error: string | null, errorType?: EStreamingErrorType) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onErrorChange = callbacks.onErrorChange;
    });

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    if (onErrorChange) {
      const callback = onErrorChange;
      act(() => {
        callback('Test error');
      });
    }

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  test('does not show inline error div for streaming errors (shown as message instead)', () => {
    let onErrorChange: ((error: string | null, errorType?: EStreamingErrorType) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onErrorChange = callbacks.onErrorChange;
    });

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const callback = onErrorChange;
    if (callback !== undefined) {
      act(() => {
        callback('Streaming error: fetch failed', EStreamingErrorType.NETWORK);
      });
    }

    expect(
      screen.queryByText('Connection failed. Please ensure Ollama (or LM Studio) is running and reachable.'),
    ).not.toBeInTheDocument();
  });

  test('shows inline error div for non-streaming errors', () => {
    let onErrorChange: ((error: string | null, errorType?: EStreamingErrorType) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onErrorChange = callbacks.onErrorChange;
    });

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const callback = onErrorChange;
    if (callback !== undefined) {
      act(() => {
        callback('Failed to load messages: Load failed');
      });
    }

    expect(screen.getByText('Failed to load messages: Load failed')).toBeInTheDocument();
  });

  test('displays error type label and contextual message when message has errorType NETWORK', () => {
    const errorMessages: IChatMessage[] = [
      {
        content: 'Hello',
        errorType: undefined,
        id: '1',
        role: 'user' as const,
        timestamp: new Date(),
      },
      {
        content: 'Error: fetch failed',
        errorType: EStreamingErrorType.NETWORK,
        id: '2',
        role: 'assistant' as const,
        timestamp: new Date(),
      },
    ];

    let onMessagesChange: ((messages: IChatMessage[]) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onMessagesChange = callbacks.onMessagesChange;
    });

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const messagesCallback = onMessagesChange;
    if (messagesCallback !== undefined) {
      act(() => {
        messagesCallback(errorMessages);
      });
    }

    expect(screen.getByText('Connection error')).toBeInTheDocument();
    expect(
      screen.getByText('Connection failed. Please ensure Ollama (or LM Studio) is running and reachable.'),
    ).toBeInTheDocument();
  });

  test('uses error style for assistant message when content starts with "Error:"', () => {
    const errorMessages: IChatMessage[] = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'assistant' as const,
        content: 'Error: Connection refused',
        timestamp: new Date(),
      },
    ];

    let onMessagesChange: ((messages: IChatMessage[]) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onMessagesChange = callbacks.onMessagesChange;
    });

    const { container } = render(
      <ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />,
    );

    const messagesCallback = onMessagesChange;
    if (messagesCallback !== undefined) {
      act(() => {
        messagesCallback(errorMessages);
      });
    }

    const errorBubble = container.querySelector(String.raw`.bg-red-900\/30`);
    expect(errorBubble).toBeInTheDocument();
    expect(errorBubble?.textContent).toContain('Error: Connection refused');
  });

  test('shows Retry button for last assistant error message and calls retryLastMessage on click', () => {
    const errorMessages: IChatMessage[] = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'assistant' as const,
        content: 'Error: Connection refused',
        timestamp: new Date(),
      },
    ];

    let onMessagesChange: ((messages: IChatMessage[]) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onMessagesChange = callbacks.onMessagesChange;
    });

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const messagesCallback = onMessagesChange;
    if (messagesCallback !== undefined) {
      act(() => {
        messagesCallback(errorMessages);
      });
    }

    const retryButton = screen.getByRole('button', { name: 'Retry sending the last message' });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);

    expect(mockChatService.retryLastMessage).toHaveBeenCalledWith(undefined);
  });

  test('calls retryLastMessage with model options when effective model is set', () => {
    mockChatService.getModelOverride.mockReturnValue({ model: 'llama3', provider: 'ollama' });

    const errorMessages: IChatMessage[] = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'assistant' as const,
        content: 'Error: Timeout',
        timestamp: new Date(),
      },
    ];

    let onMessagesChange: ((messages: IChatMessage[]) => void) | undefined;

    mockChatService.setCallbacks.mockImplementation((callbacks) => {
      onMessagesChange = callbacks.onMessagesChange;
    });

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const messagesCallback = onMessagesChange;
    if (messagesCallback !== undefined) {
      act(() => {
        messagesCallback(errorMessages);
      });
    }

    const retryButton = screen.getByRole('button', { name: 'Retry sending the last message' });
    fireEvent.click(retryButton);

    expect(mockChatService.retryLastMessage).toHaveBeenCalledWith({
      model: 'llama3',
      provider: 'ollama',
    });
  });

  test('loads messages when chatId is provided', async () => {
    render(<ChatComponent chatId={1} chatService={mockChatService} settingsService={mockSettingsService} />);

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

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const textarea = screen.getByPlaceholderText('Type your message...');

    // ArrowUp should call navigateHistoryUp and update the input when a value is returned
    fireEvent.keyDown(textarea, { key: 'ArrowUp' });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockChatService.navigateHistoryUp).toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toBe('Message 1');

    // ArrowDown should call navigateHistoryDown and update the input when a value is returned
    fireEvent.keyDown(textarea, { key: 'ArrowDown' });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockChatService.navigateHistoryDown).toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toBe('Message 2');
  });

  test('pressing Enter without Shift sends the message and clears input on success', async () => {
    mockChatService.sendMessage.mockResolvedValue(null);

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const textarea = screen.getByPlaceholderText('Type your message...');

    fireEvent.change(textarea, { target: { value: 'Hello via Enter' } });

    fireEvent.keyDown(textarea, {
      key: 'Enter',
      shiftKey: false,
    });

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Hello via Enter', undefined);
      expect((textarea as HTMLTextAreaElement).value).toBe('');
    });
  });

  test('pressing Shift+Enter does not send the message', async () => {
    mockChatService.sendMessage.mockResolvedValue(null);

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

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

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const textarea = screen.getByPlaceholderText('Type your message...');

    fireEvent.change(textarea, { target: { value: 'Hello via Ctrl+Enter' } });

    fireEvent.keyDown(textarea, {
      key: 'Enter',
      ctrlKey: true,
    });

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Hello via Ctrl+Enter', undefined);
    });
  });

  test('does not send message when input is empty or whitespace', async () => {
    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: 'Send' });

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

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: 'Send' });

    fireEvent.change(textarea, { target: { value: 'Message while loading' } });

    if (onLoadingChange) {
      const callback = onLoadingChange;
      act(() => {
        callback(true);
      });
    }

    expect((sendButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(sendButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });
  });

  test('keeps input value when service returns error string', async () => {
    mockChatService.sendMessage.mockResolvedValue('Service error');

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: 'Send' });

    fireEvent.change(textarea, { target: { value: 'Message that fails' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Message that fails', undefined);
    });

    // Input should not be cleared when an error string is returned
    expect((textarea as HTMLTextAreaElement).value).toBe('Message that fails');
  });

  test('preserves scroll position when loading messages (no auto-scroll)', () => {
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

    render(<ChatComponent chatId={null} chatService={mockChatService} settingsService={mockSettingsService} />);

    // Scroll to bottom only during streaming - not when loading messages
    if (onMessagesChange) {
      const callback = onMessagesChange;
      act(() => {
        callback(mockMessages);
      });
    }

    // No scroll when not streaming (preserves scroll position on tab switch)
    expect(scrollSpy).not.toHaveBeenCalled();

    scrollSpy.mockClear();

    // When streaming, new messages should trigger scrollIntoView
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

    // Still no scroll when not streaming (scroll only happens during isStreaming)
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  test('shows \"New Chat\" header when there is an active chat without a title', async () => {
    mockChatService.getChatInfo.mockResolvedValue(null);

    render(<ChatComponent chatId={1} chatService={mockChatService} settingsService={mockSettingsService} />);

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

    render(<ChatComponent chatId={1} chatService={mockChatService} settingsService={mockSettingsService} />);

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

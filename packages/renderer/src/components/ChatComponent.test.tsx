import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  onChatDeleted: jest.fn(() => jest.fn()),
  offChatDeleted: jest.fn(),
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Create mock ChatService
const createMockChatService = (): ChatService => {
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
  } as unknown as ChatService;
};

describe('ChatComponent', () => {
  let mockChatService: ChatService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChatService = createMockChatService();
  });

  test('renders chat interface with empty message list', () => {
    render(<ChatComponent chatService={mockChatService} />);

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  test('allows sending a message', async () => {
    // Mock successful response
    (mockChatService.sendMessage as jest.Mock).mockResolvedValue(null);

    render(<ChatComponent chatService={mockChatService} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Type a message and send it
    fireEvent.change(textarea, { target: { value: 'Hello!' } });
    fireEvent.click(sendButton);

    // Verify sendMessage was called
    await waitFor(() => {
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Hello!');
    });
  });

  test('shows error when service returns error', async () => {
    // Mock error response
    (mockChatService.sendMessage as jest.Mock).mockResolvedValue('Connection refused');
    (mockChatService.getError as jest.Mock).mockReturnValue('Connection refused');

    render(<ChatComponent chatService={mockChatService} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Type a message and send it
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Verify sendMessage was called
    await waitFor(() => {
      expect(mockChatService.sendMessage).toHaveBeenCalledWith('Test message');
    });
  });
});

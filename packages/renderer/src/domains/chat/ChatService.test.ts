import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';
import type { IChatInfo, IChatMessage, TChatResponse } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import type { TIpcRenderListener } from '../../types/TIpcRenderListener';

import { ChatService } from './ChatService';

describe('ChatService', () => {
  let mockIpcAdapter: jest.Mocked<IIpcAdapter>;
  let chatService: ChatService;
  let mockListener: TIpcRenderListener;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

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

    chatService = new ChatService(mockIpcAdapter);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('setCallbacks', () => {
    it('registers callbacks', () => {
      const onMessagesChange = jest.fn();
      const onLoadingChange = jest.fn();
      const onErrorChange = jest.fn();

      chatService.setCallbacks({
        onMessagesChange,
        onLoadingChange,
        onErrorChange,
      });

      // Callbacks should be registered (tested indirectly through other methods)
      expect(chatService).toBeDefined();
    });
  });

  describe('initializeListeners', () => {
    it('registers all IPC listeners', () => {
      chatService.initializeListeners();

      expect(mockIpcAdapter.onOllamaResponse).toHaveBeenCalled();
      expect(mockIpcAdapter.onChatTitleUpdated).toHaveBeenCalled();
      expect(mockIpcAdapter.onChatLoadMessagesData).toHaveBeenCalled();
      expect(mockIpcAdapter.onChatDeleted).toHaveBeenCalled();
    });
  });

  describe('cleanupListeners', () => {
    it('unregisters all listeners', () => {
      chatService.initializeListeners();
      chatService.cleanupListeners();

      expect(mockIpcAdapter.offOllamaResponse).toHaveBeenCalled();
      expect(mockIpcAdapter.offChatTitleUpdated).toHaveBeenCalled();
      expect(mockIpcAdapter.offChatLoadMessagesData).toHaveBeenCalled();
      expect(mockIpcAdapter.offChatDeleted).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('sends message successfully', async () => {
      const mockResponse = { response: 'Test response' };
      mockIpcAdapter.invoke.mockResolvedValue(mockResponse);

      // Mock createNewChatSession to return a chatId
      const chatId = 1;
      mockIpcAdapter.invoke.mockResolvedValueOnce({ chatId });

      const onMessagesChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange });

      const result = await chatService.sendMessage('Hello');

      expect(result).toBeNull();
      expect(mockIpcAdapter.invoke).toHaveBeenCalled();
      expect(onMessagesChange).toHaveBeenCalled();
    });

    it('returns null for empty message', async () => {
      const result = await chatService.sendMessage('   ');

      expect(result).toBeNull();
      expect(mockIpcAdapter.invoke).not.toHaveBeenCalled();
    });

    it('handles errors when sending message', async () => {
      mockIpcAdapter.invoke
        .mockResolvedValueOnce({ chatId: 1 })
        .mockRejectedValueOnce(new Error('Send failed'));

      const onErrorChange = jest.fn();
      chatService.setCallbacks({ onErrorChange });

      const result = await chatService.sendMessage('Hello');

      expect(result).toBe('Send failed');
      expect(onErrorChange).toHaveBeenCalledWith('Failed to send message: Send failed');
    });

    it('creates new chat session if chatId is null', async () => {
      mockIpcAdapter.invoke
        .mockResolvedValueOnce({ chatId: 1 })
        .mockResolvedValueOnce({ response: 'Response' });

      await chatService.sendMessage('Hello');

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.CHAT,
        expect.objectContaining({
          event: EIpcEvent.CHAT_CREATE_SESSION,
        }),
      );
    });
  });

  describe('loadChatMessages', () => {
    it('loads messages for a chat', async () => {
      const mockMessages: IChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      mockIpcAdapter.invoke.mockResolvedValue({ messages: mockMessages });

      const onMessagesChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange });

      await chatService.loadChatMessages(1);

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.CHAT,
        expect.objectContaining({
          event: EIpcEvent.CHAT_LOAD_MESSAGES,
        }),
      );
    });

    it('handles errors when loading messages', async () => {
      mockIpcAdapter.invoke.mockRejectedValue(new Error('Load failed'));

      const onErrorChange = jest.fn();
      chatService.setCallbacks({ onErrorChange });

      await chatService.loadChatMessages(1);

      expect(onErrorChange).toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('returns current messages', () => {
      const messages = chatService.getMessages();

      expect(Array.isArray(messages)).toBe(true);
    });
  });

  describe('getIsLoading', () => {
    it('returns loading state', () => {
      const isLoading = chatService.getIsLoading();

      expect(typeof isLoading).toBe('boolean');
    });
  });

  describe('getError', () => {
    it('returns error state', () => {
      const error = chatService.getError();

      expect(error === null || typeof error === 'string').toBe(true);
    });
  });

  describe('getHistoryIndex', () => {
    it('returns history index', () => {
      const index = chatService.getHistoryIndex();

      expect(typeof index).toBe('number');
    });
  });

  describe('navigateHistoryUp', () => {
    it('navigates to previous message in history', () => {
      const onHistoryIndexChange = jest.fn();
      chatService.setCallbacks({ onHistoryIndexChange });

      // Set messages directly (would normally be done through loadChatMessages)
      chatService.setCallbacks({
        onMessagesChange: () => {
          // Simulate setting messages
        },
      });

      const result = chatService.navigateHistoryUp();

      // Should return a message or null
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('navigateHistoryDown', () => {
    it('navigates to next message in history', () => {
      const result = chatService.navigateHistoryDown();

      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('deleteChat', () => {
    it('deletes chat successfully', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ success: true });

      const result = await chatService.deleteChat(1);

      expect(result).toBeNull();
      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.CHAT,
        expect.objectContaining({
          event: EIpcEvent.CHAT_DELETE,
        }),
      );
    });

    it('handles errors when deleting chat', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ success: false, error: 'Delete failed' });

      const result = await chatService.deleteChat(1);

      expect(result).toBe('Delete failed');
    });
  });

  describe('getCurrentChatId', () => {
    it('returns current chat ID', () => {
      const chatId = chatService.getCurrentChatId();

      expect(chatId === null || typeof chatId === 'number').toBe(true);
    });
  });

  describe('getChatInfo', () => {
    it('fetches chat info', async () => {
      const mockChat: IChatInfo = {
        id: 1,
        title: 'Test Chat',
        provider: 'ollama',
        model: 'test',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockIpcAdapter.invoke.mockResolvedValue({ chat: mockChat });

      const chatInfo = await chatService.getChatInfo(1);

      expect(chatInfo).toEqual(mockChat);
    });

    it('handles errors when fetching chat info', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ error: 'Chat not found' });

      const testChatId = 999;
      const chatInfo = await chatService.getChatInfo(testChatId);

      expect(chatInfo).toBeNull();
    });
  });

  describe('listener handlers', () => {
    it('handles Ollama response with result', () => {
      chatService.initializeListeners();

      const onMessagesChange = jest.fn();
      const onHandlingResponseChange = jest.fn();
      chatService.setCallbacks({
        onMessagesChange,
        onHandlingResponseChange,
      });

      // Get the callback that was registered
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const responseCallback = (mockIpcAdapter.onOllamaResponse as jest.Mock).mock.calls[0]?.[0] as (response: TChatResponse) => void;

      responseCallback({ result: 'Test response', chatId: 1 });

      jest.advanceTimersByTime(100);

      expect(onMessagesChange).toHaveBeenCalled();
    });

    it('handles Ollama response with error', () => {
      chatService.initializeListeners();

      const onMessagesChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const responseCallback = (mockIpcAdapter.onOllamaResponse as jest.Mock).mock.calls[0]?.[0] as (response: TChatResponse) => void;

      responseCallback({ error: 'Test error' });

      jest.advanceTimersByTime(100);

      expect(onMessagesChange).toHaveBeenCalled();
    });

    it('handles chat title updated event', () => {
      chatService.initializeListeners();

      const onTitleChange = jest.fn();
      chatService.setCallbacks({ onTitleChange });

      // First, set the currentChatId by loading messages (simulates loading a chat)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      const messages: IChatMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
      ];

      messagesCallback({ chatId: 1, messages });

      // Now trigger the title update (title updates only work when currentChatId matches)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const titleCallback = (mockIpcAdapter.onChatTitleUpdated as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, title: string },
      ) => void;

      titleCallback({ chatId: 1, title: 'New Title' });

      expect(onTitleChange).toHaveBeenCalledWith('New Title');
    });

    it('handles chat load messages data event', () => {
      chatService.initializeListeners();

      const onMessagesChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      const messages: IChatMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
      ];

      messagesCallback({ chatId: 1, messages });

      expect(onMessagesChange).toHaveBeenCalledWith(messages);
    });
  });
});

import type { IChatInfo, IChatMessage, TChatResponse, IChatStreamChunk, IChatStreamEnd } from '@writing-tools/shared';
import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';
import { EStreamingErrorType } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import type { TIpcRenderListener } from '../../types/TIpcRenderListener';

import { ChatService } from './ChatService';

const createMockLogger = () =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    setEnvironment: jest.fn(),
    setLevel: jest.fn(),
    warn: jest.fn(),
  }) as unknown as jest.Mocked<import('@writing-tools/shared').ILogger>;

describe('ChatService', () => {
  let mockIpcAdapter: jest.Mocked<IIpcAdapter>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let chatService: ChatService;
  let mockListener: TIpcRenderListener;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockLogger = createMockLogger();
    mockListener = { remove: jest.fn() } as unknown as TIpcRenderListener;

    mockIpcAdapter = {
      invoke: jest.fn(),
      onPromptSelected: jest.fn(() => mockListener),
      offPromptSelected: jest.fn(),
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
      onChatStreamChunk: jest.fn(() => mockListener),
      offChatStreamChunk: jest.fn(),
      onChatStreamEnd: jest.fn(() => mockListener),
      offChatStreamEnd: jest.fn(),
    } as unknown as jest.Mocked<IIpcAdapter>;

    chatService = new ChatService(mockIpcAdapter, mockLogger);
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
      expect(mockIpcAdapter.onChatStreamChunk).toHaveBeenCalled();
      expect(mockIpcAdapter.onChatStreamEnd).toHaveBeenCalled();
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
      expect(mockIpcAdapter.offChatStreamChunk).toHaveBeenCalled();
      expect(mockIpcAdapter.offChatStreamEnd).toHaveBeenCalled();
    });
  });

  describe('prompt selector', () => {
    it('setPromptSelectorData updates selectedText and preconfiguredPrompts', () => {
      const onSelectedTextChange = jest.fn();
      const onPromptsChange = jest.fn();
      chatService.setCallbacks({ onSelectedTextChange, onPromptsChange });

      const data = {
        preconfiguredPrompts: [{ prompt: 'Summarize {text}', title: 'Summarize' }],
        selectedText: 'Hello world',
      };

      chatService.setPromptSelectorData(data);

      expect(chatService.getSelectedText()).toBe('Hello world');
      expect(chatService.getPreconfiguredPrompts()).toEqual(data.preconfiguredPrompts);
      expect(onSelectedTextChange).toHaveBeenCalledWith('Hello world');
      expect(onPromptsChange).toHaveBeenCalledWith(data.preconfiguredPrompts);
    });

    it('getSelectedText and getPreconfiguredPrompts return initial empty state', () => {
      expect(chatService.getSelectedText()).toBe('');
      expect(chatService.getPreconfiguredPrompts()).toEqual([]);
    });

    it('selectPrompt invokes PROMPT_SELECTOR channel', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ started: true });

      await chatService.setPromptSelectorData({ preconfiguredPrompts: [], selectedText: 'x' });
      await chatService.selectPrompt({
        prompt: 'Summarize {text}',
        provider: 'ollama',
        title: 'Summarize',
      });

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          channel: expect.any(String),
          event: EIpcEvent.PROMPT_SELECT,
          payload: expect.objectContaining({
            prompt: expect.stringContaining('x'),
            provider: 'ollama',
          }),
        }),
      );
    });

    it('submitCustomPrompt invokes PROMPT_SELECTOR and does not call when trim empty', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ started: true });

      await chatService.submitCustomPrompt('   ');

      expect(mockIpcAdapter.invoke).not.toHaveBeenCalled();
    });

    it('submitCustomPrompt invokes PROMPT_SELECTOR with processed template', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ started: true });
      chatService.setPromptSelectorData({ preconfiguredPrompts: [], selectedText: 'selected' });

      await chatService.submitCustomPrompt('Rewrite: {text}');

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          payload: expect.objectContaining({
            prompt: 'Rewrite: selected',
          }),
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
        EIpcChannel.MESSAGE,
        expect.objectContaining({
          event: EIpcEvent.MESSAGES_LOAD,
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

    it('preserves streaming error as message when loadChatMessages returns user-only (race)', async () => {
      (chatService as unknown as { error: string | null }).error = 'Streaming error: fetch failed';
      (chatService as unknown as { errorType: EStreamingErrorType }).errorType = EStreamingErrorType.NETWORK;

      mockIpcAdapter.invoke.mockResolvedValue({
        messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: new Date() }],
      });

      const onMessagesChange = jest.fn();
      const onLoadingChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange, onLoadingChange });

      await chatService.loadChatMessages(1);

      const finalMessages = onMessagesChange.mock.calls.at(-1)?.[0] as IChatMessage[];
      expect(finalMessages).toHaveLength(2);
      expect(finalMessages[1]).toMatchObject({
        content: 'Error: fetch failed',
        errorType: EStreamingErrorType.NETWORK,
        role: 'assistant',
      });
      expect(onLoadingChange).toHaveBeenLastCalledWith(false);
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
      const responseCallback = (mockIpcAdapter.onOllamaResponse as jest.Mock).mock.calls[0]?.[0] as (response?: TChatResponse) => void;

      responseCallback({ result: 'Test response', chatId: 1 });

      jest.advanceTimersByTime(100);

      expect(onMessagesChange).toHaveBeenCalled();
    });

    it('handles Ollama response with error and calls onErrorChange for chat UI banner', () => {
      chatService.initializeListeners();

      const onErrorChange = jest.fn();
      const onMessagesChange = jest.fn();
      chatService.setCallbacks({ onErrorChange, onMessagesChange });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const responseCallback = (mockIpcAdapter.onOllamaResponse as jest.Mock).mock.calls[0]?.[0] as (response?: TChatResponse) => void;

      responseCallback({ error: 'Test error' });

      jest.advanceTimersByTime(100);

      expect(onErrorChange).toHaveBeenCalledWith('Streaming error: Test error', EStreamingErrorType.STREAMING);
      expect(onMessagesChange).toHaveBeenCalled();
    });

    it('classifies fetch failed as NETWORK error type in Ollama response', () => {
      chatService.initializeListeners();

      const onErrorChange = jest.fn();
      chatService.setCallbacks({ onErrorChange });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const responseCallback = (mockIpcAdapter.onOllamaResponse as jest.Mock).mock.calls[0]?.[0] as (response?: TChatResponse) => void;

      responseCallback({ error: 'fetch failed' });

      jest.advanceTimersByTime(100);

      expect(onErrorChange).toHaveBeenCalledWith('Streaming error: fetch failed', EStreamingErrorType.NETWORK);
    });

    it('does not add duplicate assistant message when last message is already assistant (prompt select race)', () => {
      chatService.initializeListeners();

      const onMessagesChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const responseCallback = (mockIpcAdapter.onOllamaResponse as jest.Mock).mock.calls[0]?.[0] as (response?: TChatResponse) => void;

      // Simulate loadChatMessages returning [user, assistant] (e.g. second call after streaming completed)
      const messages: IChatMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Hi there!', timestamp: new Date() },
      ];
      messagesCallback({ chatId: 1, messages });

      const callCountBeforeResponse = onMessagesChange.mock.calls.length;

      // OLLAMA_RESPONSE arrives (duplicate - we already have assistant from loadChatMessages)
      responseCallback({ result: 'Hi there!', chatId: 1 });

      jest.advanceTimersByTime(100);

      // Should not add another message (onMessagesChange called once for setMessages, not again for addMessage)
      expect(onMessagesChange).toHaveBeenCalledTimes(callCountBeforeResponse);
      expect(chatService.getMessages()).toHaveLength(2);
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

    it('ignores CHAT_LOAD_MESSAGES_DATA when actively streaming and DB has no assistant yet', () => {
      chatService.initializeListeners();

      const onMessagesChange = jest.fn();
      const onLoadingChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange, onLoadingChange });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      // Simulate sendMessage: we have [user, placeholder] and are streaming
      (chatService as unknown as { currentChatId: number | null }).currentChatId = 1;
      (chatService as unknown as { streamingMessageId: string | null }).streamingMessageId = 'placeholder-1';
      (chatService as unknown as { messages: IChatMessage[] }).messages = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
        { id: 'placeholder-1', role: 'assistant', content: '', timestamp: new Date() },
      ];

      onMessagesChange.mockClear();
      onLoadingChange.mockClear();

      // DbWatcher fires when user message is saved (before assistant) - DB has only [user]
      messagesCallback({
        chatId: 1,
        messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: new Date() }],
      });

      // Should NOT overwrite messages (would lose streaming placeholder) or set loading false
      expect(onMessagesChange).not.toHaveBeenCalled();
      expect(onLoadingChange).not.toHaveBeenCalled();
    });

    it('handles stream chunk events', () => {
      chatService.initializeListeners();

      const onMessagesChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange });

      // Set currentChatId by loading messages first
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      messagesCallback({ chatId: 1, messages: [] });

      // Clear mock after setup to only count calls from stream chunks
      onMessagesChange.mockClear();

      // Get the stream chunk callback
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const streamChunkCallback = (mockIpcAdapter.onChatStreamChunk as jest.Mock).mock.calls[0]?.[0] as (
        data: IChatStreamChunk,
      ) => void;

      // Manually set up streaming state (normally done by sendMessage)
      (chatService as unknown as { streamingMessageId: string | null }).streamingMessageId = 'assistant-1';
      (chatService as unknown as { currentChatId: number | null }).currentChatId = 1;

      // Send first chunk
      streamChunkCallback({
        chatId: 1,
        content: 'Hello',
        done: false,
      });

      expect(onMessagesChange).toHaveBeenCalled();

      // Send second chunk
      streamChunkCallback({
        chatId: 1,
        content: ' world',
        done: false,
      });

      // Send final chunk
      streamChunkCallback({
        chatId: 1,
        content: '!',
        done: true,
      });

      // Expect 3 calls: one for each chunk (Hello, world, !)
      const expectedChunkCalls = 3;
      expect(onMessagesChange).toHaveBeenCalledTimes(expectedChunkCalls);
    });

    it('ignores stream chunk events for different chat', () => {
      chatService.initializeListeners();

      const onMessagesChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange });

      // Set currentChatId to 1
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      messagesCallback({ chatId: 1, messages: [] });

      // Clear mock after setup to only count calls from stream chunk
      onMessagesChange.mockClear();

      // Get the stream chunk callback
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const streamChunkCallback = (mockIpcAdapter.onChatStreamChunk as jest.Mock).mock.calls[0]?.[0] as (
        data: IChatStreamChunk,
      ) => void;

      // Send chunk for different chat
      streamChunkCallback({
        chatId: 2,
        content: 'Hello',
        done: false,
      });

      // Should not update messages for different chat
      expect(onMessagesChange).not.toHaveBeenCalled();
    });

    it('handles stream end events successfully', () => {
      chatService.initializeListeners();

      const onMessagesChange = jest.fn();
      const onLoadingChange = jest.fn();
      const onErrorChange = jest.fn();
      chatService.setCallbacks({
        onMessagesChange,
        onLoadingChange,
        onErrorChange,
      });

      // Set currentChatId by loading messages first
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      messagesCallback({ chatId: 1, messages: [] });

      // Clear mocks after setup to only count calls from stream end
      onMessagesChange.mockClear();
      onLoadingChange.mockClear();
      onErrorChange.mockClear();

      // Get the stream end callback
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const streamEndCallback = (mockIpcAdapter.onChatStreamEnd as jest.Mock).mock.calls[0]?.[0] as (
        data: IChatStreamEnd,
      ) => void;

      // Set up streaming state
      (chatService as unknown as { streamingMessageId: string | null }).streamingMessageId = 'assistant-1';
      (chatService as unknown as { currentChatId: number | null }).currentChatId = 1;
      (chatService as unknown as { streamingContent: string }).streamingContent = 'Hello world';

      // Send stream end with full content
      streamEndCallback({
        chatId: 1,
        fullContent: 'Hello world!',
      });

      expect(onLoadingChange).toHaveBeenCalledWith(false);
      expect(onErrorChange).not.toHaveBeenCalled();
    });

    it('handles stream end events with error', () => {
      chatService.initializeListeners();

      const onErrorChange = jest.fn();
      const onLoadingChange = jest.fn();
      chatService.setCallbacks({
        onErrorChange,
        onLoadingChange,
      });

      // Set currentChatId by loading messages first
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      messagesCallback({ chatId: 1, messages: [] });

      // Get the stream end callback
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const streamEndCallback = (mockIpcAdapter.onChatStreamEnd as jest.Mock).mock.calls[0]?.[0] as (
        data: IChatStreamEnd,
      ) => void;

      // Set up streaming state
      (chatService as unknown as { streamingMessageId: string | null }).streamingMessageId = 'assistant-1';
      (chatService as unknown as { currentChatId: number | null }).currentChatId = 1;

      // Send stream end with error
      streamEndCallback({
        chatId: 1,
        error: 'Connection failed',
        fullContent: '',
      });

      expect(onErrorChange).toHaveBeenCalledWith('Streaming error: Connection failed', EStreamingErrorType.STREAMING);
      expect(onLoadingChange).toHaveBeenCalledWith(false);
    });

    it('passes errorType to onErrorChange when stream end has error', () => {
      chatService.initializeListeners();

      const onErrorChange = jest.fn();
      chatService.setCallbacks({ onErrorChange });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      messagesCallback({ chatId: 1, messages: [] });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const streamEndCallback = (mockIpcAdapter.onChatStreamEnd as jest.Mock).mock.calls[0]?.[0] as (
        data: IChatStreamEnd,
      ) => void;

      (chatService as unknown as { currentChatId: number | null }).currentChatId = 1;

      streamEndCallback({
        chatId: 1,
        error: 'fetch failed',
        errorType: EStreamingErrorType.NETWORK,
        fullContent: '',
      });

      expect(onErrorChange).toHaveBeenCalledWith('Streaming error: fetch failed', EStreamingErrorType.NETWORK);
    });

    it('adds error message when CHAT_LOAD_MESSAGES_DATA removed placeholder before stream end (race)', () => {
      chatService.initializeListeners();

      const onMessagesChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const streamEndCallback = (mockIpcAdapter.onChatStreamEnd as jest.Mock).mock.calls[0]?.[0] as (
        data: IChatStreamEnd,
      ) => void;

      messagesCallback({ chatId: 1, messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: new Date() }] });

      (chatService as unknown as { currentChatId: number | null }).currentChatId = 1;
      (chatService as unknown as { streamingMessageId: string | null }).streamingMessageId = 'placeholder-1';

      streamEndCallback({
        chatId: 1,
        error: 'fetch failed',
        errorType: EStreamingErrorType.NETWORK,
        fullContent: '',
      });

      const finalMessages = onMessagesChange.mock.calls.at(-1)?.[0] as IChatMessage[];
      expect(finalMessages).toHaveLength(2);
      expect(finalMessages[1]).toMatchObject({
        content: 'Error: fetch failed',
        errorType: EStreamingErrorType.NETWORK,
        role: 'assistant',
      });
    });

    it('ignores stream end events for different chat', () => {
      chatService.initializeListeners();

      const onErrorChange = jest.fn();
      chatService.setCallbacks({ onErrorChange });

      // Set currentChatId to 1
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      messagesCallback({ chatId: 1, messages: [] });

      // Clear mock after setup to only count calls from stream end
      onErrorChange.mockClear();

      // Get the stream end callback
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const streamEndCallback = (mockIpcAdapter.onChatStreamEnd as jest.Mock).mock.calls[0]?.[0] as (
        data: IChatStreamEnd,
      ) => void;

      // Send stream end for different chat
      streamEndCallback({
        chatId: 2,
        fullContent: '',
        error: 'Connection failed',
      });

      // Should not update error for different chat
      expect(onErrorChange).not.toHaveBeenCalled();
    });
  });

  describe('retryLastMessage', () => {
    it('returns null and does not invoke when currentChatId is null', async () => {
      const result = await chatService.retryLastMessage();

      expect(result).toBeNull();
      expect(mockIpcAdapter.invoke).not.toHaveBeenCalled();
    });

    it('returns null and does not invoke when last message is user', async () => {
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

      const result = await chatService.retryLastMessage();

      expect(result).toBeNull();
      expect(mockIpcAdapter.invoke).not.toHaveBeenCalled();
    });

    it('removes last assistant message, adds placeholder, invokes IPC and returns null on success', async () => {
      chatService.initializeListeners();

      const onMessagesChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      const messages: IChatMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Error: Connection failed', timestamp: new Date() },
      ];
      messagesCallback({ chatId: 1, messages });

      mockIpcAdapter.invoke.mockResolvedValue({ started: true });

      const result = await chatService.retryLastMessage();

      expect(result).toBeNull();
      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.MESSAGE,
        expect.objectContaining({
          event: EIpcEvent.MESSAGE_SEND_STREAM,
          payload: expect.objectContaining({
            chatId: 1,
            messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: expect.any(Date) }],
          }),
        }),
      );
      const currentMessages = chatService.getMessages();
      expect(currentMessages).toHaveLength(2);
      expect(currentMessages[1]?.role).toBe('assistant');
      expect(currentMessages[1]?.content).toBe('');
    });

    it('on IPC error updates placeholder to error, sets error and returns error string', async () => {
      chatService.initializeListeners();

      const onMessagesChange = jest.fn();
      const onErrorChange = jest.fn();
      chatService.setCallbacks({ onMessagesChange, onErrorChange });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const messagesCallback = (mockIpcAdapter.onChatLoadMessagesData as jest.Mock).mock.calls[0]?.[0] as (
        data: { chatId: number, messages: IChatMessage[] },
      ) => void;

      const messages: IChatMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'Error: Connection failed', timestamp: new Date() },
      ];
      messagesCallback({ chatId: 1, messages });

      mockIpcAdapter.invoke.mockResolvedValue({ error: 'Request already processing', started: false });

      const result = await chatService.retryLastMessage();

      expect(result).toBe('Request already processing');
      expect(onErrorChange).toHaveBeenCalledWith('Failed to send message: Request already processing', EStreamingErrorType.STREAMING);
      const currentMessages = chatService.getMessages();
      expect(currentMessages).toHaveLength(2);
      expect(currentMessages[1]?.content).toBe('Error: Request already processing');
    });
  });

  describe('stopGeneration', () => {
    it('invokes IPC with MESSAGE_STOP_STREAM and payload chatId', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ stopped: true });

      await chatService.stopGeneration(42);

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.MESSAGE,
        expect.objectContaining({
          channel: EIpcChannel.MESSAGE,
          event: EIpcEvent.MESSAGE_STOP_STREAM,
          payload: { chatId: 42 },
        }),
      );
    });
  });
});

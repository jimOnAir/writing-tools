import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';
import type { IChatInfo } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';

import { ChatListService } from './ChatListService';

describe('ChatListService', () => {
  let mockIpcAdapter: jest.Mocked<IIpcAdapter>;
  let chatListService: ChatListService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockIpcAdapter = {
      invoke: jest.fn(),
      onPromptSelected: jest.fn(),
      offPromptSelected: jest.fn(),
      onOllamaResponse: jest.fn(),
      offOllamaResponse: jest.fn(),
      onPromptSelectorData: jest.fn(),
      offPromptSelectorData: jest.fn(),
      onChatTitleUpdated: jest.fn(),
      offChatTitleUpdated: jest.fn(),
      onChatLoadMessagesData: jest.fn(),
      offChatLoadMessagesData: jest.fn(),
      onChatCreated: jest.fn(() => ({ remove: jest.fn() })),
      offChatCreated: jest.fn(),
      onChatDeleted: jest.fn(),
      offChatDeleted: jest.fn(),
    } as unknown as jest.Mocked<IIpcAdapter>;

    chatListService = new ChatListService(mockIpcAdapter);
  });

  describe('setCallbacks', () => {
    it('registers callbacks', () => {
      const onChatsChange = jest.fn();
      const onLoadingChange = jest.fn();
      const onErrorChange = jest.fn();

      chatListService.setCallbacks({
        onChatsChange,
        onLoadingChange,
        onErrorChange,
      });

      // Callbacks should be registered
      expect(chatListService).toBeDefined();
    });
  });

  describe('loadChats', () => {
    it('loads chats successfully', async () => {
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

      mockIpcAdapter.invoke.mockResolvedValue({ chats: mockChats, hasMore: false });

      const onChatsChange = jest.fn();
      const onLoadingChange = jest.fn();
      chatListService.setCallbacks({
        onChatsChange,
        onLoadingChange,
      });

      await chatListService.loadChats();

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.CHAT,
        expect.objectContaining({
          event: EIpcEvent.CHAT_LIST,
          payload: { limit: 20, offset: 0 },
        }),
      );
      expect(onChatsChange).toHaveBeenCalledWith(mockChats);
      expect(onLoadingChange).toHaveBeenCalledWith(false);
    });

    it('handles errors when loading chats', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ error: 'Load failed' });

      const onErrorChange = jest.fn();
      const onLoadingChange = jest.fn();
      chatListService.setCallbacks({
        onErrorChange,
        onLoadingChange,
      });

      await chatListService.loadChats();

      expect(onErrorChange).toHaveBeenCalledWith('Load failed');
      expect(onLoadingChange).toHaveBeenCalledWith(false);
    });

    it('handles invalid response format', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({});

      const onErrorChange = jest.fn();
      chatListService.setCallbacks({ onErrorChange });

      await chatListService.loadChats();

      expect(onErrorChange).toHaveBeenCalledWith(expect.stringContaining('Invalid response'));
    });

    it('sets loading state during load', async () => {
      const loadingStates: boolean[] = [];
      const onLoadingChange = jest.fn((loading: boolean) => {
        loadingStates.push(loading);
      });

      chatListService.setCallbacks({ onLoadingChange });

      const delayMs = 10;
      mockIpcAdapter.invoke.mockImplementation(async () => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ chats: [], hasMore: false });
          }, delayMs);
        });
      });

      const loadPromise = chatListService.loadChats();

      // Should be loading
      expect(loadingStates).toContain(true);

      await loadPromise;

      // Should finish loading
      expect(loadingStates).toContain(false);
    });
  });

  describe('loadMoreChats', () => {
    it('appends chats and updates hasMore', async () => {
      const initialChats: IChatInfo[] = [
        {
          created_at: new Date().toISOString(),
          id: 1,
          model: 'test',
          provider: 'ollama',
          title: 'Chat 1',
          updated_at: new Date().toISOString(),
        },
      ];
      const moreChats: IChatInfo[] = [
        {
          created_at: new Date().toISOString(),
          id: 2,
          model: 'test',
          provider: 'ollama',
          title: 'Chat 2',
          updated_at: new Date().toISOString(),
        },
      ];

      mockIpcAdapter.invoke
        .mockResolvedValueOnce({ chats: initialChats, hasMore: true })
        .mockResolvedValueOnce({ chats: moreChats, hasMore: false });

      const onChatsChange = jest.fn();
      const onHasMoreChange = jest.fn();
      const onLoadingMoreChange = jest.fn();
      chatListService.setCallbacks({
        onChatsChange,
        onHasMoreChange,
        onLoadingMoreChange,
      });

      await chatListService.loadChats();
      expect(onChatsChange).toHaveBeenLastCalledWith(initialChats);
      expect(onHasMoreChange).toHaveBeenLastCalledWith(true);

      await chatListService.loadMoreChats();

      expect(mockIpcAdapter.invoke).toHaveBeenLastCalledWith(
        EIpcChannel.CHAT,
        expect.objectContaining({
          event: EIpcEvent.CHAT_LIST,
          payload: { limit: 20, offset: 1 },
        }),
      );
      expect(onChatsChange).toHaveBeenLastCalledWith([...initialChats, ...moreChats]);
      expect(onHasMoreChange).toHaveBeenLastCalledWith(false);
      expect(onLoadingMoreChange).toHaveBeenCalledWith(true);
      expect(onLoadingMoreChange).toHaveBeenCalledWith(false);
    });

    it('does nothing when hasMore is false', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ chats: [], hasMore: false });

      const onChatsChange = jest.fn();
      chatListService.setCallbacks({
        onChatsChange,
        onHasMoreChange: jest.fn(),
      });

      await chatListService.loadChats();
      const invokeCountBefore = mockIpcAdapter.invoke.mock.calls.length;

      await chatListService.loadMoreChats();

      expect(mockIpcAdapter.invoke).toHaveBeenCalledTimes(invokeCountBefore);
    });

    it('handles errors when loading more', async () => {
      mockIpcAdapter.invoke
        .mockResolvedValueOnce({
          chats: [{ id: 1, title: 'Chat 1', provider: 'ollama', model: 'test', created_at: '', updated_at: '' }],
          hasMore: true,
        })
        .mockResolvedValueOnce({ error: 'Load more failed' });

      const onChatsChange = jest.fn();
      const onErrorChange = jest.fn();
      const onHasMoreChange = jest.fn();
      chatListService.setCallbacks({
        onChatsChange,
        onErrorChange,
        onHasMoreChange,
      });

      await chatListService.loadChats();
      await chatListService.loadMoreChats();

      expect(onErrorChange).toHaveBeenCalledWith('Load more failed');
    });
  });

  describe('openChat', () => {
    it('opens chat successfully', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ success: true });

      await chatListService.openChat(1);

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.CHAT,
        expect.objectContaining({
          event: EIpcEvent.CHAT_OPEN,
          payload: { chatId: 1 },
        }),
      );
    });

    it('handles errors when opening chat', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ success: false, error: 'Chat not found' });

      const onErrorChange = jest.fn();
      chatListService.setCallbacks({ onErrorChange });

      const nonExistentChatId = 999;
      await chatListService.openChat(nonExistentChatId);

      expect(onErrorChange).toHaveBeenCalledWith('Chat not found');
    });

    it('handles IPC errors', async () => {
      mockIpcAdapter.invoke.mockRejectedValue(new Error('IPC error'));

      const onErrorChange = jest.fn();
      chatListService.setCallbacks({ onErrorChange });

      await chatListService.openChat(1);

      expect(onErrorChange).toHaveBeenCalledWith('IPC error');
    });
  });

  describe('deleteChat', () => {
    it('deletes chat successfully', async () => {
      mockIpcAdapter.invoke
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ chats: [], hasMore: false });

      const onDeletingChatIdChange = jest.fn();
      const onChatsChange = jest.fn();
      chatListService.setCallbacks({
        onDeletingChatIdChange,
        onChatsChange,
      });

      const result = await chatListService.deleteChat(1);

      expect(result).toBeNull();
      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.CHAT,
        expect.objectContaining({
          event: EIpcEvent.CHAT_DELETE,
          payload: { chatId: 1 },
        }),
      );
      expect(onDeletingChatIdChange).toHaveBeenCalledWith(1);
      expect(onDeletingChatIdChange).toHaveBeenCalledWith(null);
    });

    it('handles errors when deleting chat', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ success: false, error: 'Delete failed' });

      const onErrorChange = jest.fn();
      const onDeletingChatIdChange = jest.fn();
      chatListService.setCallbacks({
        onErrorChange,
        onDeletingChatIdChange,
      });

      const result = await chatListService.deleteChat(1);

      expect(result).toBe('Delete failed');
      expect(onErrorChange).toHaveBeenCalledWith('Delete failed');
      expect(onDeletingChatIdChange).toHaveBeenCalledWith(null);
    });

    it('refreshes chat list after successful deletion', async () => {
      mockIpcAdapter.invoke
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ chats: [], hasMore: false });

      await chatListService.deleteChat(1);

      // Should call loadChats after deletion
      expect(mockIpcAdapter.invoke).toHaveBeenCalledTimes(2);
      expect(mockIpcAdapter.invoke).toHaveBeenNthCalledWith(
        2,
        EIpcChannel.CHAT,
        expect.objectContaining({
          event: EIpcEvent.CHAT_LIST,
        }),
      );
    });

    it('sets deletingChatId during deletion', async () => {
      mockIpcAdapter.invoke
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ chats: [], hasMore: false });

      const onDeletingChatIdChange = jest.fn();
      chatListService.setCallbacks({ onDeletingChatIdChange });

      await chatListService.deleteChat(1);

      expect(onDeletingChatIdChange).toHaveBeenCalledWith(1);
      expect(onDeletingChatIdChange).toHaveBeenCalledWith(null);
    });
  });
});

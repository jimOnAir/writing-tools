import type { IChatInfo } from '@writing-tools/shared';

import { ChatService } from './ChatService';
import type { IChatRepository } from './IChatRepository';

describe('ChatService', () => {
  let mockRepository: jest.Mocked<IChatRepository>;
  let chatService: ChatService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = {
      close: jest.fn(),
      createChat: jest.fn(),
      deleteChat: jest.fn(),
      getAllChats: jest.fn(),
      getChat: jest.fn(),
      getChatMessages: jest.fn(),
      saveMessage: jest.fn(),
      updateChatTitle: jest.fn(),
    } as unknown as jest.Mocked<IChatRepository>;

    chatService = new ChatService(mockRepository);
  });

  describe('startNewChat', () => {
    it('creates a new chat', () => {
      mockRepository.createChat.mockReturnValue(1);

      const chatId = chatService.startNewChat('Test Chat', 'ollama', 'model');

      expect(mockRepository.createChat).toHaveBeenCalledWith('Test Chat', 'ollama', 'model');
      expect(chatId).toBe(1);
    });
  });

  describe('getAllChats', () => {
    it('returns all chats', () => {
      const mockChats: IChatInfo[] = [
        {
          created_at: '2024-01-01T00:00:00.000Z',
          id: 1,
          model: 'test',
          provider: 'ollama',
          title: 'Chat 1',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockRepository.getAllChats.mockReturnValue(mockChats);

      const chats = chatService.getAllChats();

      expect(mockRepository.getAllChats).toHaveBeenCalled();
      expect(chats).toEqual(mockChats);
    });
  });

  describe('getChat', () => {
    it('returns chat when found', () => {
      const mockChat: IChatInfo = {
        created_at: '2024-01-01T00:00:00.000Z',
        id: 1,
        model: 'test',
        provider: 'ollama',
        title: 'Test Chat',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockRepository.getChat.mockReturnValue(mockChat);

      const chat = chatService.getChat(1);

      expect(mockRepository.getChat).toHaveBeenCalledWith(1);
      expect(chat).toEqual(mockChat);
    });

    it('returns null when chat not found', () => {
      const nonExistentChatId = 999;
      mockRepository.getChat.mockReturnValue(null);

      const chat = chatService.getChat(nonExistentChatId);

      expect(chat).toBeNull();
    });
  });

  describe('updateChatTitle', () => {
    it('updates chat title', () => {
      chatService.updateChatTitle(1, 'New Title');

      expect(mockRepository.updateChatTitle).toHaveBeenCalledWith(1, 'New Title');
    });
  });

  describe('deleteChat', () => {
    it('deletes a chat', () => {
      chatService.deleteChat(1);

      expect(mockRepository.deleteChat).toHaveBeenCalledWith(1);
    });
  });
});

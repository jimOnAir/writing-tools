import type { IChatInfo, IChatMessage, ILogger } from '@writing-tools/shared';

import type { IModelService } from '../llm/IModelService';
import type { IOpenTabsRepository } from '../open-tabs/IOpenTabsRepository';
import type { IWindowService } from '../windows/IWindowService';

import { ChatService } from './ChatService';
import type { IChatRepository } from './IChatRepository';

describe('ChatService', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let mockModelService: jest.Mocked<IModelService>;
  let mockOpenTabsRepository: jest.Mocked<IOpenTabsRepository>;
  let mockRepository: jest.Mocked<IChatRepository>;
  let mockWindowService: jest.Mocked<IWindowService>;
  let chatService: ChatService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockRepository = {
      close: jest.fn(),
      createChat: jest.fn(),
      deleteChat: jest.fn(),
      getAllChats: jest.fn(),
      getChat: jest.fn(),
      getChatMessages: jest.fn(),
      initialize: jest.fn().mockResolvedValue(undefined),
      saveMessage: jest.fn(),
      updateChatTitle: jest.fn(),
    } as unknown as jest.Mocked<IChatRepository>;

    mockModelService = {
      fetchModels: jest.fn(),
      sendMessages: jest.fn(),
    } as unknown as jest.Mocked<IModelService>;

    mockWindowService = {
      getMainWindow: jest.fn(),
    } as unknown as jest.Mocked<IWindowService>;

    mockOpenTabsRepository = {
      clearOpenTabs: jest.fn(),
      deleteTabsByChatId: jest.fn(),
      loadOpenTabs: jest.fn(),
      saveOpenTabs: jest.fn(),
    } as unknown as jest.Mocked<IOpenTabsRepository>;

    chatService = new ChatService(mockRepository, mockModelService, mockWindowService, mockLogger, mockOpenTabsRepository);
  });

  describe('initialize', () => {
    it('initializes the repository', async () => {
      await chatService.initialize();

      expect(mockRepository.initialize).toHaveBeenCalled();
    });
  });

  describe('startNewChat', () => {
    it('creates a new chat', () => {
      mockRepository.createChat.mockReturnValue(1);

      const chatId = chatService.startNewChat('Test Chat', 'ollama', 'model');

      expect(mockRepository.createChat).toHaveBeenCalledWith('Test Chat', 'ollama', 'model');
      expect(chatId).toBe(1);
    });
  });

  describe('saveMessage', () => {
    it('saves a message to a chat', () => {
      const message: IChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      chatService.saveMessage(1, message);

      expect(mockRepository.saveMessage).toHaveBeenCalledWith(1, message);
    });
  });

  describe('loadChatMessages', () => {
    it('loads messages for a chat', () => {
      const mockMessages: IChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      mockRepository.getChatMessages.mockReturnValue(mockMessages);

      const messages = chatService.loadChatMessages(1);

      expect(mockRepository.getChatMessages).toHaveBeenCalledWith(1);
      expect(messages).toEqual(mockMessages);
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

    it('removes open_tabs entries for the deleted chat', () => {
      chatService.deleteChat(1);

      expect(mockOpenTabsRepository.deleteTabsByChatId).toHaveBeenCalledWith(1);
    });

    it('does not affect open_tabs entries for other chats', () => {
      chatService.deleteChat(1);

      expect(mockOpenTabsRepository.deleteTabsByChatId).toHaveBeenCalledWith(1);
      expect(mockOpenTabsRepository.deleteTabsByChatId).not.toHaveBeenCalledWith(2);
    });

    it('does not affect open_tabs entries with null chatId', () => {
      chatService.deleteChat(1);

      // deleteTabsByChatId should only be called with the deleted chatId
      expect(mockOpenTabsRepository.deleteTabsByChatId).toHaveBeenCalledTimes(1);
      expect(mockOpenTabsRepository.deleteTabsByChatId).toHaveBeenCalledWith(1);
    });
  });

  describe('close', () => {
    it('closes the repository', () => {
      chatService.close();

      expect(mockRepository.close).toHaveBeenCalled();
    });
  });

  describe('generateChatTitle', () => {
    it('generates chat title successfully', async () => {
      mockModelService.sendMessages.mockResolvedValue({
        response: 'Test Title',
        success: true,
      });

      const title = await chatService.generateChatTitle('User message', 'Assistant response');

      expect(title).toBe('Test Title');
      expect(mockModelService.sendMessages).toHaveBeenCalled();
    });

    it('removes quotes from title', async () => {
      mockModelService.sendMessages.mockResolvedValue({
        response: '"Quoted Title"',
        success: true,
      });

      const title = await chatService.generateChatTitle('User', 'Assistant');

      expect(title).toBe('Quoted Title');
    });

    it('does not truncate long titles', async () => {
      const longTitleLength = 150;
      const longTitle = 'A'.repeat(longTitleLength);
      mockModelService.sendMessages.mockResolvedValue({
        response: longTitle,
        success: true,
      });

      const title = await chatService.generateChatTitle('User', 'Assistant');

      expect(title?.length).toBe(longTitleLength);
      expect(title).not.toContain('...');
    });

    it('returns null on error', async () => {
      mockModelService.sendMessages.mockResolvedValue({
        error: 'Generation failed',
        success: false,
      });

      const title = await chatService.generateChatTitle('User', 'Assistant');

      expect(title).toBeNull();
    });

    it('handles exceptions', async () => {
      mockModelService.sendMessages.mockRejectedValue(new Error('Network error'));

      const title = await chatService.generateChatTitle('User', 'Assistant');

      expect(title).toBeNull();
    });
  });
});

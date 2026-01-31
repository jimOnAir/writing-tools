/// <reference types="jest" />

import type { IChatInfo, ILogger } from '@writing-tools/shared';
import * as fs from 'node:fs/promises';

import { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';

import { ChatRepository } from './ChatRepository';

// Mock DatabaseConnection
const mockDrizzleDb = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockDatabaseConnection = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn().mockReturnValue(mockDrizzleDb),
  getRawDatabase: jest.fn(),
  close: jest.fn(),
};

jest.mock('../../infrastructure/database/DatabaseConnection', () => ({
  DatabaseConnection: jest.fn().mockImplementation(() => mockDatabaseConnection),
}));

// Mock fs/promises
jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
}));

describe('ChatRepository', () => {
  let chatIdCounter: number;
  let mockLogger: jest.Mocked<ILogger>;
  let repository: ChatRepository;
  let dbConnection: DatabaseConnection;
  const testAppPath = '/tmp/test-app-data';

  beforeEach(() => {
    jest.clearAllMocks();
    chatIdCounter = 1;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    // Reset DatabaseConnection mock
    mockDatabaseConnection.initialize.mockReset();
    mockDatabaseConnection.initialize.mockResolvedValue(undefined);
    mockDatabaseConnection.getDatabase.mockReset();
    mockDatabaseConnection.getDatabase.mockReturnValue(mockDrizzleDb);
    mockDatabaseConnection.close.mockReset();

    // Mock fs operations
    (fs.access as jest.MockedFunction<typeof fs.access>).mockResolvedValue(undefined);
    (fs.mkdir as jest.MockedFunction<typeof fs.mkdir>).mockResolvedValue(undefined);

    // Reset Drizzle mocks
    mockDrizzleDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue({ id: chatIdCounter++ }),
        }),
        onConflictDoNothing: jest.fn().mockReturnValue({
          run: jest.fn(),
        }),
      }),
    });

    mockDrizzleDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([]),
          }),
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockReturnValue(undefined),
          }),
        }),
        orderBy: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue([]),
        }),
      }),
    });

    mockDrizzleDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          run: jest.fn(),
        }),
      }),
    });

    mockDrizzleDb.delete.mockReturnValue({
      where: jest.fn().mockReturnValue({
        run: jest.fn(),
      }),
    });

    // Create new repository with mocked DatabaseConnection
    dbConnection = new DatabaseConnection(mockLogger, testAppPath);
    repository = new ChatRepository(dbConnection);
  });

  describe('createChat', () => {
    it('creates a new chat and returns chat ID', () => {
      const chatId = repository.createChat('Test Chat', 'ollama', 'test-model');

      expect(chatId).toBeGreaterThan(0);
      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(dbConnection);
      mockDatabaseConnection.getDatabase.mockImplementationOnce(() => {
        throw new Error('Database not initialized');
      });

      expect(() => {
        uninitializedRepo.createChat('Test', 'ollama', 'model');
      }).toThrow('Database not initialized');
    });

    it('creates chat with empty title', () => {
      const chatId = repository.createChat('', 'ollama', 'model');

      expect(chatId).toBeGreaterThan(0);
    });
  });

  describe('getAllChats', () => {
    it('returns all chats ordered by updated_at DESC', () => {
      const mockChats: IChatInfo[] = [
        {
          id: 2,
          title: 'Chat 2',
          provider: 'ollama',
          model: 'test',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 1,
          title: 'Chat 1',
          provider: 'ollama',
          model: 'test',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockDrizzleDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue(mockChats),
          }),
        }),
      });

      const chats = repository.getAllChats();
      expect(chats).toEqual(mockChats);
    });

    it('returns empty array when no chats exist', () => {
      const chats = repository.getAllChats();
      expect(chats).toEqual([]);
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(dbConnection);
      mockDatabaseConnection.getDatabase.mockImplementationOnce(() => {
        throw new Error('Database not initialized');
      });

      expect(() => {
        uninitializedRepo.getAllChats();
      }).toThrow('Database not initialized');
    });
  });

  describe('getChat', () => {
    it('returns chat when found', () => {
      const chatId = 1;
      const mockChat: IChatInfo = {
        id: chatId,
        title: 'Test Chat',
        provider: 'ollama',
        model: 'test',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockDrizzleDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              get: jest.fn().mockReturnValue(mockChat),
            }),
          }),
        }),
      });

      const chat = repository.getChat(chatId);

      expect(chat).toEqual(mockChat);
      expect(chat?.id).toBe(chatId);
      expect(chat?.title).toBe('Test Chat');
    });

    it('returns null when chat not found', () => {
      const nonExistentChatId = 99999;
      const chat = repository.getChat(nonExistentChatId);

      expect(chat).toBeNull();
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(dbConnection);
      mockDatabaseConnection.getDatabase.mockImplementationOnce(() => {
        throw new Error('Database not initialized');
      });

      expect(() => {
        uninitializedRepo.getChat(1);
      }).toThrow('Database not initialized');
    });
  });

  describe('updateChatTitle', () => {
    it('updates chat title', () => {
      const chatId = 1;

      repository.updateChatTitle(chatId, 'New Title');

      expect(mockDrizzleDb.update).toHaveBeenCalled();
    });

    it('updates updated_at timestamp', () => {
      const chatId = 1;

      repository.updateChatTitle(chatId, 'Updated Title');

      expect(mockDrizzleDb.update).toHaveBeenCalled();
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(dbConnection);
      mockDatabaseConnection.getDatabase.mockImplementationOnce(() => {
        throw new Error('Database not initialized');
      });

      expect(() => {
        uninitializedRepo.updateChatTitle(1, 'New Title');
      }).toThrow('Database not initialized');
    });
  });

  describe('updateChatModel', () => {
    it('updates chat model and provider', () => {
      const chatId = 1;

      repository.updateChatModel(chatId, 'new-model', 'lmstudio');

      expect(mockDrizzleDb.update).toHaveBeenCalled();
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(dbConnection);
      mockDatabaseConnection.getDatabase.mockImplementationOnce(() => {
        throw new Error('Database not initialized');
      });

      expect(() => {
        uninitializedRepo.updateChatModel(1, 'model', 'ollama');
      }).toThrow('Database not initialized');
    });
  });

  describe('deleteChat', () => {
    it('deletes chat and associated messages', () => {
      const chatId = 1;

      repository.deleteChat(chatId);

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(dbConnection);
      mockDatabaseConnection.getDatabase.mockImplementationOnce(() => {
        throw new Error('Database not initialized');
      });

      expect(() => {
        uninitializedRepo.deleteChat(1);
      }).toThrow('Database not initialized');
    });
  });
});

/// <reference types="jest" />

import type { IChatInfo, IChatMessage, ILogger } from '@writing-tools/shared';
import * as fs from 'node:fs/promises';

import { ChatRepository } from './ChatRepository';

// Mock better-sqlite3-multiple-ciphers
const mockStmt = {
  run: jest.fn().mockReturnValue({ lastInsertRowid: 1 }),
  get: jest.fn(),
  all: jest.fn().mockReturnValue([]),
};

const mockDatabase = {
  prepare: jest.fn().mockReturnValue(mockStmt),
  exec: jest.fn(),
  close: jest.fn(),
};

jest.mock('better-sqlite3-multiple-ciphers', () => {
  return jest.fn().mockImplementation(() => mockDatabase);
});

// Mock fs/promises
jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
}));

describe('ChatRepository', () => {
  let chatIdCounter: number;
  let mockLogger: jest.Mocked<ILogger>;
  let repository: ChatRepository;
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

    // Mock fs operations
    (fs.access as jest.MockedFunction<typeof fs.access>).mockResolvedValue(undefined);
    (fs.mkdir as jest.MockedFunction<typeof fs.mkdir>).mockResolvedValue(undefined);

    // Setup database mocks
    mockDatabase.prepare.mockImplementation((query: string) => {
      if (query.includes('sqlite_master')) {
        return {
          get: jest.fn().mockReturnValue(undefined), // Table doesn't exist
        };
      }

      return mockStmt;
    });
    mockDatabase.exec.mockReturnValue(undefined);
    mockStmt.run.mockImplementation(() => {
      const result = { lastInsertRowid: chatIdCounter++ };

      return result;
    });
    mockStmt.get.mockReturnValue(undefined);
    mockStmt.all.mockReturnValue([]);

    // Create new repository (this will use the mocked Database)
    repository = new ChatRepository(mockLogger, testAppPath);
  });

  afterEach(() => {
    repository.close();
  });

  describe('initialize', () => {
    it('creates database and tables', async () => {
      await repository.initialize();

      expect(mockDatabase.exec).toHaveBeenCalled();
    });

    it('creates directory if it does not exist', async () => {
      (fs.access as jest.MockedFunction<typeof fs.access>).mockRejectedValue(new Error('Directory does not exist'));
      (fs.mkdir as jest.MockedFunction<typeof fs.mkdir>).mockResolvedValue(undefined);

      await repository.initialize();

      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('handles initialization errors', async () => {
      (fs.access as jest.MockedFunction<typeof fs.access>).mockRejectedValue(new Error('Directory does not exist'));
      (fs.mkdir as jest.MockedFunction<typeof fs.mkdir>).mockRejectedValue(new Error('Permission denied'));

      await expect(repository.initialize()).rejects.toThrow();
    });
  });

  describe('createChat', () => {
    beforeEach(async () => {
      await repository.initialize();
    });

    it('creates a new chat and returns chat ID', () => {
      const chatId = repository.createChat('Test Chat', 'ollama', 'test-model');

      expect(chatId).toBeGreaterThan(0);
      const prepareCalls = mockDatabase.prepare.mock.calls as unknown[][];
      const insertCall: unknown[] | undefined = prepareCalls.find((call: unknown[]) => {
        const query = call[0] as string;

        return typeof query === 'string' && query.includes('INSERT INTO chats');
      });
      expect(insertCall).toBeDefined();
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(mockLogger, testAppPath);

      expect(() => {
        uninitializedRepo.createChat('Test', 'ollama', 'model');
      }).toThrow('Database not initialized');
    });

    it('creates chat with empty title', () => {
      const chatId = repository.createChat('', 'ollama', 'model');

      expect(chatId).toBeGreaterThan(0);
    });
  });

  describe('saveMessage', () => {
    beforeEach(async () => {
      await repository.initialize();
    });

    it('saves a message to a chat', () => {
      const chatId = 1;
      const message: IChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      repository.saveMessage(chatId, message);

      const prepareCalls = mockDatabase.prepare.mock.calls as unknown[][];
      const insertCall: unknown[] | undefined = prepareCalls.find((call: unknown[]) => {
        const query = call[0] as string;

        return typeof query === 'string' && query.includes('INSERT OR IGNORE INTO messages');
      });
      expect(insertCall).toBeDefined();
    });

    it('updates chat updated_at timestamp when saving message', () => {
      const chatId = 1;
      const message: IChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      repository.saveMessage(chatId, message);

      const prepareCalls = mockDatabase.prepare.mock.calls as unknown[][];
      const updateCall: unknown[] | undefined = prepareCalls.find((call: unknown[]) => {
        const query = call[0] as string;

        return typeof query === 'string' && query.includes('UPDATE chats SET updated_at');
      });
      expect(updateCall).toBeDefined();
    });

    it('handles duplicate messages gracefully', () => {
      const chatId = 1;
      const message: IChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      repository.saveMessage(chatId, message);
      repository.saveMessage(chatId, message); // Save again

      const prepareCalls = mockDatabase.prepare.mock.calls as unknown[][];
      const insertCall: unknown[] | undefined = prepareCalls.find((call: unknown[]) => {
        const query = call[0] as string;

        return typeof query === 'string' && query.includes('INSERT OR IGNORE');
      });
      expect(insertCall).toBeDefined();
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(mockLogger, testAppPath);

      const message: IChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      };

      expect(() => {
        uninitializedRepo.saveMessage(1, message);
      }).toThrow('Database not initialized');
    });
  });

  describe('getChatMessages', () => {
    beforeEach(async () => {
      await repository.initialize();
    });

    it('returns messages in chronological order', () => {
      const chatId = 1;
      const mockMessages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'First',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Second',
          timestamp: '2024-01-01T00:01:00.000Z',
        },
      ];

      mockDatabase.prepare.mockImplementation(() => ({
        all: jest.fn().mockReturnValue(mockMessages),
      }));

      const messages = repository.getChatMessages(chatId);
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('msg-1');
      expect(messages[1].id).toBe('msg-2');
    });

    it('returns empty array for chat with no messages', () => {
      const chatId = 1;
      mockDatabase.prepare.mockImplementation(() => ({
        all: jest.fn().mockReturnValue([]),
      }));

      const messages = repository.getChatMessages(chatId);
      expect(messages).toEqual([]);
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(mockLogger, testAppPath);

      expect(() => {
        uninitializedRepo.getChatMessages(1);
      }).toThrow('Database not initialized');
    });
  });

  describe('getAllChats', () => {
    beforeEach(async () => {
      await repository.initialize();
    });

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

      mockDatabase.prepare.mockImplementation((query: string) => {
        if (query.includes('ORDER BY updated_at DESC')) {
          return {
            all: jest.fn().mockReturnValue(mockChats),
          };
        }

        return {
          all: jest.fn().mockReturnValue([]),
        };
      });

      const chats = repository.getAllChats();
      expect(chats).toEqual(mockChats);
    });

    it('returns empty array when no chats exist', () => {
      mockDatabase.prepare.mockImplementation(() => ({
        all: jest.fn().mockReturnValue([]),
      }));

      const chats = repository.getAllChats();
      expect(chats).toEqual([]);
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(mockLogger, testAppPath);

      expect(() => {
        uninitializedRepo.getAllChats();
      }).toThrow('Database not initialized');
    });
  });

  describe('getChat', () => {
    beforeEach(async () => {
      await repository.initialize();
    });

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

      mockDatabase.prepare.mockImplementation(() => ({
        get: jest.fn().mockReturnValue(mockChat),
      }));

      const chat = repository.getChat(chatId);

      expect(chat).toEqual(mockChat);
      expect(chat?.id).toBe(chatId);
      expect(chat?.title).toBe('Test Chat');
    });

    it('returns null when chat not found', () => {
      mockDatabase.prepare.mockImplementation(() => ({
        get: jest.fn().mockReturnValue(undefined),
      }));

      const nonExistentChatId = 99999;
      const chat = repository.getChat(nonExistentChatId);

      expect(chat).toBeNull();
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(mockLogger, testAppPath);

      expect(() => {
        uninitializedRepo.getChat(1);
      }).toThrow('Database not initialized');
    });
  });

  describe('updateChatTitle', () => {
    beforeEach(async () => {
      await repository.initialize();
    });

    it('updates chat title', () => {
      const chatId = 1;

      repository.updateChatTitle(chatId, 'New Title');

      const prepareCalls = mockDatabase.prepare.mock.calls as unknown[][];
      const updateCall: unknown[] | undefined = prepareCalls.find((call: unknown[]) => {
        const query = call[0] as string;

        return typeof query === 'string' && query.includes('UPDATE chats');
      });
      expect(updateCall).toBeDefined();
    });

    it('updates updated_at timestamp', () => {
      const chatId = 1;

      repository.updateChatTitle(chatId, 'Updated Title');

      const prepareCalls = mockDatabase.prepare.mock.calls as unknown[][];
      const updateCall: unknown[] | undefined = prepareCalls.find((call: unknown[]) => {
        const query = call[0] as string;

        return typeof query === 'string' && query.includes('UPDATE chats');
      });
      expect(updateCall).toBeDefined();
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(mockLogger, testAppPath);

      expect(() => {
        uninitializedRepo.updateChatTitle(1, 'New Title');
      }).toThrow('Database not initialized');
    });
  });

  describe('deleteChat', () => {
    beforeEach(async () => {
      await repository.initialize();
    });

    it('deletes chat and associated messages', () => {
      const chatId = 1;

      repository.deleteChat(chatId);

      const prepareCalls = mockDatabase.prepare.mock.calls as unknown[][];
      const deleteCall: unknown[] | undefined = prepareCalls.find((call: unknown[]) => {
        const query = call[0] as string;

        return typeof query === 'string' && query.includes('DELETE FROM chats');
      });
      expect(deleteCall).toBeDefined();
    });

    it('throws error when database is not initialized', () => {
      const uninitializedRepo = new ChatRepository(mockLogger, testAppPath);

      expect(() => {
        uninitializedRepo.deleteChat(1);
      }).toThrow('Database not initialized');
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      await repository.initialize();
    });

    it('closes database connection', () => {
      repository.close();

      expect(mockDatabase.close).toHaveBeenCalled();

      // After closing, operations should fail
      expect(() => {
        repository.getAllChats();
      }).toThrow('Database not initialized');
    });

    it('can be called multiple times safely', () => {
      repository.close();
      expect(mockDatabase.close).toHaveBeenCalledTimes(1);

      repository.close(); // Should not throw
      expect(mockDatabase.close).toHaveBeenCalledTimes(1); // Should not call close again
    });
  });
});

/// <reference types="jest" />

import type { ILogger } from '@writing-tools/shared';
import * as fs from 'node:fs/promises';

import { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';

import type { TOpenTab } from './IOpenTabsRepository';
import { OpenTabsRepository } from './OpenTabsRepository';

// Mock DatabaseConnection
const mockDrizzleDb = {
  delete: jest.fn(),
  insert: jest.fn(),
  select: jest.fn(),
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

describe('OpenTabsRepository', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let repository: OpenTabsRepository;
  let dbConnection: DatabaseConnection;
  const testAppPath = '/tmp/test-app-data';

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
    // Mock delete() to support both direct .run() and .where().run() chaining
    const mockDeleteRun = jest.fn().mockReturnValue({ changes: 0 });
    const mockDeleteWhere = jest.fn().mockReturnValue({
      run: jest.fn().mockReturnValue({ changes: 0 }),
    });
    mockDrizzleDb.delete.mockReturnValue({
      run: mockDeleteRun,
      where: mockDeleteWhere,
    });

    mockDrizzleDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        run: jest.fn(),
      }),
    });

    // Support loadOpenTabs: select().from(openTabs).all() and saveOpenTabs: select().from(chats).where().all()
    mockDrizzleDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        all: jest.fn().mockReturnValue([]),
        orderBy: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue([]),
        }),
        where: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue([]),
        }),
      }),
    });

    dbConnection = new DatabaseConnection(mockLogger, testAppPath);
    repository = new OpenTabsRepository(mockLogger, dbConnection);
  });

  describe('saveOpenTabs', () => {
    it('should save tabs to database', () => {
      const tabs: TOpenTab[] = [
        { chatId: 1, tabOrder: 0, isActive: true },
        { chatId: 2, tabOrder: 1, isActive: false },
        { chatId: null, tabOrder: 2, isActive: false },
      ];
      mockDrizzleDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue([]),
          orderBy: jest.fn().mockReturnValue({ all: jest.fn().mockReturnValue([]) }),
          where: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([{ id: 1 }, { id: 2 }]),
          }),
        }),
      });

      repository.saveOpenTabs(tabs);

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
      expect(mockDrizzleDb.insert).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Saved %s open tabs', '3');
    });

    it('should clear existing tabs before saving new ones', () => {
      mockDrizzleDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue([]),
          orderBy: jest.fn().mockReturnValue({ all: jest.fn().mockReturnValue([]) }),
          where: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([{ id: 1 }]),
          }),
        }),
      });
      const tabs: TOpenTab[] = [
        { chatId: 1, tabOrder: 0, isActive: true },
      ];

      repository.saveOpenTabs(tabs);

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it('should handle empty tabs array', () => {
      repository.saveOpenTabs([]);

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
      expect(mockDrizzleDb.insert).not.toHaveBeenCalled();
    });

    it('should convert isActive boolean to integer', () => {
      mockDrizzleDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue([]),
          orderBy: jest.fn().mockReturnValue({ all: jest.fn().mockReturnValue([]) }),
          where: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([{ id: 1 }, { id: 2 }]),
          }),
        }),
      });
      const tabs: TOpenTab[] = [
        { chatId: 1, tabOrder: 0, isActive: true },
        { chatId: 2, tabOrder: 1, isActive: false },
      ];

      const mockValues = jest.fn().mockReturnValue({
        run: jest.fn(),
      });
      mockDrizzleDb.insert.mockReturnValue({
        values: mockValues,
      });

      repository.saveOpenTabs(tabs);

      expect(mockValues).toHaveBeenCalled();
      const valuesCall = mockValues.mock.calls[0][0];

      expect(valuesCall[0].isActive).toBe(1);
      expect(valuesCall[1].isActive).toBe(0);
    });

    it('should skip tabs with non-existent chatId and log warning', () => {
      const mockWhereAll = jest.fn().mockReturnValue([]);
      const mockFrom = jest.fn().mockReturnValue({
        all: jest.fn().mockReturnValue([]),
        orderBy: jest.fn().mockReturnValue({ all: jest.fn().mockReturnValue([]) }),
        where: jest.fn().mockReturnValue({ all: mockWhereAll }),
      });
      mockDrizzleDb.select.mockReturnValue({ from: mockFrom });

      const tabs: TOpenTab[] = [
        { chatId: 1, tabOrder: 0, isActive: true },
        { chatId: 999, tabOrder: 1, isActive: false },
        { chatId: null, tabOrder: 2, isActive: false },
      ];
      // Simulate only chat id 1 exists in DB
      mockWhereAll.mockReturnValueOnce([{ id: 1 }]);

      repository.saveOpenTabs(tabs);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Skipped %s tab(s) with non-existent chatId to avoid FOREIGN KEY violation',
        '1',
      );
      expect(mockDrizzleDb.insert).toHaveBeenCalled();
      const insertedValues = mockDrizzleDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(insertedValues).toHaveLength(2);
      expect(insertedValues.map((v: { chatId: number | null }) => v.chatId)).toEqual([1, null]);
    });
  });

  describe('loadOpenTabs', () => {
    it('should load open tabs and scroll-only rows', () => {
      const mockRows = [
        { chatId: 1, tabOrder: 0, isActive: 1, scrollPosition: 0 },
        { chatId: 2, tabOrder: 1, isActive: 0, scrollPosition: 100 },
        { chatId: null, tabOrder: 2, isActive: 0, scrollPosition: 0 },
        { chatId: 3, tabOrder: -1, isActive: 0, scrollPosition: 200 },
      ];

      mockDrizzleDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue(mockRows),
        }),
      });

      const result = repository.loadOpenTabs();

      expect(result.openTabs).toEqual([
        { chatId: 1, tabOrder: 0, isActive: true, scrollPosition: 0 },
        { chatId: 2, tabOrder: 1, isActive: false, scrollPosition: 100 },
        { chatId: null, tabOrder: 2, isActive: false, scrollPosition: 0 },
      ]);
      expect(result.scrollPositionsByChatId).toEqual({ 3: 200 });
    });

    it('should return empty arrays when no tabs saved', () => {
      mockDrizzleDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue([]),
        }),
      });

      const result = repository.loadOpenTabs();

      expect(result.openTabs).toEqual([]);
      expect(result.scrollPositionsByChatId).toEqual({});
    });

    it('should convert isActive integer to boolean', () => {
      const mockRows = [
        { chatId: 1, tabOrder: 0, isActive: 1, scrollPosition: 0 },
        { chatId: 2, tabOrder: 1, isActive: 0, scrollPosition: 0 },
      ];

      mockDrizzleDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue(mockRows),
        }),
      });

      const result = repository.loadOpenTabs();

      expect(result.openTabs[0].isActive).toBe(true);
      expect(result.openTabs[1].isActive).toBe(false);
    });
  });

  describe('clearOpenTabs', () => {
    it('should delete all tabs from database', () => {
      repository.clearOpenTabs();

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Cleared all open tabs');
    });
  });

  describe('deleteTabsByChatId', () => {
    it('should delete tabs with matching chatId', () => {
      const mockRun = jest.fn().mockReturnValue({ changes: 2 });
      mockDrizzleDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          run: mockRun,
        }),
      });

      repository.deleteTabsByChatId(1);

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Deleted %s open_tabs entries for chatId=%s', '2', '1');
    });

    it('should not log when no tabs deleted', () => {
      const mockRun = jest.fn().mockReturnValue({ changes: 0 });
      mockDrizzleDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          run: mockRun,
        }),
      });

      repository.deleteTabsByChatId(999);

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should not affect tabs with different chatIds', () => {
      const mockRun = jest.fn().mockReturnValue({ changes: 1 });
      const mockWhere = jest.fn().mockReturnValue({
        run: mockRun,
      });
      mockDrizzleDb.delete.mockReturnValue({
        run: jest.fn(),
        where: mockWhere,
      });

      repository.deleteTabsByChatId(1);

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
    });

    it('should handle non-existent chatId gracefully', () => {
      const mockRun = jest.fn().mockReturnValue({ changes: 0 });
      const mockWhere = jest.fn().mockReturnValue({
        run: mockRun,
      });
      mockDrizzleDb.delete.mockReturnValue({
        run: jest.fn(),
        where: mockWhere,
      });

      repository.deleteTabsByChatId(999);

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalled();
      // No error should be thrown
    });
  });
});

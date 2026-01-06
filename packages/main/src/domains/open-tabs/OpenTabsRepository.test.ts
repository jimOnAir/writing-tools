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

    mockDrizzleDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
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

      repository.saveOpenTabs(tabs);

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
      expect(mockDrizzleDb.insert).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Saved %d open tabs', 3);
    });

    it('should clear existing tabs before saving new ones', () => {
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
      expect(mockLogger.info).toHaveBeenCalledWith('Saved %d open tabs', 0);
    });

    it('should convert isActive boolean to integer', () => {
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
  });

  describe('loadOpenTabs', () => {
    it('should load tabs from database in correct order', () => {
      const mockRows = [
        { chatId: 1, tabOrder: 0, isActive: 1 },
        { chatId: 2, tabOrder: 1, isActive: 0 },
        { chatId: null, tabOrder: 2, isActive: 0 },
      ];

      mockDrizzleDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue(mockRows),
          }),
        }),
      });

      const tabs = repository.loadOpenTabs();

      expect(tabs).toEqual([
        { chatId: 1, tabOrder: 0, isActive: true },
        { chatId: 2, tabOrder: 1, isActive: false },
        { chatId: null, tabOrder: 2, isActive: false },
      ]);
    });

    it('should return empty array when no tabs saved', () => {
      mockDrizzleDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([]),
          }),
        }),
      });

      const tabs = repository.loadOpenTabs();

      expect(tabs).toEqual([]);
    });

    it('should convert isActive integer to boolean', () => {
      const mockRows = [
        { chatId: 1, tabOrder: 0, isActive: 1 },
        { chatId: 2, tabOrder: 1, isActive: 0 },
      ];

      mockDrizzleDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue(mockRows),
          }),
        }),
      });

      const tabs = repository.loadOpenTabs();

      expect(tabs[0].isActive).toBe(true);
      expect(tabs[1].isActive).toBe(false);
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
      expect(mockLogger.info).toHaveBeenCalledWith('Deleted %d open_tabs entries for chatId=%d', 2, 1);
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

  describe('error handling', () => {
    it('should throw error when database not initialized', () => {
      const uninitializedRepository = new OpenTabsRepository(mockLogger, dbConnection);
      // Set dbConnection to null to simulate uninitialized state
      (uninitializedRepository as { dbConnection: DatabaseConnection | null }).dbConnection = null;

      expect(() => {
        uninitializedRepository.saveOpenTabs([]);
      }).toThrow('Database not initialized');
    });
  });
});

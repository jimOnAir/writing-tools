/// <reference types="jest" />

import type { ILogger } from '@writing-tools/shared';

import type { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';

import { DbWatcherRepository } from './DbWatcherRepository';
import { EDbOperation } from './EDbOperation';

const CHATS_COLUMNS = ['created_at', 'id', 'model', 'provider', 'title', 'updated_at'];
const WATCHER_CHATS_FN = 'watcher_chats';

const mockPrepare = jest.fn();
const mockRawDb = {
  prepare: mockPrepare,
};

const mockDatabaseConnection = {
  getRawDatabase: jest.fn(() => mockRawDb),
};

jest.mock('../../infrastructure/database/DatabaseConnection', () => ({
  DatabaseConnection: jest.fn().mockImplementation(() => mockDatabaseConnection),
}));

describe('DbWatcherRepository', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let repository: DbWatcherRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepare.mockReturnValue({
      all: jest.fn().mockReturnValue([]),
      run: jest.fn(),
    });
    mockDatabaseConnection.getRawDatabase.mockReturnValue(mockRawDb);

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    repository = new DbWatcherRepository(
      mockDatabaseConnection as unknown as DatabaseConnection,
      mockLogger,
    );
  });

  describe('createTriggers', () => {
    it('creates trigger SQL for each operation with correct name and json_object', () => {
      const runMock = jest.fn();
      mockPrepare.mockReturnValue({ run: runMock });

      repository.createTriggers(
        'chats',
        WATCHER_CHATS_FN,
        [EDbOperation.DELETE, EDbOperation.INSERT, EDbOperation.UPDATE],
        CHATS_COLUMNS,
      );

      expect(mockPrepare).toHaveBeenCalledTimes(3);
      expect(runMock).toHaveBeenCalledTimes(3);

      const insertSql = mockPrepare.mock.calls.find((call: string[]) =>
        String(call[0]).includes('chats_INSERT') && String(call[0]).includes('NEW'),
      );
      expect(insertSql).toBeDefined();
      expect(insertSql[0]).toContain('AFTER INSERT ON chats');
      expect(insertSql[0]).toContain("SELECT watcher_chats('INSERT'");

      const updateSql = mockPrepare.mock.calls.find((call: string[]) =>
        String(call[0]).includes('chats_UPDATE') && String(call[0]).includes('NEW'),
      );
      expect(updateSql).toBeDefined();

      const deleteSql = mockPrepare.mock.calls.find((call: string[]) =>
        String(call[0]).includes('chats_DELETE') && String(call[0]).includes('OLD'),
      );
      expect(deleteSql).toBeDefined();
      expect(deleteSql[0]).toContain('AFTER DELETE ON chats');
    });
  });

  describe('dropTriggers', () => {
    it('queries sqlite_master and drops each trigger', () => {
      const allMock = jest.fn().mockReturnValue([
        { name: 'chats_INSERT' },
        { name: 'chats_UPDATE' },
      ]);
      const runMock = jest.fn();
      mockPrepare.mockImplementation((sql: string) => {
        if (sql.includes('sqlite_master')) {
          return { all: allMock, run: jest.fn() };
        }

        return { all: jest.fn(), run: runMock };
      });

      repository.dropTriggers('chats');

      expect(allMock).toHaveBeenCalledWith('chats');
      expect(runMock).toHaveBeenCalledTimes(2);
      expect(mockPrepare).toHaveBeenCalledWith('DROP TRIGGER IF EXISTS chats_INSERT');
      expect(mockPrepare).toHaveBeenCalledWith('DROP TRIGGER IF EXISTS chats_UPDATE');
    });

    it('drops nothing when no triggers exist', () => {
      const allMock = jest.fn().mockReturnValue([]);
      const runMock = jest.fn();
      mockPrepare.mockImplementation((sql: string) => {
        if (sql.includes('sqlite_master')) {
          return { all: allMock, run: jest.fn() };
        }

        return { all: jest.fn(), run: runMock };
      });

      repository.dropTriggers('chats');

      expect(allMock).toHaveBeenCalledWith('chats');
      expect(runMock).not.toHaveBeenCalled();
    });
  });
});

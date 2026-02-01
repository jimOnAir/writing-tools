/// <reference types="jest" />

import type { ILogger } from '@writing-tools/shared';

import type { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';
import { chats, messages } from '../../infrastructure/database/schema';

import type { DbWatcherRepository } from './DbWatcherRepository';
import { DbWatcherService } from './DbWatcherService';
import { getTableColumnNames } from './dbWatcherTables';
import { EDbOperation } from './EDbOperation';

let watcherCallbacks: Record<string, (op: string, json: string) => void> = {};
const mockRawDb = {
  function: jest.fn((name: string, _opts: unknown, cb: (op: string, json: string) => void) => {
    watcherCallbacks[name] = cb;
  }),
  prepare: jest.fn(() => ({
    all: jest.fn().mockReturnValue([]),
    run: jest.fn(),
  })),
};

const mockDatabaseConnection = {
  getRawDatabase: jest.fn(() => mockRawDb),
};

const mockDbWatcherRepository = {
  createTriggers: jest.fn(),
  dropTriggers: jest.fn(),
};

describe('DbWatcherService', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let service: DbWatcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    watcherCallbacks = {};

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    service = new DbWatcherService(
      mockDatabaseConnection as unknown as DatabaseConnection,
      mockDbWatcherRepository as unknown as DbWatcherRepository,
      mockLogger,
    );
  });

  describe('lazy trigger creation on subscribe', () => {
    it('creates triggers for chats when first listener subscribes to chats', () => {
      expect(mockDbWatcherRepository.createTriggers).not.toHaveBeenCalled();

      service.on('chats', () => undefined);

      expect(mockDbWatcherRepository.dropTriggers).toHaveBeenCalledWith('chats');
      expect(mockDbWatcherRepository.createTriggers).toHaveBeenCalledWith(
        'chats',
        'watcher_chats',
        [EDbOperation.DELETE, EDbOperation.INSERT, EDbOperation.UPDATE],
        getTableColumnNames(chats),
      );
    });

    it('creates triggers for messages when first listener subscribes to messages', () => {
      service.on('messages', () => undefined);

      expect(mockDbWatcherRepository.dropTriggers).toHaveBeenCalledWith('messages');
      expect(mockDbWatcherRepository.createTriggers).toHaveBeenCalledWith(
        'messages',
        'watcher_messages',
        [EDbOperation.DELETE, EDbOperation.INSERT, EDbOperation.UPDATE],
        getTableColumnNames(messages),
      );
    });

    it('does not create triggers again when second listener subscribes to same table', () => {
      service.on('chats', () => undefined);
      mockDbWatcherRepository.createTriggers.mockClear();
      service.on('chats', () => undefined);

      expect(mockDbWatcherRepository.createTriggers).not.toHaveBeenCalled();
    });
  });

  describe('emits table events when trigger callbacks run', () => {
    it('emits chats event when watcher_chats callback is invoked', () => {
      service.on('chats', () => undefined); // trigger creation so callbacks exist
      const listener = jest.fn();
      service.on('chats', listener);

      const chatsCb = watcherCallbacks.watcher_chats;
      expect(chatsCb).toBeDefined();
      chatsCb(EDbOperation.INSERT, JSON.stringify({ id: 42, title: 'New Chat' }));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        operation: EDbOperation.INSERT,
        payload: { id: 42, title: 'New Chat' },
      });
    });

    it('emits messages event when watcher_messages callback is invoked', () => {
      service.on('messages', () => undefined);
      const listener = jest.fn();
      service.on('messages', listener);

      const messagesCb = watcherCallbacks.watcher_messages;
      expect(messagesCb).toBeDefined();
      messagesCb(EDbOperation.INSERT, JSON.stringify({ chat_id: 5, id: '1' }));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        operation: EDbOperation.INSERT,
        payload: { chat_id: 5, id: '1' },
      });
    });
  });
});

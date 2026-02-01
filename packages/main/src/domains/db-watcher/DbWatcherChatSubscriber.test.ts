/// <reference types="jest" />

import type { ILogger } from '@writing-tools/shared';
import { EIpcRendererEvent } from '@writing-tools/shared';

import { DbWatcherChatSubscriber } from './DbWatcherChatSubscriber';
import { DbWatcherService } from './DbWatcherService';
import { EDbOperation } from './EDbOperation';

const mockSendToAllWindows = jest.fn();

jest.mock('../../infrastructure/ipc/sendToAllWindows', () => ({
  sendToAllWindows: (channel: string, payload: unknown) => mockSendToAllWindows(channel, payload),
}));

const mockRawDb = {
  function: jest.fn(),
};
const mockDatabaseConnection = {
  getRawDatabase: jest.fn(() => mockRawDb),
};

describe('DbWatcherChatSubscriber', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let service: DbWatcherService;
  let subscriber: DbWatcherChatSubscriber;

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

    const mockDbWatcherRepository = {
      createTriggers: jest.fn(),
      dropTriggers: jest.fn(),
    };
    service = new DbWatcherService(
      mockDatabaseConnection as unknown as import('../../infrastructure/database/DatabaseConnection').DatabaseConnection,
      mockDbWatcherRepository as unknown as import('./DbWatcherRepository').DbWatcherRepository,
      mockLogger,
    );
    subscriber = new DbWatcherChatSubscriber(service, mockLogger);
    subscriber.subscribe();
  });

  const flushPromises = async (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

  it('sends CHAT_CREATED when chats INSERT is emitted', async () => {
    service.emit('chats', {
      operation: EDbOperation.INSERT,
      payload: { id: 42, title: 'New Chat' },
    });
    await flushPromises();

    expect(mockSendToAllWindows).toHaveBeenCalledWith(EIpcRendererEvent.CHAT_CREATED, { chatId: 42 });
  });

  it('sends CHAT_TITLE_UPDATED when chats UPDATE is emitted', async () => {
    service.emit('chats', {
      operation: EDbOperation.UPDATE,
      payload: { id: 10, title: 'Updated Title' },
    });
    await flushPromises();

    expect(mockSendToAllWindows).toHaveBeenCalledWith(EIpcRendererEvent.CHAT_TITLE_UPDATED, {
      chatId: 10,
      title: 'Updated Title',
    });
  });

  it('sends CHAT_DELETED when chats DELETE is emitted', async () => {
    service.emit('chats', {
      operation: EDbOperation.DELETE,
      payload: { id: 7 },
    });
    await flushPromises();

    expect(mockSendToAllWindows).toHaveBeenCalledWith(EIpcRendererEvent.CHAT_DELETED, { chatId: 7 });
  });
});

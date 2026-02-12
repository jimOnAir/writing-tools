/// <reference types="jest" />

import type { ILogger } from '@writing-tools/shared';
import { EIpcRendererEvent } from '@writing-tools/shared';

import type { IChatRepository } from '../chat/IChatRepository';
import type { IFollowUpQuestionsService } from '../chat/IFollowUpQuestionsService';
import type { IMessageService } from '../chat/IMessageService';
import type { ITitleGenerationService } from '../chat/ITitleGenerationService';

import { DbWatcherMessageSubscriber } from './DbWatcherMessageSubscriber';
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

describe('DbWatcherMessageSubscriber', () => {
  let chatRepository: jest.Mocked<IChatRepository>;
  let followUpQuestionsService: jest.Mocked<IFollowUpQuestionsService>;
  let messageService: jest.Mocked<IMessageService>;
  let mockLogger: jest.Mocked<ILogger>;
  let service: DbWatcherService;
  let subscriber: DbWatcherMessageSubscriber;
  let titleGenerationService: jest.Mocked<ITitleGenerationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    chatRepository = {
      createChat: jest.fn(),
      getAllChats: jest.fn(),
      getChat: jest.fn().mockReturnValue(null),
      updateChatTitle: jest.fn(),
      updateChatModel: jest.fn(),
      deleteChat: jest.fn(),
    } as unknown as jest.Mocked<IChatRepository>;
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    messageService = {
      loadChatMessages: jest.fn().mockReturnValue([]),
      saveMessage: jest.fn(),
    } as unknown as jest.Mocked<IMessageService>;

    titleGenerationService = {
      generateTitleIfNeeded: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ITitleGenerationService>;

    followUpQuestionsService = {
      generate: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IFollowUpQuestionsService>;

    const mockDbWatcherRepository = {
      createTriggers: jest.fn(),
      dropTriggers: jest.fn(),
    };
    service = new DbWatcherService(
      mockDatabaseConnection as unknown as import('../../infrastructure/database/DatabaseConnection').DatabaseConnection,
      mockDbWatcherRepository as unknown as import('./DbWatcherRepository').DbWatcherRepository,
      mockLogger,
    );
    subscriber = new DbWatcherMessageSubscriber(
      chatRepository,
      service,
      followUpQuestionsService,
      mockLogger,
      messageService,
      titleGenerationService,
    );
    subscriber.subscribe();
  });

  const flushPromises = async (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

  it('sends CHAT_LOAD_MESSAGES_DATA and CHAT_FOLLOW_UP_QUESTIONS when messages event is emitted', async () => {
    const messages = [
      {
        content: 'Hello',
        id: '1',
        role: 'user' as const,
        timestamp: new Date(),
      },
    ];
    messageService.loadChatMessages.mockReturnValue(messages);
    followUpQuestionsService.generate.mockResolvedValue(['Q1?', 'Q2?']);

    service.emit('messages', {
      operation: EDbOperation.INSERT,
      payload: { chat_id: 5, id: '1' },
    });
    await flushPromises();

    expect(messageService.loadChatMessages).toHaveBeenCalledWith(5);
    expect(mockSendToAllWindows).toHaveBeenCalledWith(EIpcRendererEvent.CHAT_LOAD_MESSAGES_DATA, {
      chatId: 5,
      messages,
    });
    expect(titleGenerationService.generateTitleIfNeeded).toHaveBeenCalledWith(5);
    expect(followUpQuestionsService.generate).toHaveBeenCalledWith(messages, 5, '1', undefined);
    expect(mockSendToAllWindows).toHaveBeenCalledWith(EIpcRendererEvent.CHAT_FOLLOW_UP_QUESTIONS, {
      chatId: 5,
      questions: ['Q1?', 'Q2?'],
    });
  });

  it('passes chat model and provider to followUpQuestionsService when chat has them', async () => {
    const messages = [
      { content: 'Hi', id: '1', role: 'user' as const, timestamp: new Date() },
      { content: 'Hello!', id: '2', role: 'assistant' as const, timestamp: new Date() },
    ];
    messageService.loadChatMessages.mockReturnValue(messages);
    chatRepository.getChat.mockReturnValue({
      id: 7,
      model: 'my-model',
      provider: 'ollama',
      title: 'Test',
      updatedAt: new Date(),
    });
    followUpQuestionsService.generate.mockResolvedValue(['Q1?']);

    service.emit('messages', {
      operation: EDbOperation.INSERT,
      payload: { chat_id: 7, id: '2' },
    });
    await flushPromises();

    expect(followUpQuestionsService.generate).toHaveBeenCalledWith(messages, 7, '2', {
      model: 'my-model',
      provider: 'ollama',
    });
  });

  it('sends CHAT_FOLLOW_UP_QUESTIONS with empty array on followUpQuestionsService error', async () => {
    const messages = [
      { content: 'Hi', id: '1', role: 'user' as const, timestamp: new Date() },
      { content: 'Bye', id: '2', role: 'assistant' as const, timestamp: new Date() },
    ];
    messageService.loadChatMessages.mockReturnValue(messages);
    followUpQuestionsService.generate.mockRejectedValue(new Error('LLM error'));

    service.emit('messages', {
      operation: EDbOperation.INSERT,
      payload: { chat_id: 3, id: '2' },
    });
    await flushPromises();

    expect(mockSendToAllWindows).toHaveBeenCalledWith(EIpcRendererEvent.CHAT_FOLLOW_UP_QUESTIONS, {
      chatId: 3,
      questions: [],
    });
  });
});

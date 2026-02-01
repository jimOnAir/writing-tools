import type { IMessageStatistics } from '@writing-tools/shared';
import { EIpcRendererEvent } from '@writing-tools/shared';

import type { IModelService } from '../llm/IModelService';
import type { ISettingsService } from '../settings/ISettingsService';

import type { IChatService } from './IChatService';
import type { IMessageService } from './IMessageService';
import { LlmStreamingError } from './LlmStreamingError';
import { LlmStreamingService } from './LlmStreamingService';

async function* createMockStream(
  chunks: Array<{ content: string, done: boolean, statistics?: IMessageStatistics }>,
): AsyncGenerator<{ content: string, done: boolean, statistics?: IMessageStatistics }> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

describe('LlmStreamingService', () => {
  let mockChatService: jest.Mocked<IChatService>;
  let mockLogger: jest.Mocked<{ debug: jest.Mock, error: jest.Mock, info: jest.Mock, setEnvironment: jest.Mock, setLevel: jest.Mock, warn: jest.Mock }>;
  let mockMessageService: jest.Mocked<IMessageService>;
  let mockModelService: jest.Mocked<IModelService>;
  let mockSettingsService: jest.Mocked<ISettingsService>;
  let mockMainWindow: { webContents: { send: jest.Mock }, isDestroyed: jest.Mock };
  let streamingService: LlmStreamingService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChatService = {
      deleteChat: jest.fn(),
      getChat: jest.fn().mockReturnValue({
        created_at: '2024-01-01T00:00:00.000Z',
        id: 1,
        model: 'test-model',
        provider: 'ollama',
        title: 'Test',
        updated_at: '2024-01-01T00:00:00.000Z',
      }),
      getAllChats: jest.fn(),
      startNewChat: jest.fn(),
      updateChatModel: jest.fn(),
      updateChatTitle: jest.fn(),
    } as unknown as jest.Mocked<IChatService>;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<typeof mockLogger>;

    mockMessageService = {
      loadChatMessages: jest.fn(),
      saveMessage: jest.fn(),
    } as unknown as jest.Mocked<IMessageService>;

    mockModelService = {
      fetchModels: jest.fn(),
      sendMessages: jest.fn(),
      sendMessagesStream: jest.fn(),
    } as unknown as jest.Mocked<IModelService>;

    mockSettingsService = {
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
    } as unknown as jest.Mocked<ISettingsService>;

    mockMainWindow = {
      isDestroyed: jest.fn().mockReturnValue(false),
      webContents: { send: jest.fn() },
    };

    streamingService = new LlmStreamingService(
      mockChatService,
      mockLogger,
      mockMessageService,
      mockModelService,
      mockSettingsService,
    );
  });

  describe('streamToWindow', () => {
    it('streams content and saves assistant message with statistics', async () => {
      const mockStatistics: IMessageStatistics = {
        generatedAt: new Date(),
        model: 'test-model',
        provider: 'ollama',
      };

      mockModelService.sendMessagesStream.mockReturnValue(
        createMockStream([
          { content: 'Hello', done: false },
          { content: ' world', done: false },
          { content: '', done: true, statistics: mockStatistics },
        ]) as ReturnType<IModelService['sendMessagesStream']>,
      );

      const result = await streamingService.streamToWindow({
        chatId: 1,
        mainWindow: mockMainWindow as unknown as Electron.BrowserWindow,
        messages: [{ content: 'Hi', role: 'user' }],
      });

      expect(result).toEqual({ fullContent: 'Hello world', statistics: mockStatistics });

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        EIpcRendererEvent.CHAT_STREAM_CHUNK,
        { chatId: 1, content: 'Hello', done: false, statistics: undefined },
      );
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        EIpcRendererEvent.CHAT_STREAM_CHUNK,
        { chatId: 1, content: ' world', done: false, statistics: undefined },
      );
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        EIpcRendererEvent.CHAT_STREAM_CHUNK,
        { chatId: 1, content: '', done: true, statistics: mockStatistics },
      );

      expect(mockMessageService.saveMessage).toHaveBeenCalledWith(1, expect.objectContaining({
        content: 'Hello world',
        role: 'assistant',
        statistics: mockStatistics,
      }));
    });

    it('throws LlmStreamingError with partial content on streaming error', async () => {
      async function* failingStream(): AsyncGenerator<{ content: string, done: boolean }> {
        yield { content: 'Partial', done: false };
        throw new Error('Stream failed');
      }

      mockModelService.sendMessagesStream.mockImplementation(() =>
        failingStream() as ReturnType<IModelService['sendMessagesStream']>,
      );

      await expect(
        streamingService.streamToWindow({
          chatId: 1,
          mainWindow: mockMainWindow as unknown as Electron.BrowserWindow,
          messages: [{ content: 'Hi', role: 'user' }],
        }),
      ).rejects.toThrow(LlmStreamingError);

      const error = await streamingService
        .streamToWindow({
          chatId: 1,
          mainWindow: mockMainWindow as unknown as Electron.BrowserWindow,
          messages: [{ content: 'Hi', role: 'user' }],
        })
        .catch((e: unknown) => e) as { fullContent: string, message: string };

      expect(error).toMatchObject({ fullContent: 'Partial', message: 'Stream failed' });
    });

    it('uses override model and provider when provided', async () => {
      mockSettingsService.loadSettings.mockResolvedValue({
        globalShortcut: undefined,
        lmstudio: { address: 'http://localhost:1234', apiKey: '', model: '' },
        ollama: { address: 'http://localhost:11434', apiKey: '', model: '' },
        preconfiguredPrompts: [],
        provider: 'ollama',
      });

      mockModelService.sendMessagesStream.mockReturnValue(
        createMockStream([{ content: 'Done', done: true }]) as ReturnType<IModelService['sendMessagesStream']>,
      );

      await streamingService.streamToWindow({
        chatId: 1,
        mainWindow: mockMainWindow as unknown as Electron.BrowserWindow,
        messages: [{ content: 'Hi', role: 'user' }],
        override: { model: 'custom-model', provider: 'lmstudio' },
      });

      expect(mockModelService.sendMessagesStream).toHaveBeenCalledWith(
        [{ content: 'Hi', role: 'user' }],
        { model: 'custom-model', provider: 'lmstudio' },
      );
    });

    it('uses chat model and provider when no override', async () => {
      mockModelService.sendMessagesStream.mockReturnValue(
        createMockStream([{ content: 'Done', done: true }]) as ReturnType<IModelService['sendMessagesStream']>,
      );

      await streamingService.streamToWindow({
        chatId: 1,
        mainWindow: mockMainWindow as unknown as Electron.BrowserWindow,
        messages: [{ content: 'Hi', role: 'user' }],
      });

      expect(mockModelService.sendMessagesStream).toHaveBeenCalledWith(
        [{ content: 'Hi', role: 'user' }],
        { model: 'test-model', provider: 'ollama' },
      );
    });
  });
});

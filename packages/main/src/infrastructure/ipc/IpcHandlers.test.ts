/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/unbound-method */
import { EIpcChannel, EIpcEvent, EIpcRendererEvent } from '@writing-tools/shared';
import type { IChatInfo, IChatMessage, ISettings, ILogger } from '@writing-tools/shared';
import { ipcMain, BrowserWindow } from 'electron';

import type { IChatService } from '../../domains/chat/IChatService';
import type { IModelService } from '../../domains/llm/IModelService';
import type { ISettingsService } from '../../domains/settings/ISettingsService';
import type { IWindowService } from '../../domains/windows/IWindowService';

import { IpcHandlers } from './IpcHandlers';

// Mock electron ipcMain and BrowserWindow
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn(),
  },
}));

// Mock node:os module
jest.mock('node:os', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('node:os');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    arch: jest.fn(() => 'x64'),
    platform: jest.fn(() => 'linux'),
    release: jest.fn(() => '5.0.0'),
  };
});

// Mock the logger to avoid console output in tests
jest.mock('@writing-tools/shared', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('@writing-tools/shared');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    logger: {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    },
  };
});

type THandlerFunction = (...args: unknown[]) => unknown;

const getHandler = (channel: string): THandlerFunction | undefined => {
  const mockHandle = ipcMain.handle as jest.Mock;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const calls: unknown[][] = mockHandle.mock.calls;

  const call = calls.find((callArgs: unknown[]) => {
    return callArgs[0] === channel;
  });

  if (call === undefined) {
    return undefined;
  }

  return call[1] as THandlerFunction;
};

describe('IpcHandlers', () => {
  let mockChatService: jest.Mocked<IChatService>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockModelService: jest.Mocked<IModelService>;
  let mockSettingsService: jest.Mocked<ISettingsService>;
  let mockWindowService: jest.Mocked<IWindowService>;
  let ipcHandlers: IpcHandlers;
  let mockChatWindow: {
    isDestroyed: jest.Mock,
    webContents: {
      send: jest.Mock,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockChatWindow = {
      isDestroyed: jest.fn(() => false),
      webContents: {
        send: jest.fn(),
      },
    };

    mockChatService = {
      initialize: jest.fn(),
      startNewChat: jest.fn(),
      saveMessage: jest.fn(),
      loadChatMessages: jest.fn(),
      getAllChats: jest.fn(),
      getChat: jest.fn(),
      updateChatTitle: jest.fn(),
      deleteChat: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<IChatService>;

    mockModelService = {
      fetchModels: jest.fn(),
      sendMessages: jest.fn(),
    } as unknown as jest.Mocked<IModelService>;

    mockSettingsService = {
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
    } as unknown as jest.Mocked<ISettingsService>;

    mockWindowService = {
      getMainWindow: jest.fn(),
    } as unknown as jest.Mocked<IWindowService>;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    ipcHandlers = new IpcHandlers(
      mockSettingsService,
      mockModelService,
      mockWindowService,
      mockChatService,
      mockLogger,
    );

    (mockWindowService.getMainWindow as jest.Mock).mockResolvedValue({
      window: mockChatWindow,
      created: false,
    });
  });

  describe('register', () => {
    it('registers all IPC handlers', () => {
      ipcHandlers.register();

      const handleMock = ipcMain.handle as jest.Mock;
      const expectedCallCount = 5;
      expect(handleMock).toHaveBeenCalledTimes(expectedCallCount);
      expect(handleMock).toHaveBeenCalledWith(EIpcChannel.ENV, expect.any(Function));
      expect(handleMock).toHaveBeenCalledWith(EIpcChannel.SETTINGS, expect.any(Function));
      expect(handleMock).toHaveBeenCalledWith(EIpcChannel.MODEL, expect.any(Function));
      expect(handleMock).toHaveBeenCalledWith(EIpcChannel.CHAT, expect.any(Function));
      expect(handleMock).toHaveBeenCalledWith(EIpcChannel.PROMPT_SELECTOR, expect.any(Function));
    });
  });

  describe('ENV_GET handler', () => {
    it('returns platform information', async () => {
      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.ENV);

      expect(handler).toBeDefined();

      const result = await handler?.(null, {
        channel: EIpcChannel.ENV,
        event: EIpcEvent.ENV_GET,
        payload: {},
      });

      expect(result).toEqual({
        arch: 'x64',
        platform: 'linux',
        release: '5.0.0',
      });
    });
  });

  describe('SETTINGS_LOAD handler', () => {
    it('loads settings from service', async () => {
      const mockSettings: ISettings = {
        provider: 'ollama',
        ollama: { address: 'http://localhost:11434', model: 'test-model', apiKey: '' },
        lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
        preconfiguredPrompts: [],
        globalShortcut: undefined,
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings);

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.SETTINGS);

      const result = await handler?.(null, {
        channel: EIpcChannel.SETTINGS,
        event: EIpcEvent.SETTINGS_LOAD,
        payload: {},
      });

      expect(mockSettingsService.loadSettings).toHaveBeenCalled();
      expect(result).toEqual(mockSettings);
    });
  });

  describe('SETTINGS_SAVE handler', () => {
    it('saves settings successfully', async () => {
      const mockSettings: ISettings = {
        provider: 'ollama',
        ollama: { address: 'http://localhost:11434', model: 'test-model', apiKey: '' },
        lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
        preconfiguredPrompts: [],
        globalShortcut: undefined,
      };

      mockSettingsService.saveSettings.mockResolvedValue();

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.SETTINGS);

      const result = await handler?.(null, {
        channel: EIpcChannel.SETTINGS,
        event: EIpcEvent.SETTINGS_SAVE,
        payload: mockSettings,
      });

      expect(mockSettingsService.saveSettings).toHaveBeenCalledWith(mockSettings);
      expect(result).toEqual({ success: true });
    });

    it('handles save errors', async () => {
      const mockSettings: ISettings = {
        provider: 'ollama',
        ollama: { address: 'http://localhost:11434', model: 'test-model', apiKey: '' },
        lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
        preconfiguredPrompts: [],
        globalShortcut: undefined,
      };

      mockSettingsService.saveSettings.mockRejectedValue(new Error('Save failed'));

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.SETTINGS);

      const result = await handler?.(null, {
        channel: EIpcChannel.SETTINGS,
        event: EIpcEvent.SETTINGS_SAVE,
        payload: mockSettings,
      });

      expect(result).toEqual({ success: false, error: 'Save failed' });
    });
  });

  describe('MODEL_LIST handler', () => {
    it('fetches models from service', async () => {
      const mockModels = { models: ['model1', 'model2'] };
      mockModelService.fetchModels.mockResolvedValue(mockModels);

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.MODEL);

      const result = await handler?.(null, {
        channel: EIpcChannel.MODEL,
        event: EIpcEvent.MODEL_LIST,
        payload: { provider: 'ollama' },
      });

      expect(mockModelService.fetchModels).toHaveBeenCalledWith('ollama');
      expect(result).toEqual(mockModels);
    });
  });

  describe('CHAT_LIST_CHATS handler', () => {
    it('returns list of chats', async () => {
      const mockChats: IChatInfo[] = [
        { id: 1, title: 'Chat 1', provider: 'ollama', model: 'test', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
        { id: 2, title: 'Chat 2', provider: 'ollama', model: 'test', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
      ];

      mockChatService.getAllChats.mockReturnValue(mockChats);

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LIST_CHATS,
        payload: {},
      });

      expect(mockChatService.getAllChats).toHaveBeenCalled();
      expect(result).toEqual({ chats: mockChats });
    });

    it('handles errors when listing chats', async () => {
      mockChatService.getAllChats.mockImplementation(() => {
        throw new Error('List failed');
      });

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LIST_CHATS,
        payload: {},
      });

      expect(result).toEqual({ error: 'List failed' });
    });
  });

  describe('CHAT_GET handler', () => {
    it('returns chat when found', async () => {
      const mockChat: IChatInfo = {
        id: 1,
        title: 'Test Chat',
        provider: 'ollama',
        model: 'test',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockChatService.getChat.mockReturnValue(mockChat);

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_GET,
        payload: { chatId: 1 },
      });

      expect(mockChatService.getChat).toHaveBeenCalledWith(1);
      expect(result).toEqual({ chat: mockChat });
    });

    it('returns error when chat not found', async () => {
      mockChatService.getChat.mockReturnValue(null);

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_GET,
        payload: { chatId: 999 },
      });

      expect(result).toEqual({ error: 'Chat with id 999 not found' });
    });
  });

  describe('CHAT_LOAD_MESSAGES handler', () => {
    it('returns messages for chat', async () => {
      const mockMessages: IChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hi there',
          timestamp: new Date(),
        },
      ];

      mockChatService.loadChatMessages.mockReturnValue(mockMessages);

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LOAD_MESSAGES,
        payload: { chatId: 1 },
      });

      expect(mockChatService.loadChatMessages).toHaveBeenCalledWith(1);
      expect(result).toEqual({ messages: mockMessages });
    });

    it('handles errors when loading messages', async () => {
      mockChatService.loadChatMessages.mockImplementation(() => {
        throw new Error('Load failed');
      });

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LOAD_MESSAGES,
        payload: { chatId: 1 },
      });

      expect(result).toEqual({ error: 'Load failed' });
    });
  });

  describe('CHAT_CREATE_SESSION handler', () => {
    it('creates new chat session', async () => {
      const mockSettings: ISettings = {
        provider: 'ollama',
        ollama: { address: 'http://localhost:11434', model: 'test-model', apiKey: '' },
        lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
        preconfiguredPrompts: [],
        globalShortcut: undefined,
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings);
      mockChatService.startNewChat.mockReturnValue(1);

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_CREATE_SESSION,
        payload: { title: 'New Chat' },
      });

      expect(mockChatService.startNewChat).toHaveBeenCalledWith('New Chat', 'ollama', 'test-model');
      expect(result).toEqual({ chatId: 1 });
    });

    it('handles errors when creating chat', async () => {
      mockSettingsService.loadSettings.mockRejectedValue(new Error('Settings load failed'));

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_CREATE_SESSION,
        payload: { title: 'New Chat' },
      });

      expect(result).toEqual({ error: 'Settings load failed' });
    });
  });

  describe('CHAT_DELETE handler', () => {
    it('deletes chat successfully', async () => {
      const mockChat: IChatInfo = {
        id: 1,
        title: 'Test Chat',
        provider: 'ollama',
        model: 'test',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockChatService.getChat.mockReturnValue(mockChat);
      (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([mockChatWindow]);

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_DELETE,
        payload: { chatId: 1 },
      });

      expect(mockChatService.deleteChat).toHaveBeenCalledWith(1);
      expect(mockChatWindow.webContents.send).toHaveBeenCalledWith(
        EIpcRendererEvent.CHAT_DELETED,
        { chatId: 1 },
      );
      expect(result).toEqual({ success: true });
    });

    it('returns error when chat not found', async () => {
      mockChatService.getChat.mockReturnValue(null);

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_DELETE,
        payload: { chatId: 999 },
      });

      expect(result).toEqual({ success: false, error: 'Chat with id 999 not found' });
    });
  });

  describe('CHAT_OPEN handler', () => {
    it('opens chat and sends messages to window', async () => {
      const mockChat: IChatInfo = {
        id: 1,
        title: 'Test Chat',
        provider: 'ollama',
        model: 'test',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const mockMessages: IChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      mockChatService.getChat.mockReturnValue(mockChat);
      mockChatService.loadChatMessages.mockReturnValue(mockMessages);

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_OPEN,
        payload: { chatId: 1 },
      });

      expect(mockChatService.loadChatMessages).toHaveBeenCalledWith(1);
      expect(mockChatWindow.webContents.send).toHaveBeenCalledWith(
        EIpcRendererEvent.CHAT_LOAD_MESSAGES_DATA,
        { chatId: 1, messages: mockMessages },
      );
      expect(result).toEqual({ success: true });
    });

    it('returns error when chat not found', async () => {
      mockChatService.getChat.mockReturnValue(null);

      ipcHandlers.register();

      const handler = getHandler(EIpcChannel.CHAT);

      const result = await handler?.(null, {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_OPEN,
        payload: { chatId: 999 },
      });

      expect(result).toEqual({ success: false, error: 'Chat with id 999 not found' });
    });
  });
});

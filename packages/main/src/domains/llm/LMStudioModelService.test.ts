import type { ILogger, ISettings } from '@writing-tools/shared';
import type { Message } from 'ollama';

import type { ISettingsService } from '../settings/ISettingsService';

import { LMStudioClient } from './LMStudioClient';
import { LMStudioModelService } from './LMStudioModelService';

// Mock LMStudioClient
jest.mock('./LMStudioClient');

describe('LMStudioModelService', () => {
  let mockSettingsService: jest.Mocked<ISettingsService>;
  let mockLMStudioClient: jest.Mocked<LMStudioClient>;
  let mockLogger: jest.Mocked<ILogger>;
  let lmStudioModelService: LMStudioModelService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockSettingsService = {
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
    } as unknown as jest.Mocked<ISettingsService>;

    mockLMStudioClient = {
      chat: jest.fn(),
      listModels: jest.fn(),
    } as unknown as jest.Mocked<LMStudioClient>;

    (LMStudioClient as jest.Mock).mockImplementation(() => mockLMStudioClient);

    lmStudioModelService = new LMStudioModelService(mockSettingsService, mockLogger);
  });

  describe('fetchModels', () => {
    it('fetches models successfully', async () => {
      const mockSettings: Pick<ISettings, 'lmstudio'> = {
        lmstudio: {
          address: 'http://localhost:1234',
          apiKey: 'test-key',
          model: undefined,
        },
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);
      mockLMStudioClient.listModels.mockResolvedValue({ models: ['model1', 'model2'] });

      const result = await lmStudioModelService.fetchModels();

      expect(mockSettingsService.loadSettings).toHaveBeenCalled();
      expect(LMStudioClient).toHaveBeenCalledWith({
        apiKey: 'test-key',
        host: 'http://localhost:1234',
      }, mockLogger);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLMStudioClient.listModels).toHaveBeenCalled();
      expect(result).toEqual({ models: ['model1', 'model2'] });
    });

    it('handles errors when fetching models', async () => {
      const mockSettings: Pick<ISettings, 'lmstudio'> = {
        lmstudio: {
          address: 'http://localhost:1234',
          apiKey: '',
          model: undefined,
        },
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);
      mockLMStudioClient.listModels.mockResolvedValue({ error: 'Connection failed', models: [] });

      const result = await lmStudioModelService.fetchModels();

      expect(result).toEqual({ error: 'Connection failed', models: [] });
    });
  });

  describe('sendMessages', () => {
    it('sends messages successfully', async () => {
      const mockSettings: Pick<ISettings, 'lmstudio'> = {
        lmstudio: {
          address: 'http://localhost:1234',
          model: 'test-model',
          apiKey: 'test-key',
        },
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);
      mockLMStudioClient.chat.mockResolvedValue({ response: 'Test response', success: true as const });

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const result = await lmStudioModelService.sendMessages(messages);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLMStudioClient.chat).toHaveBeenCalledWith(
        'test-model',
        [{ content: 'Hello', role: 'user' }],
        { maxTokens: undefined },
      );
      expect(result).toEqual({ response: 'Test response', success: true });
    });

    it('converts Ollama Message format to LM Studio format', async () => {
      const mockSettings: Pick<ISettings, 'lmstudio'> = {
        lmstudio: {
          address: 'http://localhost:1234',
          model: 'test-model',
          apiKey: '',
        },
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);
      mockLMStudioClient.chat.mockResolvedValue({ response: 'Response', success: true as const });

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
      ];

      await lmStudioModelService.sendMessages(messages);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLMStudioClient.chat).toHaveBeenCalledWith(
        'test-model',
        [
          { content: 'Hello', role: 'user' },
          { content: 'Hi', role: 'assistant' },
        ],
        { maxTokens: undefined },
      );
    });

    it('throws error when model is not specified', async () => {
      const mockSettings: Pick<ISettings, 'lmstudio'> = {
        lmstudio: {
          address: 'http://localhost:1234',
          model: '',
          apiKey: '',
        },
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      await expect(lmStudioModelService.sendMessages(messages)).rejects.toThrow('Model not specified');
    });

    it('handles errors when sending messages', async () => {
      const mockSettings: Pick<ISettings, 'lmstudio'> = {
        lmstudio: {
          address: 'http://localhost:1234',
          model: 'test-model',
          apiKey: '',
        },
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);
      mockLMStudioClient.chat.mockResolvedValue({ error: 'Send failed', success: false as const });

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const result = await lmStudioModelService.sendMessages(messages);

      expect(result).toEqual({ error: 'Send failed', success: false });
    });
  });
});

import type { ILogger, ISettings } from '@writing-tools/shared';
import type { Message } from 'ollama';

import type { ISettingsService } from '../settings/ISettingsService';

import { OllamaClient } from './OllamaClient';
import { OllamaModelService } from './OllamaModelService';

// Mock OllamaClient
jest.mock('./OllamaClient');

describe('OllamaModelService', () => {
  let mockSettingsService: jest.Mocked<ISettingsService>;
  let mockOllamaClient: jest.Mocked<OllamaClient>;
  let mockLogger: jest.Mocked<ILogger>;
  let ollamaModelService: OllamaModelService;

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

    mockOllamaClient = {
      chat: jest.fn(),
      listModels: jest.fn(),
    } as unknown as jest.Mocked<OllamaClient>;

    (OllamaClient as jest.Mock).mockImplementation(() => mockOllamaClient);

    ollamaModelService = new OllamaModelService(mockSettingsService, mockLogger);
  });

  describe('fetchModels', () => {
    it('fetches models successfully', async () => {
      const mockSettings: Pick<ISettings, 'ollama'> = {
        ollama: {
          address: 'http://localhost:11434',
          apiKey: 'test-key',
          model: undefined,
        },
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);
      mockOllamaClient.listModels.mockResolvedValue({ models: ['model1', 'model2'] });

      const result = await ollamaModelService.fetchModels();

      expect(mockSettingsService.loadSettings).toHaveBeenCalled();
      expect(OllamaClient).toHaveBeenCalledWith({
        host: 'http://localhost:11434',
        apiKey: 'test-key',
      }, mockLogger);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockOllamaClient.listModels).toHaveBeenCalled();
      expect(result).toEqual({ models: ['model1', 'model2'] });
    });

    it('handles errors when fetching models', async () => {
      const mockSettings: Pick<ISettings, 'ollama'> = {
        ollama: {
          address: 'http://localhost:11434',
          apiKey: '',
          model: undefined,
        },
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);
      mockOllamaClient.listModels.mockResolvedValue({ error: 'Connection failed', models: [] });

      const result = await ollamaModelService.fetchModels();

      expect(result).toEqual({ error: 'Connection failed', models: [] });
    });
  });

  describe('sendMessages', () => {
    it('sends messages successfully', async () => {
      const mockSettings: Pick<ISettings, 'ollama'> = {
        ollama: {
          address: 'http://localhost:11434',
          model: 'test-model',
          apiKey: 'test-key',
        },
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);
      mockOllamaClient.chat.mockResolvedValue({ response: 'Test response', success: true as const });

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const result = await ollamaModelService.sendMessages(messages);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockOllamaClient.chat).toHaveBeenCalledWith('test-model', messages);
      expect(result).toEqual({ response: 'Test response', success: true });
    });

    it('throws error when model is not specified', async () => {
      const mockSettings: Pick<ISettings, 'ollama'> = {
        ollama: {
          address: 'http://localhost:11434',
          model: '',
          apiKey: '',
        },
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      await expect(ollamaModelService.sendMessages(messages)).rejects.toThrow('Model not specified');
    });

    it('handles errors when sending messages', async () => {
      const mockSettings: Pick<ISettings, 'ollama'> = {
        ollama: {
          address: 'http://localhost:11434',
          model: 'test-model',
          apiKey: '',
        },
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);
      mockOllamaClient.chat.mockResolvedValue({ error: 'Send failed', success: false as const });

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const result = await ollamaModelService.sendMessages(messages);

      expect(result).toEqual({ error: 'Send failed', success: false });
    });
  });
});

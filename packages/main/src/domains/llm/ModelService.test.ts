import type { ISettings } from '@writing-tools/shared';
import type { Message } from 'ollama';

import type { ISettingsService } from '../settings/ISettingsService';

import type { ILMStudioModelService } from './ILMStudioModelService';
import type { IOllamaModelService } from './IOllamaModelService';
import { ModelService } from './ModelService';

describe('ModelService', () => {
  let mockLMStudioModelService: jest.Mocked<ILMStudioModelService>;
  let mockOllamaModelService: jest.Mocked<IOllamaModelService>;
  let mockSettingsService: jest.Mocked<ISettingsService>;
  let modelService: ModelService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSettingsService = {
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
    } as unknown as jest.Mocked<ISettingsService>;

    mockOllamaModelService = {
      fetchModels: jest.fn(),
      getModelContextLength: jest.fn(),
      sendMessages: jest.fn(),
    } as unknown as jest.Mocked<IOllamaModelService>;

    mockLMStudioModelService = {
      fetchModels: jest.fn(),
      sendMessages: jest.fn(),
    } as unknown as jest.Mocked<ILMStudioModelService>;

    modelService = new ModelService(
      mockSettingsService,
      mockOllamaModelService,
      mockLMStudioModelService,
    );
  });

  describe('fetchModels', () => {
    it('fetches models for ollama provider', async () => {
      const mockModels = { models: ['model1', 'model2'] };
      mockOllamaModelService.fetchModels.mockResolvedValue(mockModels);

      const result = await modelService.fetchModels('ollama');

      expect(mockOllamaModelService.fetchModels).toHaveBeenCalled();
      expect(result).toEqual(mockModels);
    });

    it('fetches models for lmstudio provider', async () => {
      const mockModels = { models: ['model1', 'model2'] };
      mockLMStudioModelService.fetchModels.mockResolvedValue(mockModels);

      const result = await modelService.fetchModels('lmstudio');

      expect(mockLMStudioModelService.fetchModels).toHaveBeenCalled();
      expect(result).toEqual(mockModels);
    });

    it('throws error for unknown provider', async () => {
      await expect(modelService.fetchModels('unknown' as 'ollama')).rejects.toThrow('Unknown provider');
    });
  });

  describe('sendMessages', () => {
    it('sends messages using ollama when provider is ollama', async () => {
      const mockSettings: ISettings = {
        globalShortcut: undefined,
        lmstudio: { address: 'http://localhost:1234', apiKey: '', model: '' },
        ollama: { address: 'http://localhost:11434', apiKey: '', model: 'test' },
        preconfiguredPrompts: [],
        provider: 'ollama',
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings);

      const mockResponse = { response: 'Test response', success: true } as const;
      mockOllamaModelService.sendMessages.mockResolvedValue(mockResponse);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const result = await modelService.sendMessages(messages);

      expect(mockOllamaModelService.sendMessages).toHaveBeenCalledWith(messages, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('sends messages using lmstudio when provider is lmstudio', async () => {
      const mockSettings: ISettings = {
        globalShortcut: undefined,
        lmstudio: { address: 'http://localhost:1234', apiKey: '', model: 'test' },
        ollama: { address: 'http://localhost:11434', apiKey: '', model: '' },
        preconfiguredPrompts: [],
        provider: 'lmstudio',
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings);

      const mockResponse = { response: 'Test response', success: true } as const;
      mockLMStudioModelService.sendMessages.mockResolvedValue(mockResponse);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const result = await modelService.sendMessages(messages);

      expect(mockLMStudioModelService.sendMessages).toHaveBeenCalledWith(messages, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('throws error for unknown provider', async () => {
      const mockSettings: ISettings = {
        globalShortcut: undefined,
        lmstudio: { address: 'http://localhost:1234', apiKey: '', model: '' },
        ollama: { address: 'http://localhost:11434', apiKey: '', model: '' },
        preconfiguredPrompts: [],
        provider: 'unknown' as 'ollama' | 'lmstudio',
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings);

      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      await expect(modelService.sendMessages(messages)).rejects.toThrow('Unknown provider');
    });
  });

  describe('getModelContextLength', () => {
    it('returns context length from ollama when provider is ollama', async () => {
      mockOllamaModelService.getModelContextLength.mockResolvedValue(8192);

      const result = await modelService.getModelContextLength('ollama', 'llama2');

      expect(mockOllamaModelService.getModelContextLength).toHaveBeenCalledWith('llama2');
      expect(result).toBe(8192);
    });

    it('returns null for lmstudio provider', async () => {
      const result = await modelService.getModelContextLength('lmstudio', 'some-model');

      expect(mockOllamaModelService.getModelContextLength).not.toHaveBeenCalled();
      expect(result).toBe(null);
    });
  });
});

import { DefaultSettings, EIpcChannel, EIpcEvent } from '@writing-tools/shared';
import type { ISettings } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';

import { SettingsService } from './SettingsService';

const SUCCESS_MESSAGE_TIMEOUT_MS = 3000;

describe('SettingsService', () => {
  let mockIpcAdapter: jest.Mocked<IIpcAdapter>;
  let settingsService: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockIpcAdapter = {
      invoke: jest.fn(),
      onPromptSelected: jest.fn(),
      offPromptSelected: jest.fn(),
      onOllamaResponse: jest.fn(),
      offOllamaResponse: jest.fn(),
      onPromptSelectorData: jest.fn(),
      offPromptSelectorData: jest.fn(),
      onChatTitleUpdated: jest.fn(),
      offChatTitleUpdated: jest.fn(),
      onChatLoadMessagesData: jest.fn(),
      offChatLoadMessagesData: jest.fn(),
      onChatDeleted: jest.fn(),
      offChatDeleted: jest.fn(),
    } as unknown as jest.Mocked<IIpcAdapter>;

    settingsService = new SettingsService(mockIpcAdapter);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('setCallbacks', () => {
    it('registers all callbacks', () => {
      const callbacks = {
        onAvailableModelsChange: jest.fn(),
        onErrorChange: jest.fn(),
        onLoadingModelsChange: jest.fn(),
        onOriginalSettingsChange: jest.fn(),
        onProviderAvailabilityChange: jest.fn(),
        onSettingsChange: jest.fn(),
        onSuccessChange: jest.fn(),
      };

      settingsService.setCallbacks(callbacks);

      expect(settingsService).toBeDefined();
    });
  });

  describe('loadSettings', () => {
    it('loads settings successfully', async () => {
      const mockSettings: ISettings = {
        ...DefaultSettings,
        provider: 'lmstudio',
      };

      mockIpcAdapter.invoke
        .mockResolvedValueOnce(mockSettings)
        .mockResolvedValueOnce({ models: ['model1', 'model2'] })
        .mockResolvedValueOnce({ models: ['model1', 'model2'] });

      const onOriginalSettingsChange = jest.fn();
      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({
        onOriginalSettingsChange,
        onSettingsChange,
      });

      await settingsService.loadSettings();

      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.SETTINGS,
        expect.objectContaining({
          event: EIpcEvent.SETTINGS_LOAD,
        }),
      );
      expect(onSettingsChange).toHaveBeenCalledWith(mockSettings);
      expect(onOriginalSettingsChange).toHaveBeenCalledWith(mockSettings);
    });

    it('fetches models for both providers after loading settings when both have addresses', async () => {
      const mockSettings: ISettings = {
        ...DefaultSettings,
        ollama: { address: 'http://localhost:11434', apiKey: '', model: '' },
        provider: 'ollama',
      };

      mockIpcAdapter.invoke
        .mockResolvedValueOnce(mockSettings)
        .mockResolvedValueOnce({ models: ['model1'] })
        .mockResolvedValueOnce({ models: ['lm-model'] });

      await settingsService.loadSettings();

      expect(mockIpcAdapter.invoke).toHaveBeenCalledTimes(3);
      expect(mockIpcAdapter.invoke).toHaveBeenNthCalledWith(
        2,
        EIpcChannel.MODEL,
        expect.objectContaining({
          event: EIpcEvent.MODEL_LIST,
        }),
      );
      expect(mockIpcAdapter.invoke).toHaveBeenNthCalledWith(
        3,
        EIpcChannel.MODEL,
        expect.objectContaining({
          event: EIpcEvent.MODEL_LIST,
        }),
      );
    });

    it('handles errors when loading settings', async () => {
      mockIpcAdapter.invoke.mockRejectedValue(new Error('Load failed'));

      const onErrorChange = jest.fn();
      settingsService.setCallbacks({ onErrorChange });

      await settingsService.loadSettings();

      expect(onErrorChange).toHaveBeenCalledWith('Load failed');
    });
  });

  describe('saveSettings', () => {
    it('saves settings successfully', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ success: true });

      const onOriginalSettingsChange = jest.fn();
      const onSuccessChange = jest.fn();
      settingsService.setCallbacks({
        onOriginalSettingsChange,
        onSuccessChange,
      });

      const result = await settingsService.saveSettings();

      expect(result).toBe(true);
      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.SETTINGS,
        expect.objectContaining({
          event: EIpcEvent.SETTINGS_SAVE,
        }),
      );
      expect(onSuccessChange).toHaveBeenCalledWith('Settings saved successfully!');

      jest.advanceTimersByTime(SUCCESS_MESSAGE_TIMEOUT_MS);
      expect(onSuccessChange).toHaveBeenCalledWith(null);
    });

    it('handles save errors', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ success: false, error: 'Save failed' });

      const onErrorChange = jest.fn();
      settingsService.setCallbacks({ onErrorChange });

      const result = await settingsService.saveSettings();

      expect(result).toBe(false);
      expect(onErrorChange).toHaveBeenCalledWith('Failed to save settings: Save failed');
    });
  });

  describe('updateProvider', () => {
    it('updates provider and fetches models', () => {
      mockIpcAdapter.invoke.mockResolvedValue({ models: ['model1'] });

      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.updateProvider('lmstudio');

      expect(onSettingsChange).toHaveBeenCalled();
      expect(mockIpcAdapter.invoke).toHaveBeenCalledWith(
        EIpcChannel.MODEL,
        expect.objectContaining({
          payload: { provider: 'lmstudio' },
        }),
      );
    });
  });

  describe('updateOllamaAddress', () => {
    it('updates Ollama address', () => {
      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.updateOllamaAddress('http://custom:11434');

      expect(onSettingsChange).toHaveBeenCalled();
    });
  });

  describe('updateOllamaModel', () => {
    it('updates Ollama model', () => {
      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.updateOllamaModel('new-model');

      expect(onSettingsChange).toHaveBeenCalled();
    });
  });

  describe('updateLMStudioAddress', () => {
    it('updates LM Studio address', () => {
      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.updateLMStudioAddress('http://custom:1234');

      expect(onSettingsChange).toHaveBeenCalled();
    });
  });

  describe('updateLMStudioModel', () => {
    it('updates LM Studio model', () => {
      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.updateLMStudioModel('new-model');

      expect(onSettingsChange).toHaveBeenCalled();
    });
  });

  describe('fetchAvailableModels', () => {
    it('fetches models for current provider', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ models: ['model1', 'model2'] });

      const onAvailableModelsChange = jest.fn();
      const onLoadingModelsChange = jest.fn();
      settingsService.setCallbacks({
        onAvailableModelsChange,
        onLoadingModelsChange,
      });

      await settingsService.fetchAvailableModels();

      expect(onAvailableModelsChange).toHaveBeenCalledWith({
        lmstudio: [],
        ollama: ['model1', 'model2'],
      });
      expect(onLoadingModelsChange).toHaveBeenCalledWith(false);
    });

    it('handles errors when fetching models', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ error: 'Fetch failed', models: [] });

      const onAvailableModelsChange = jest.fn();
      const onErrorChange = jest.fn();
      const onProviderAvailabilityChange = jest.fn();
      settingsService.setCallbacks({
        onAvailableModelsChange,
        onErrorChange,
        onProviderAvailabilityChange,
      });

      await settingsService.fetchAvailableModels();

      // Service first clears error (null), then sets formatted error message
      // Even on error, models for current provider are set (empty array)
      expect(onAvailableModelsChange).toHaveBeenCalledWith({
        lmstudio: [],
        ollama: [],
      });
      expect(onErrorChange).toHaveBeenCalledWith(null);
      expect(onErrorChange).toHaveBeenCalledWith('Failed to fetch available models from Ollama. Please check the address and ensure Ollama is running.');
      expect(onProviderAvailabilityChange).toHaveBeenCalledWith({
        lmstudio: 'unknown',
        ollama: 'unavailable',
      });
    });
  });

  describe('getProviderAvailability', () => {
    it('returns unknown for both providers initially', () => {
      const availability = settingsService.getProviderAvailability();

      expect(availability).toEqual({
        lmstudio: 'unknown',
        ollama: 'unknown',
      });
    });

    it('returns available for provider after successful fetch', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ models: ['model1'] });

      const onProviderAvailabilityChange = jest.fn();
      settingsService.setCallbacks({ onProviderAvailabilityChange });

      await settingsService.fetchAvailableModels();

      expect(onProviderAvailabilityChange).toHaveBeenCalledWith({
        lmstudio: 'unknown',
        ollama: 'available',
      });
      expect(settingsService.getProviderAvailability().ollama).toBe('available');
    });

    it('sets global error and unavailable when default provider fetch fails', async () => {
      mockIpcAdapter.invoke.mockResolvedValue({ error: 'Connection refused', models: [] });

      const onErrorChange = jest.fn();
      const onProviderAvailabilityChange = jest.fn();
      settingsService.setCallbacks({
        onErrorChange,
        onProviderAvailabilityChange,
      });

      await settingsService.fetchAvailableModels();

      expect(onErrorChange).toHaveBeenCalledWith(
        'Failed to fetch available models from Ollama. Please check the address and ensure Ollama is running.',
      );
      expect(onProviderAvailabilityChange).toHaveBeenCalledWith({
        lmstudio: 'unknown',
        ollama: 'unavailable',
      });
    });

    it('does not set global error when non-default provider fetch fails in loadSettings', async () => {
      const mockSettings: ISettings = {
        ...DefaultSettings,
        ollama: { address: 'http://localhost:11434', apiKey: '', model: '' },
        provider: 'ollama',
      };

      // First MODEL_LIST (ollama) succeeds, second (lmstudio) fails
      mockIpcAdapter.invoke
        .mockResolvedValueOnce(mockSettings)
        .mockResolvedValueOnce({ models: ['model1'] })
        .mockResolvedValueOnce({ error: 'Connection refused', models: [] });

      const onErrorChange = jest.fn();
      const onProviderAvailabilityChange = jest.fn();
      settingsService.setCallbacks({
        onErrorChange,
        onProviderAvailabilityChange,
      });

      await settingsService.loadSettings();

      // Global error should not be set because lmstudio is not the default provider
      expect(onErrorChange).not.toHaveBeenCalledWith(
        expect.stringContaining('LM Studio'),
      );
      expect(onProviderAvailabilityChange).toHaveBeenCalledWith(
        expect.objectContaining({ lmstudio: 'unavailable' }),
      );
      expect(settingsService.getProviderAvailability().lmstudio).toBe('unavailable');
      expect(settingsService.getProviderAvailability().ollama).toBe('available');
    });
  });

  describe('setGlobalShortcut', () => {
    it('sets global shortcut with valid shortcut', () => {
      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      const result = settingsService.setGlobalShortcut('Command+Shift+S');

      expect(result).toBe(null);
      expect(onSettingsChange).toHaveBeenCalled();
    });

    it('returns error message with invalid shortcut', () => {
      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      const result = settingsService.setGlobalShortcut('Invalid');

      expect(result).not.toBe(null);
      expect(typeof result).toBe('string');
      // Should not update settings
      expect(onSettingsChange).not.toHaveBeenCalled();
    });
  });

  describe('addPreconfiguredPrompt', () => {
    it('adds a new prompt', () => {
      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.addPreconfiguredPrompt();

      expect(onSettingsChange).toHaveBeenCalled();
    });
  });

  describe('updatePreconfiguredPrompt', () => {
    it('updates an existing prompt', () => {
      // First add a prompt
      settingsService.addPreconfiguredPrompt();

      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.updatePreconfiguredPrompt(0, 'title', 'Updated Title');
      settingsService.updatePreconfiguredPrompt(0, 'prompt', 'Updated {text}');

      expect(onSettingsChange).toHaveBeenCalled();
    });
  });

  describe('removePreconfiguredPrompt', () => {
    it('removes a prompt', () => {
      // First add a prompt
      settingsService.addPreconfiguredPrompt();

      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.removePreconfiguredPrompt(0);

      expect(onSettingsChange).toHaveBeenCalled();
    });
  });

  describe('reorderPreconfiguredPrompts', () => {
    it('reorders prompts from one index to another', () => {
      settingsService.addPreconfiguredPrompt();
      settingsService.addPreconfiguredPrompt();
      settingsService.addPreconfiguredPrompt();
      settingsService.updatePreconfiguredPrompt(0, 'title', 'First');
      settingsService.updatePreconfiguredPrompt(1, 'title', 'Second');
      settingsService.updatePreconfiguredPrompt(2, 'title', 'Third');

      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.reorderPreconfiguredPrompts(0, 2);

      expect(onSettingsChange).toHaveBeenCalled();
      const updatedSettings = onSettingsChange.mock.calls[0]?.[0];
      const prompts = updatedSettings.preconfiguredPrompts;
      expect(prompts[0].title).toBe('Second');
      expect(prompts[1].title).toBe('Third');
      expect(prompts[2].title).toBe('First');
    });

    it('does nothing when fromIndex equals toIndex', () => {
      settingsService.addPreconfiguredPrompt();

      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.reorderPreconfiguredPrompts(1, 1);

      expect(onSettingsChange).not.toHaveBeenCalled();
    });

    it('does nothing when fromIndex is negative', () => {
      settingsService.addPreconfiguredPrompt();

      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.reorderPreconfiguredPrompts(-1, 0);

      expect(onSettingsChange).not.toHaveBeenCalled();
    });

    it('does nothing when toIndex is negative', () => {
      settingsService.addPreconfiguredPrompt();

      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      settingsService.reorderPreconfiguredPrompts(0, -1);

      expect(onSettingsChange).not.toHaveBeenCalled();
    });
  });
});

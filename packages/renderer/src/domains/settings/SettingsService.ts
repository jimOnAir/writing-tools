import type { IPreconfiguredPrompt, ISettings, TIpcEvent } from '@writing-tools/shared';
import { DefaultSettings, logger, EIpcChannel, EIpcEvent } from '@writing-tools/shared';

import type { IIpcAdapter } from '../../infrastructure/ipc';
import { isValidShortcut } from '../../utils/globalShortcuts';
import { isErrorResponse } from '../../utils/responseTypeGuards';

/**
 * Service for managing settings domain logic
 * Handles settings loading, saving, model fetching, and settings management
 */
export class SettingsService {
  private readonly ipcAdapter: IIpcAdapter;
  private settings: ISettings = DefaultSettings;
  private originalSettings: ISettings = DefaultSettings;
  private availableModels: string[] = [];
  private loadingModels = false;
  private error: string | null = null;
  private success: string | null = null;

  // Callbacks for component state updates
  private onSettingsChange?: (settings: ISettings) => void;
  private onOriginalSettingsChange?: (settings: ISettings) => void;
  private onAvailableModelsChange?: (models: string[]) => void;
  private onLoadingModelsChange?: (loading: boolean) => void;
  private onErrorChange?: (error: string | null) => void;
  private onSuccessChange?: (success: string | null) => void;

  public constructor(ipcAdapter: IIpcAdapter) {
    this.ipcAdapter = ipcAdapter;
  }

  /**
   * Register callbacks for state changes
   */
  public setCallbacks(callbacks: {
    onSettingsChange?: (settings: ISettings) => void,
    onOriginalSettingsChange?: (settings: ISettings) => void,
    onAvailableModelsChange?: (models: string[]) => void,
    onLoadingModelsChange?: (loading: boolean) => void,
    onErrorChange?: (error: string | null) => void,
    onSuccessChange?: (success: string | null) => void,
  }): void {
    this.onSettingsChange = callbacks.onSettingsChange;
    this.onOriginalSettingsChange = callbacks.onOriginalSettingsChange;
    this.onAvailableModelsChange = callbacks.onAvailableModelsChange;
    this.onLoadingModelsChange = callbacks.onLoadingModelsChange;
    this.onErrorChange = callbacks.onErrorChange;
    this.onSuccessChange = callbacks.onSuccessChange;
  }

  /**
   * Load settings from main process
   */
  public async loadSettings(): Promise<void> {
    try {
      const message: TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_LOAD> = {
        channel: EIpcChannel.SETTINGS,
        event: EIpcEvent.SETTINGS_LOAD,
        payload: {},
      };

      const loadedSettings = await this.ipcAdapter.invoke(EIpcChannel.SETTINGS, message);
      this.setSettings(loadedSettings);
      this.setOriginalSettings(loadedSettings);

      // Fetch models when settings are loaded for the selected provider
      const provider = loadedSettings.provider || 'ollama';
      const address = provider === 'lmstudio'
        ? loadedSettings.lmstudio.address
        : loadedSettings.ollama.address;
      if (address) {
        await this.fetchAvailableModels();
      }
    } catch (err) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to load settings: %s', errorText);
      this.setError(errorText);
    }
  }

  /**
   * Save settings to main process
   */
  public async saveSettings(): Promise<boolean> {
    try {
      const message: TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_SAVE> = {
        channel: EIpcChannel.SETTINGS,
        event: EIpcEvent.SETTINGS_SAVE,
        payload: this.settings,
      };

      const result = await this.ipcAdapter.invoke(EIpcChannel.SETTINGS, message);

      if (result.success) {
        this.setOriginalSettings(this.settings);
        this.setSuccess('Settings saved successfully!');
        setTimeout(() => {
          this.setSuccess(null);
        }, 3000);

        return true;
      } else {
        this.setError(`Failed to save settings: ${result.error}`);
        logger.error('Failed to save settings: %s', result.error);

        return false;
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to save settings: %s', errorText);
      this.setError('Failed to save settings');

      return false;
    }
  }

  /**
   * Fetch available models from the selected provider
   */
  public async fetchAvailableModels(): Promise<void> {
    const provider = this.settings.provider || 'ollama';
    const address = provider === 'lmstudio'
      ? this.settings.lmstudio.address
      : this.settings.ollama.address;

    if (!address) {
      return;
    }

    this.setLoadingModels(true);
    this.setError(null);

    try {
      const payload: TIpcEvent<EIpcChannel.MODEL, EIpcEvent.MODEL_LIST> = {
        channel: EIpcChannel.MODEL,
        event: EIpcEvent.MODEL_LIST,
        payload: { provider },
      };

      const result = await this.ipcAdapter.invoke(EIpcChannel.MODEL, payload);

      // Models property is always present in both success and error responses
      if ('models' in result && Array.isArray(result.models)) {
        this.setAvailableModels(result.models);
      }

      if (isErrorResponse(result)) {
        // Even on error, models array is always present (empty array)
        throw new Error(result.error);
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      const providerName = provider === 'lmstudio' ? 'LM Studio' : 'Ollama';
      this.setError(`Failed to fetch available models from ${providerName}. Please check the address and ensure ${providerName} is running.`);
      logger.error('Failed to fetch models: %s', errorText);
    } finally {
      this.setLoadingModels(false);
    }
  }

  /**
   * Update provider selection
   */
  public updateProvider(provider: 'ollama' | 'lmstudio'): void {
    this.setSettings({
      ...this.settings,
      provider,
    });

    // Automatically fetch models for the new provider
    this.fetchAvailableModels().catch((err: unknown) => {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to fetch models after provider change: %s', errorText);
    });
  }

  /**
   * Update Ollama address
   */
  public updateOllamaAddress(address: string): void {
    this.setSettings({
      ...this.settings,
      ollama: {
        ...this.settings.ollama,
        address,
      },
    });

    // Automatically fetch models when address changes (if Ollama is selected)
    if (address && (this.settings.provider || 'ollama') === 'ollama') {
      this.fetchAvailableModels().catch((err: unknown) => {
        const errorText = err instanceof Error ? err.message : String(err);
        logger.error('Failed to fetch models after address change: %s', errorText);
      });
    }
  }

  /**
   * Update Ollama model
   */
  public updateOllamaModel(model: string): void {
    this.setSettings({
      ...this.settings,
      ollama: {
        ...this.settings.ollama,
        model,
      },
    });
  }

  /**
   * Update Ollama API key
   */
  public updateOllamaApiKey(apiKey: string): void {
    this.setSettings({
      ...this.settings,
      ollama: {
        ...this.settings.ollama,
        apiKey: apiKey.trim() === '' ? undefined : apiKey,
      },
    });
  }

  /**
   * Update LM Studio address
   */
  public updateLMStudioAddress(address: string): void {
    this.setSettings({
      ...this.settings,
      lmstudio: {
        ...this.settings.lmstudio,
        address,
      },
    });

    // Automatically fetch models when address changes (if LM Studio is selected)
    if (address && this.settings.provider === 'lmstudio') {
      this.fetchAvailableModels().catch((err: unknown) => {
        const errorText = err instanceof Error ? err.message : String(err);
        logger.error('Failed to fetch models after address change: %s', errorText);
      });
    }
  }

  /**
   * Update LM Studio model
   */
  public updateLMStudioModel(model: string): void {
    this.setSettings({
      ...this.settings,
      lmstudio: {
        ...this.settings.lmstudio,
        model,
      },
    });
  }

  /**
   * Update LM Studio API key
   */
  public updateLMStudioApiKey(apiKey: string): void {
    this.setSettings({
      ...this.settings,
      lmstudio: {
        ...this.settings.lmstudio,
        apiKey: apiKey.trim() === '' ? undefined : apiKey,
      },
    });
  }

  /**
   * Add or update global shortcut
   */
  public setGlobalShortcut(shortcut: string): string | null {
    if (!shortcut.trim()) {
      return 'Please enter a valid shortcut combination';
    }

    if (shortcut.trim().length < 2) {
      return 'Shortcut must be at least 2 characters long';
    }

    if (!isValidShortcut(shortcut.trim())) {
      return 'Invalid shortcut format. Please use a valid combination like Ctrl+Shift+X';
    }

    this.setSettings({
      ...this.settings,
      globalShortcut: shortcut.trim(),
    });

    this.setError(null);
    this.setSuccess('Shortcut set successfully');
    setTimeout(() => {
      this.setSuccess(null);
    }, 3000);

    return null;
  }

  /**
   * Remove global shortcut
   */
  public removeGlobalShortcut(): void {
    this.setSettings({
      ...this.settings,
      globalShortcut: undefined,
    });

    this.setSuccess('Shortcut removed successfully');
    setTimeout(() => {
      this.setSuccess(null);
    }, 3000);
  }

  /**
   * Add a new preconfigured prompt
   */
  public addPreconfiguredPrompt(): void {
    const newPrompt: IPreconfiguredPrompt = {
      title: 'New Prompt',
      prompt: 'Enter your prompt here...',
    };

    this.setSettings({
      ...this.settings,
      preconfiguredPrompts: [...this.settings.preconfiguredPrompts, newPrompt],
    });
  }

  /**
   * Remove a preconfigured prompt
   */
  public removePreconfiguredPrompt(index: number): void {
    const newPrompts = [...this.settings.preconfiguredPrompts];
    newPrompts.splice(index, 1);

    this.setSettings({
      ...this.settings,
      preconfiguredPrompts: newPrompts,
    });
  }

  /**
   * Update a preconfigured prompt
   */
  public updatePreconfiguredPrompt(index: number, field: keyof IPreconfiguredPrompt, value: string): void {
    const newPrompts = [...this.settings.preconfiguredPrompts];
    newPrompts[index] = {
      ...newPrompts[index],
      [field]: value,
    };

    this.setSettings({
      ...this.settings,
      preconfiguredPrompts: newPrompts,
    });
  }

  /**
   * Update preconfigured prompt icon from file
   */
  public async updatePreconfiguredPromptIcon(index: number, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        this.updatePreconfiguredPrompt(index, 'icon', base64);
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Cancel changes and revert to original settings
   */
  public cancelChanges(): void {
    this.setSettings(this.originalSettings);
  }

  /**
   * Check if there are unsaved changes
   */
  public hasUnsavedChanges(): boolean {
    return JSON.stringify(this.settings) !== JSON.stringify(this.originalSettings);
  }

  /**
   * Get current settings
   */
  public getSettings(): ISettings {
    return this.settings;
  }

  /**
   * Get original settings
   */
  public getOriginalSettings(): ISettings {
    return this.originalSettings;
  }

  /**
   * Get available models
   */
  public getAvailableModels(): string[] {
    return this.availableModels;
  }

  /**
   * Get loading models state
   */
  public getLoadingModels(): boolean {
    return this.loadingModels;
  }

  /**
   * Get error state
   */
  public getError(): string | null {
    return this.error;
  }

  /**
   * Get success state
   */
  public getSuccess(): string | null {
    return this.success;
  }

  // Private setters that trigger callbacks
  private setSettings(settings: ISettings): void {
    this.settings = settings;
    this.onSettingsChange?.(settings);
  }

  private setOriginalSettings(settings: ISettings): void {
    this.originalSettings = settings;
    this.onOriginalSettingsChange?.(settings);
  }

  private setAvailableModels(models: string[]): void {
    this.availableModels = models;
    this.onAvailableModelsChange?.(models);

    // Clear current model if it doesn't exist in available models
    // Only do this if models were successfully fetched (array is not empty)
    if (models.length > 0) {
      const provider = this.settings.provider || 'ollama';
      const currentModel = provider === 'lmstudio'
        ? this.settings.lmstudio.model
        : this.settings.ollama.model;

      // If current model exists but is not in available models, clear it
      if (currentModel !== undefined && !models.includes(currentModel)) {
        if (provider === 'lmstudio') {
          this.setSettings({
            ...this.settings,
            lmstudio: {
              ...this.settings.lmstudio,
              model: undefined,
            },
          });
        } else {
          this.setSettings({
            ...this.settings,
            ollama: {
              ...this.settings.ollama,
              model: undefined,
            },
          });
        }
      }
    }
  }

  private setLoadingModels(loading: boolean): void {
    this.loadingModels = loading;
    this.onLoadingModelsChange?.(loading);
  }

  private setError(error: string | null): void {
    this.error = error;
    this.onErrorChange?.(error);
  }

  private setSuccess(success: string | null): void {
    this.success = success;
    this.onSuccessChange?.(success);
  }
}

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
   * @param options.skipClearModelOnFetch - When true, fetching available models after load will not clear the default model if it is not in the list (use when loading for chat dropdown only)
   */
  public async loadSettings(options?: { skipClearModelOnFetch?: boolean }): Promise<void> {
    try {
      const message: TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_LOAD> = {
        channel: EIpcChannel.SETTINGS,
        event: EIpcEvent.SETTINGS_LOAD,
        payload: {},
      };

      const loadedSettings = await this.ipcAdapter.invoke(message.channel, message);
      this.setSettings(loadedSettings);
      this.setOriginalSettings(loadedSettings);

      const provider = loadedSettings.provider || 'ollama';
      const address = provider === 'lmstudio'
        ? loadedSettings.lmstudio.address
        : loadedSettings.ollama.address;
      if (address) {
        await this.fetchAvailableModels({ clearModelIfNotInList: options?.skipClearModelOnFetch !== true });
      }
    } catch (err) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to load settings: %s', errorText);
      this.setError(errorText);
    }
  }

  /**
   * Load settings from main process for display only (e.g. chat dropdown).
   * Does NOT update the service's this.settings, so it never overwrites in-memory settings
   * that the user may have edited in the Settings UI. Use this in the chat view so that
   * opening or re-rendering chat does not overwrite the default model in settings.
   */
  public async loadSettingsForDisplay(): Promise<ISettings> {
    const message: TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_LOAD> = {
      channel: EIpcChannel.SETTINGS,
      event: EIpcEvent.SETTINGS_LOAD,
      payload: {},
    };

    const loadedSettings = await this.ipcAdapter.invoke(message.channel, message) as ISettings;
    const provider = loadedSettings.provider || 'ollama';
    const address = provider === 'lmstudio'
      ? loadedSettings.lmstudio.address
      : loadedSettings.ollama.address;

    if (address) {
      await this.fetchModelsWithProviderAddress(
        provider,
        address,
        false,
      );
    }

    return loadedSettings;
  }

  /**
   * Save settings to main process
   */
  public async saveSettings(): Promise<boolean> {
    try {
      // When saving, keep the non-selected provider's model from last saved (originalSettings) so we never persist a stale value that came from chat or wrong UI state
      const provider = this.settings.provider ?? 'ollama';
      const payload: ISettings = {
        ...this.settings,
        ollama: {
          ...this.settings.ollama,
          model: provider === 'ollama' ? this.settings.ollama.model : this.originalSettings.ollama.model,
        },
        lmstudio: {
          ...this.settings.lmstudio,
          model: provider === 'lmstudio' ? this.settings.lmstudio.model : this.originalSettings.lmstudio.model,
        },
      };

      // #region agent log
      if (typeof fetch !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/1426d91e-479d-41a6-b4cb-9d63e420a78a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SettingsService.ts:saveSettings', message: 'renderer sending payload', data: { ollamaModel: payload?.ollama?.model, lmstudioModel: payload?.lmstudio?.model, provider: payload?.provider }, timestamp: Date.now(), hypothesisId: 'H-save' }) }).catch(() => undefined);
      }
      // #endregion
      const message: TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_SAVE> = {
        channel: EIpcChannel.SETTINGS,
        event: EIpcEvent.SETTINGS_SAVE,
        payload,
      };

      const result = await this.ipcAdapter.invoke(message.channel, message);

      if (result.success) {
        this.setOriginalSettings(payload);
        this.setSettings(payload);
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
   * @param options.clearModelIfNotInList - When false, do not clear the default model in settings if it is not in the fetched list (use when fetching for chat dropdown to avoid overwriting settings)
   */
  public async fetchAvailableModels(options?: { clearModelIfNotInList?: boolean }): Promise<void> {
    const provider = this.settings.provider || 'ollama';
    const address = provider === 'lmstudio'
      ? this.settings.lmstudio.address
      : this.settings.ollama.address;

    if (!address) {
      return;
    }

    await this.fetchModelsWithProviderAddress(
      provider,
      address,
      options?.clearModelIfNotInList !== false,
    );
  }

  private async fetchModelsWithProviderAddress(
    provider: 'ollama' | 'lmstudio',
    _address: string,
    clearModelIfNotInList: boolean,
  ): Promise<void> {
    this.setLoadingModels(true);
    this.setError(null);

    try {
      const message: TIpcEvent<EIpcChannel.MODEL, EIpcEvent.MODEL_LIST> = {
        channel: EIpcChannel.MODEL,
        event: EIpcEvent.MODEL_LIST,
        payload: { provider },
      };

      const result = await this.ipcAdapter.invoke(message.channel, message);

      if (isErrorResponse(result)) {
        throw new Error(result.error);
      } else {
        this.setAvailableModels(result.models, clearModelIfNotInList);
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      const providerName = provider === 'lmstudio' ? 'LM Studio' : 'Ollama';
      this.setAvailableModels([], clearModelIfNotInList);
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
    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/1426d91e-479d-41a6-b4cb-9d63e420a78a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SettingsService.ts:updateOllamaModel', message: 'called', data: { model }, timestamp: Date.now(), hypothesisId: 'H-update' }) }).catch(() => undefined);
    }
    // #endregion
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
    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/1426d91e-479d-41a6-b4cb-9d63e420a78a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SettingsService.ts:updateLMStudioModel', message: 'called', data: { model }, timestamp: Date.now(), hypothesisId: 'H-update' }) }).catch(() => undefined);
    }
    // #endregion
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
      icon: undefined,
      model: undefined,
      provider: undefined,
      prompt: 'Enter your prompt here...',
      title: 'New Prompt',
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
   * Reorder preconfigured prompts
   */
  public reorderPreconfiguredPrompts(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    const newPrompts = [...this.settings.preconfiguredPrompts];
    const [removed] = newPrompts.splice(fromIndex, 1);
    newPrompts.splice(toIndex, 0, removed);

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

    // Handle provider/model fields: empty string means "use default" (undefined)
    let processedValue: string | undefined = value;
    if (field === 'provider') {
      if (value.trim() === '' || (value !== 'ollama' && value !== 'lmstudio')) {
        // Empty string or invalid provider value, set to undefined
        processedValue = undefined;
      }
    } else if (field === 'model') {
      if (value.trim() === '') {
        processedValue = undefined;
      }
    }

    newPrompts[index] = {
      ...newPrompts[index],
      [field]: processedValue,
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
    const prevO = this.settings?.ollama?.model;
    const prevL = this.settings?.lmstudio?.model;
    this.settings = settings;
    this.onSettingsChange?.(settings);
    // #region agent log
    if (typeof fetch !== 'undefined' && (settings?.ollama?.model !== prevO || settings?.lmstudio?.model !== prevL)) {
      fetch('http://127.0.0.1:7242/ingest/1426d91e-479d-41a6-b4cb-9d63e420a78a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SettingsService.ts:setSettings', message: 'model changed', data: { newOllama: settings?.ollama?.model, newLmstudio: settings?.lmstudio?.model }, timestamp: Date.now(), hypothesisId: 'H-set' }) }).catch(() => undefined);
    }
    // #endregion
  }

  private setOriginalSettings(settings: ISettings): void {
    this.originalSettings = settings;
    this.onOriginalSettingsChange?.(settings);
  }

  private setAvailableModels(models: string[], clearModelIfNotInList = true): void {
    this.availableModels = models;
    this.onAvailableModelsChange?.(models);

    // Clear current model if it doesn't exist in available models (only when requested, e.g. from Settings context)
    // Skip when fetching for chat dropdown so using a custom model in chat does not overwrite settings default
    if (clearModelIfNotInList && models.length > 0) {
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

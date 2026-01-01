import type { IPreconfiguredPrompt, ISettings, TIpcEvent } from '@writing-tools/shared';
import { DefaultSettings, logger, EIpcChannel, EIpcEvent } from '@writing-tools/shared';
import React, { useState, useEffect } from 'react';

import { ButtonStyles, InputStyles } from '../styles/Styles';
import { isValidShortcut } from '../utils/globalShortcuts';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<ISettings>(DefaultSettings);
  const [originalSettings, setOriginalSettings] = useState<ISettings>(DefaultSettings);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newShortcut, setNewShortcut] = useState<string>('');
  const [success, setSuccess] = useState<string | null>(null);

  // Load settings from file or default values and fetch models
  useEffect(() => {
    const loadSettingsAndModels = async () => {
      try {
        // Check if electronAPI is available (for development mode)
        if (typeof window.electronAPI === 'undefined') {
          logger.warn('electronAPI not available, using default settings');

          return;
        }

        const message: TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_LOAD> = {
          channel: EIpcChannel.SETTINGS,
          event: EIpcEvent.SETTINGS_LOAD,
          payload: {},
        };

        const loadedSettings = await window.electronAPI.invoke(EIpcChannel.SETTINGS, message);
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);

        // Fetch models when settings are loaded
        if (loadedSettings.ollama.address) {
          fetchAvailableModelsInternal(loadedSettings.ollama.address);
        }
      } catch (err) {
        const errorText = err instanceof Error
          ? err.message
          : String(err);
        logger.error('Failed to load settings: %s', errorText);
        // Use default settings
      }
    };

    loadSettingsAndModels()
      .catch((err: unknown) => {
        const errorText = err instanceof Error
          ? err.message
          : String(err);
        logger.error('Failed to load settings: %s', errorText);
      });
  }, []);

  const fetchAvailableModelsInternal = (address?: string) => {
    if (!address) {
      return;
    }

    setLoadingModels(true);
    setError(null);

    // Use IPC to fetch models from main process

    const payload: TIpcEvent<EIpcChannel.MODEL, EIpcEvent.MODEL_LIST> = {
      channel: EIpcChannel.MODEL,
      event: EIpcEvent.MODEL_LIST,
      payload: {},
    };

    window.electronAPI.invoke(EIpcChannel.MODEL, payload)
      .then((result) => {
        if ('error' in result) {
          throw new Error(result.error);
        }

        setAvailableModels(result.models);
      })
      .catch((err: unknown) => {
        const errorText = err instanceof Error
          ? err.message
          : String(err);
        setError('Failed to fetch available models from Ollama. Please check the address and ensure Ollama is running.');
        logger.error('Failed to fetch models: %s', errorText);
      })
      .finally(() => {
        setLoadingModels(false);
      });
  };

  const fetchAvailableModels = () => {
    // Check if electronAPI is available (for development mode)
    if (typeof window.electronAPI === 'undefined') {
      logger.warn('electronAPI not available');

      return;
    }

    fetchAvailableModelsInternal(settings.ollama.address);
  };

  // Handle input changes
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setSettings(prev => ({
      ...prev,
      ollama: {
        ...prev.ollama,
        address: newAddress,
      },
    }));

    // Automatically fetch models when address changes
    if (newAddress) {
      fetchAvailableModelsInternal(newAddress);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({
      ...prev,
      ollama: {
        ...prev.ollama,
        model: e.target.value,
      },
    }));
  };

  // Handle adding a new shortcut
  const handleAddShortcut = () => {
    if (!newShortcut.trim()) {
      setError('Please enter a valid shortcut combination');

      return;
    }

    // Basic validation for shortcut format
    if (newShortcut.trim().length < 2) {
      setError('Shortcut must be at least 2 characters long');

      return;
    }

    // Validate shortcut format
    if (!isValidShortcut(newShortcut.trim())) {
      setError('Invalid shortcut format. Please use a valid combination like Ctrl+Shift+X');

      return;
    }

    // Set the new shortcut
    setSettings(prev => ({
      ...prev,
      globalShortcut: newShortcut.trim(),
    }));

    setNewShortcut('');
    setError(null);
    setSuccess('Shortcut set successfully');
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  // Handle removing a shortcut
  const handleRemoveShortcut = () => {
    setSettings(prev => ({
      ...prev,
      globalShortcut: undefined,
    }));

    setSuccess('Shortcut removed successfully');
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  // Handle adding a new preconfigured prompt
  const handleAddPreconfiguredPrompt = () => {
    const newPrompt: IPreconfiguredPrompt = {
      title: 'New Prompt',
      prompt: 'Enter your prompt here...',
    };

    setSettings(prev => ({
      ...prev,
      preconfiguredPrompts: [...(prev.preconfiguredPrompts), newPrompt],
    }));
  };

  // Handle removing a preconfigured prompt
  const handleRemovePreconfiguredPrompt = (index: number) => {
    setSettings(prev => {
      const newPrompts = [...prev.preconfiguredPrompts];
      newPrompts.splice(index, 1);

      return {
        ...prev,
        preconfiguredPrompts: newPrompts,
      };
    });
  };

  // Handle updating a preconfigured prompt
  const handleUpdatePreconfiguredPrompt = (index: number, field: keyof IPreconfiguredPrompt, value: string) => {
    setSettings(prev => {
      const newPrompts = [...prev.preconfiguredPrompts];
      newPrompts[index] = {
        ...newPrompts[index],
        [field]: value,
      };

      return {
        ...prev,
        preconfiguredPrompts: newPrompts,
      };
    });
  };

  // Handle icon file upload for a prompt
  const handleIconUpload = (index: number, file: File) => {
    // Convert file to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      // Update the prompt with the base64 icon
      handleUpdatePreconfiguredPrompt(index, 'icon', base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    // Check if electronAPI is available (for development mode)
    if (typeof window.electronAPI === 'undefined') {
      logger.warn('electronAPI not available');
      setError('Cannot save settings - application not running in Electron environment');

      return;
    }

    const message: TIpcEvent<EIpcChannel.SETTINGS, EIpcEvent.SETTINGS_SAVE> = {
      channel: EIpcChannel.SETTINGS,
      event: EIpcEvent.SETTINGS_SAVE,
      payload: settings,
    };

    window.electronAPI.invoke(EIpcChannel.SETTINGS, message)
      .then((result) => {
        if (result.success) {
          alert('Settings saved successfully!');
          // In a real implementation, you would close the window here
        } else {
          setError(`Failed to save settings: ${result.error}`);
          logger.error('Failed to save settings: %s', result.error);
        }
      }).catch((err: unknown) => {
        const errorText = err instanceof Error
          ? err.message
          : String(err);
        logger.error('Failed to save settings: %s', errorText);
        setError('Failed to save settings');
      });
  };

  // Cancel changes
  const handleCancel = () => {
    setSettings(originalSettings);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  return (
    <div className="min-h-screen p-6 font-sans bg-gray-900">
      <h2 className="text-2xl font-bold mb-6 text-white">Settings</h2>

      {error && <div className="text-red-400 mb-4">{error}</div>}
      {success && <div className="text-green-400 mb-4">{success}</div>}

      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-400">
          Ollama Address:
        </label>
        <input
          type="text"
          value={settings.ollama.address}
          onChange={handleAddressChange}
          className={InputStyles}
        />
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-400">
          Ollama Model:
        </label>
        <div className="flex items-center space-x-4">
          <select
            value={settings.ollama.model}
            onChange={handleModelChange}
            className={InputStyles}
          >
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          <button
            onClick={fetchAvailableModels}
            disabled={loadingModels}
            className={ButtonStyles.base + ' ' + (loadingModels ? ButtonStyles.disabled : ButtonStyles.primary)}
          >
            {loadingModels ? 'Loading...' : 'Refresh Models'}
          </button>
        </div>
        {loadingModels && <div className="mt-2">Fetching available models...</div>}
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4 text-white">Preconfigured Prompts</h3>
        <p className="text-gray-400 mb-4">
          These prompts will be used when processing selected text with the global shortcut.
          Use &#123;text&#125; as a placeholder for the selected content.
        </p>
        <div className="space-y-4">
          {settings.preconfiguredPrompts.map((prompt, index) => (
            <div key={index} className="p-4 bg-gray-800 rounded-lg">
              <div className="mb-3">
                <label className="block mb-1 font-medium text-gray-400">
                  Prompt Title
                </label>
                <input
                  type="text"
                  value={prompt.title}
                  onChange={(e) => {
                    handleUpdatePreconfiguredPrompt(index, 'title', e.target.value);
                  }}
                  className={InputStyles}
                />
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium text-gray-400">
                  Prompt Content
                </label>
                <textarea
                  value={prompt.prompt}
                  onChange={(e) => {
                    handleUpdatePreconfiguredPrompt(index, 'prompt', e.target.value);
                  }}
                  className={InputStyles + ' h-24'}
                />
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium text-gray-400">
                  Icon
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleIconUpload(index, e.target.files[0]);
                      }
                    }}
                    className="text-sm text-gray-500"
                  />
                  {prompt.icon && (
                    <img
                      src={prompt.icon}
                      alt="Preview"
                      className="w-8 h-8 object-contain"
                    />
                  )}
                </div>
                {prompt.icon && (
                  <p className="text-xs text-gray-500 mt-1">Icon uploaded successfully</p>
                )}
              </div>
              <button
                onClick={() => {
                  handleRemovePreconfiguredPrompt(index);
                }}
                className={ButtonStyles.base + ' ' + ButtonStyles.error}
              >
                Remove Prompt
              </button>
            </div>
          ))}
          <button
            onClick={handleAddPreconfiguredPrompt}
            className={ButtonStyles.base + ' ' + ButtonStyles.primary}
          >
            Add New Prompt
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4 text-white">Global Shortcuts</h3>
        <div className="mb-4">
          <h4 className="font-medium mb-2 text-gray-400">Configure Shortcut</h4>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={newShortcut}
              onChange={(e) => {
                setNewShortcut(e.target.value);
              }}
              placeholder="e.g., Ctrl+Shift+X"
              className={InputStyles}
            />
            <button
              onClick={handleAddShortcut}
              className={ButtonStyles.base + ' ' + ButtonStyles.primary}
            >
              Set Shortcut
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Enter a keyboard shortcut combination (e.g., Ctrl+Shift+X)
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Note: Global shortcuts work even when the application is not focused
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-2 text-gray-400">Current Shortcut</h4>
          {settings.globalShortcut ? (
            <div className="flex items-center justify-between p-3 border border-gray-600 rounded">
              <div className="flex items-center space-x-4">
                <span className="font-mono text-gray-400">{settings.globalShortcut}</span>
              </div>
              <button
                onClick={handleRemoveShortcut}
                className={ButtonStyles.base + ' ' + ButtonStyles.primary}
              >
                Remove
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No global shortcut configured.</p>
          )}
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges()}
          className={ButtonStyles.base + ' ' + (hasUnsavedChanges() ? ButtonStyles.success : ButtonStyles.disabled)}
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          disabled={!hasUnsavedChanges()}
          className={ButtonStyles.base + ' ' + (hasUnsavedChanges() ? ButtonStyles.secondary : ButtonStyles.disabled)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Settings;

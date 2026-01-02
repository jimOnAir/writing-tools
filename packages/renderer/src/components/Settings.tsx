import { DefaultSettings } from '@writing-tools/shared';
import type { IPreconfiguredPrompt } from '@writing-tools/shared';
import React, { useState, useEffect, useMemo } from 'react';

import { SettingsService } from '../domains/settings';
import { ElectronIpcAdapter } from '../infrastructure/ipc';
import { ButtonStyles, InputStyles } from '../styles/Styles';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState(useMemo(() => ({ ...DefaultSettings }), []));
  // originalSettings is managed via callback in SettingsService
  const [, setOriginalSettings] = useState(useMemo(() => ({ ...DefaultSettings }), []));
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newShortcut, setNewShortcut] = useState<string>('');
  const [success, setSuccess] = useState<string | null>(null);

  // Create service instance
  const settingsService = useMemo(() => {
    const ipcAdapter = new ElectronIpcAdapter();
    const service = new SettingsService(ipcAdapter);

    // Register callbacks
    service.setCallbacks({
      onSettingsChange: setSettings,
      onOriginalSettingsChange: setOriginalSettings,
      onAvailableModelsChange: setAvailableModels,
      onLoadingModelsChange: setLoadingModels,
      onErrorChange: setError,
      onSuccessChange: setSuccess,
    });

    return service;
  }, []);

  // Load settings on mount
  useEffect(() => {
    settingsService.loadSettings().catch(() => {
      // Error is already handled in the service
    });
  }, [settingsService]);

  const fetchAvailableModels = () => {
    settingsService.fetchAvailableModels().catch(() => {
      // Error is already handled in the service
    });
  };

  // Handle input changes
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    settingsService.updateOllamaAddress(e.target.value);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    settingsService.updateOllamaModel(e.target.value);
  };

  // Handle adding a new shortcut
  const handleAddShortcut = () => {
    const errorMsg = settingsService.setGlobalShortcut(newShortcut);
    if (errorMsg === null) {
      setNewShortcut('');
    } else {
      setError(errorMsg);
    }
  };

  // Handle removing a shortcut
  const handleRemoveShortcut = () => {
    settingsService.removeGlobalShortcut();
  };

  // Handle adding a new preconfigured prompt
  const handleAddPreconfiguredPrompt = () => {
    settingsService.addPreconfiguredPrompt();
  };

  // Handle removing a preconfigured prompt
  const handleRemovePreconfiguredPrompt = (index: number) => {
    settingsService.removePreconfiguredPrompt(index);
  };

  // Handle updating a preconfigured prompt
  const handleUpdatePreconfiguredPrompt = (index: number, field: keyof IPreconfiguredPrompt, value: string) => {
    settingsService.updatePreconfiguredPrompt(index, field, value);
  };

  // Handle icon file upload for a prompt
  // File is a browser API (not Node.js), available in renderer process
  const handleIconUpload = async (index: number, file: globalThis.File) => {
    try {
      await settingsService.updatePreconfiguredPromptIcon(index, file);
    } catch {
      setError('Failed to upload icon');
    }
  };

  const handleSave = async () => {
    const saveSuccess = await settingsService.saveSettings();
    if (saveSuccess) {
      alert('Settings saved successfully!');
    }
  };

  // Cancel changes
  const handleCancel = () => {
    settingsService.cancelChanges();
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return settingsService.hasUnsavedChanges();
  };

  return (
    <div className="min-h-screen p-6 font-sans bg-gray-900">
      <h2 className="text-2xl font-bold mb-6 text-white">Settings</h2>

      {error && <div className="text-red-400 mb-4">{error}</div>}
      {success && <div className="text-green-400 mb-4">{success}</div>}

      <div className="mb-6">
        <label htmlFor="ollama-address" className="block mb-2 font-medium text-gray-400">
          Ollama Address:
        </label>
        <input
          id="ollama-address"
          type="text"
          value={settings.ollama.address}
          onChange={handleAddressChange}
          className={InputStyles}
        />
      </div>

      <div className="mb-6">
        <label htmlFor="ollama-model" className="block mb-2 font-medium text-gray-400">
          Ollama Model:
        </label>
        <div className="flex items-center space-x-4">
          <select
            id="ollama-model"
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
            className={`${ButtonStyles.base} ${loadingModels ? ButtonStyles.disabled : ButtonStyles.primary}`}
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
          {settings.preconfiguredPrompts.map((prompt, index) => {
            const indexStr = String(index);

            return (
              <div key={`${prompt.title}-${indexStr}`} className="p-4 bg-gray-800 rounded-lg">
                <div className="mb-3">
                  <label htmlFor={`prompt-title-${indexStr}`} className="block mb-1 font-medium text-gray-400">
                    Prompt Title
                  </label>
                  <input
                    id={`prompt-title-${indexStr}`}
                    type="text"
                    value={prompt.title}
                    onChange={(e) => {
                      handleUpdatePreconfiguredPrompt(index, 'title', e.target.value);
                    }}
                    className={InputStyles}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor={`prompt-content-${indexStr}`} className="block mb-1 font-medium text-gray-400">
                    Prompt Content
                  </label>
                  <textarea
                    id={`prompt-content-${indexStr}`}
                    value={prompt.prompt}
                    onChange={(e) => {
                      handleUpdatePreconfiguredPrompt(index, 'prompt', e.target.value);
                    }}
                    className={`${InputStyles} h-24`}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor={`prompt-icon-${indexStr}`} className="block mb-1 font-medium text-gray-400">
                    Icon
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      id={`prompt-icon-${indexStr}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleIconUpload(index, file);
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
                  className={`${ButtonStyles.base} ${ButtonStyles.error}`}
                >
                  Remove Prompt
                </button>
              </div>
            );
          })}
          <button
            onClick={handleAddPreconfiguredPrompt}
            className={`${ButtonStyles.base} ${ButtonStyles.primary}`}
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
              className={`${ButtonStyles.base} ${ButtonStyles.primary}`}
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
                className={`${ButtonStyles.base} ${ButtonStyles.primary}`}
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
          onClick={() => {
            void handleSave();
          }}
          disabled={!hasUnsavedChanges()}
          className={`${ButtonStyles.base} ${hasUnsavedChanges() ? ButtonStyles.success : ButtonStyles.disabled}`}
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          disabled={!hasUnsavedChanges()}
          className={`${ButtonStyles.base} ${hasUnsavedChanges() ? ButtonStyles.secondary : ButtonStyles.disabled}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Settings;

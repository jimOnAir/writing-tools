import React, { useState, useEffect } from 'react';
import { ISettings } from './interfaces/ISettings';
import { isValidShortcut } from './utils/globalShortcuts';
import { ButtonStyles, InputStyles } from './styles/Styles';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<ISettings>({
    ollama: {
      address: 'http://localhost:11434',
      model: undefined,
    },
    globalShortcut: undefined
  });
  const [originalSettings, setOriginalSettings] = useState<ISettings | null>(null);
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
          console.warn('electronAPI not available, using default settings');
          return;
        }
        console.log('Attempting to load settings via electronAPI');
        const loadedSettings = await window.electronAPI.invoke('load-settings');
        console.log('Loaded settings:', loadedSettings);
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);

        // Fetch models when settings are loaded
        if (loadedSettings.ollama?.address) {
          await fetchAvailableModelsInternal(loadedSettings.ollama.address);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        // Use default settings
      }
    };

    loadSettingsAndModels();
  }, []);

  // Fetch available models from Ollama using IPC communication
  const fetchAvailableModelsInternal = async (address?: string) => {
    if (!address) return;

    setLoadingModels(true);
    setError(null);

    try {
      // Use IPC to fetch models from main process
      const result = await window.electronAPI.invoke('fetch-ollama-models', address);

      if (result.error) {
        throw new Error(result.error);
      }

      const models = result.models.map((model: any) => model.name);
      setAvailableModels(models);
    } catch (err: any) {
      setError('Failed to fetch available models from Ollama. Please check the address and ensure Ollama is running.');
      console.error('Failed to fetch models:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  const fetchAvailableModels = async () => {
    // Check if electronAPI is available (for development mode)
    if (typeof window.electronAPI === 'undefined') {
      console.warn('electronAPI not available');
      return;
    }

    await fetchAvailableModelsInternal(settings.ollama.address);
  };

  // Handle input changes
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setSettings(prev => ({
      ...prev,
      ollama: {
        ...prev.ollama,
        address: newAddress
      }
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
        model: e.target.value
      }
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
      globalShortcut: newShortcut.trim()
    }));

    setNewShortcut('');
    setError(null);
    setSuccess('Shortcut set successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Handle removing a shortcut
  const handleRemoveShortcut = () => {
    setSettings(prev => ({
      ...prev,
      globalShortcut: undefined
    }));

    setSuccess('Shortcut removed successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Save settings to file
  const handleSave = async () => {
    try {
      // Check if electronAPI is available (for development mode)
      if (typeof window.electronAPI === 'undefined') {
        console.warn('electronAPI not available');
        setError('Cannot save settings - application not running in Electron environment');
        return;
      }

      const result = await window.electronAPI.invoke('save-settings', settings);
      if (result.success) {
        alert('Settings saved successfully!');
        // In a real implementation, you would close the window here
      } else {
        setError(`Failed to save settings: ${result.error}`);
        console.error('Failed to save settings:', result.error);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    }
  };

  // Cancel changes
  const handleCancel = () => {
    // Check if electronAPI is available (for development mode)
    if (typeof window.electronAPI === 'undefined') {
      console.warn('electronAPI not available');
      return;
    }

    // Reload settings from main process to revert changes
    window.electronAPI.invoke('load-settings').then((loadedSettings: ISettings) => {
      setSettings(loadedSettings);
    });
    // In a real implementation, you would close the window here
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!originalSettings) {
      return false;
    }
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
            className={ButtonStyles.base + " " + (loadingModels ? ButtonStyles.disabled : ButtonStyles.primary)}
          >
            {loadingModels ? 'Loading...' : 'Refresh Models'}
          </button>
        </div>
        {loadingModels && <div className="mt-2">Fetching available models...</div>}
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4 text-white">Global Shortcuts</h3>
        <div className="mb-4">
          <h4 className="font-medium mb-2 text-gray-400">Configure Shortcut</h4>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={newShortcut}
              onChange={(e) => setNewShortcut(e.target.value)}
              placeholder="e.g., Ctrl+Shift+X"
              className={InputStyles}
            />
            <button
              onClick={handleAddShortcut}
              className={ButtonStyles.base + " " + ButtonStyles.primary}
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
                className={ButtonStyles.base + " " + ButtonStyles.primary}
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
          className={ButtonStyles.base + " " + ButtonStyles.success}
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          disabled={!hasUnsavedChanges()}
          className={ButtonStyles.base + " " + (hasUnsavedChanges() ? ButtonStyles.secondary : ButtonStyles.disabled)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Settings;

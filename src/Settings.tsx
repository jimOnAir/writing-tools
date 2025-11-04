import React, { useState, useEffect } from 'react';
import { ISettings } from './interfaces/ISettings';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<ISettings>({
    ollama: {
      address: 'http://localhost:11434',
      model: undefined,
    },
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="p-6 font-sans">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="mb-6">
        <label className="block mb-2 font-medium">
          Ollama Address:
        </label>
        <input
          type="text"
          value={settings.ollama.address}
          onChange={handleAddressChange}
          className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
        />
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-medium">
          Ollama Model:
        </label>
        <div className="flex items-center space-x-4">
          <select
            value={settings.ollama.model}
            onChange={handleModelChange}
            className="flex-1 p-2 border border-gray-300 rounded bg-white text-gray-900"
          >
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          <button
            onClick={fetchAvailableModels}
            disabled={loadingModels}
            className={`px-4 py-2 rounded border ${
              loadingModels
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'
            }`}
          >
            {loadingModels ? 'Loading...' : 'Refresh Models'}
          </button>
        </div>
        {loadingModels && <div className="mt-2">Fetching available models...</div>}
      </div>

      <div>
        <button
          onClick={handleSave}
          className="px-4 py-2 mr-2 rounded border border-green-600 bg-green-600 text-white hover:bg-green-700"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded border border-gray-600 bg-gray-600 text-white hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Settings;

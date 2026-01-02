import { DefaultSettings } from '@writing-tools/shared';
import type { IPreconfiguredPrompt } from '@writing-tools/shared';
import React, { useState, useEffect, useMemo } from 'react';

import { SettingsService } from '../domains/settings';
import { ElectronIpcAdapter } from '../infrastructure/ipc';
import { BackgroundStyles, TypographyStyles, LayoutStyles } from '../styles/Styles';

import { GlobalShortcutsSection } from './settings/GlobalShortcutsSection';
import { OllamaSettingsSection } from './settings/OllamaSettingsSection';
import { PreconfiguredPromptsSection } from './settings/PreconfiguredPromptsSection';
import { SettingsActions } from './settings/SettingsActions';
import { SettingsNotifications } from './settings/SettingsNotifications';

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
  const handleAddressChange = (value: string) => {
    settingsService.updateOllamaAddress(value);
  };

  const handleModelChange = (value: string) => {
    settingsService.updateOllamaModel(value);
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
    <div className={`min-h-screen p-4 font-sans ${BackgroundStyles.main}`}>
      <div className={LayoutStyles.container}>
        <h2 className={TypographyStyles.h1}>Settings</h2>
        <p className={`${TypographyStyles.subtitle} mb-6`}>Configure your application preferences</p>

        <SettingsNotifications error={error} success={success} />

        <OllamaSettingsSection
          address={settings.ollama.address}
          model={settings.ollama.model}
          availableModels={availableModels}
          loadingModels={loadingModels}
          onAddressChange={handleAddressChange}
          onModelChange={handleModelChange}
          onRefreshModels={fetchAvailableModels}
        />

        <PreconfiguredPromptsSection
          prompts={settings.preconfiguredPrompts}
          onAdd={handleAddPreconfiguredPrompt}
          onUpdate={handleUpdatePreconfiguredPrompt}
          onIconUpload={handleIconUpload}
          onRemove={handleRemovePreconfiguredPrompt}
        />

        <GlobalShortcutsSection
          currentShortcut={settings.globalShortcut}
          newShortcut={newShortcut}
          onNewShortcutChange={setNewShortcut}
          onSetShortcut={handleAddShortcut}
          onRemoveShortcut={handleRemoveShortcut}
        />

        <SettingsActions
          hasUnsavedChanges={hasUnsavedChanges()}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default Settings;

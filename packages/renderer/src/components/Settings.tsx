import { DefaultSettings } from '@writing-tools/shared';
import type { IPreconfiguredPrompt, ISettings } from '@writing-tools/shared';
import React, { useState, useEffect, useMemo } from 'react';

import type { SettingsService } from '../domains/settings';
import { BackgroundStyles, TypographyStyles, LayoutStyles, InputStyles } from '../styles/Styles';

import { GlobalShortcutsSection } from './settings/GlobalShortcutsSection';
import { LMStudioSettingsSection } from './settings/LMStudioSettingsSection';
import { OllamaSettingsSection } from './settings/OllamaSettingsSection';
import { PreconfiguredPromptsSection } from './settings/PreconfiguredPromptsSection';
import { SettingsActions } from './settings/SettingsActions';
import { SettingsNotifications } from './settings/SettingsNotifications';

interface SettingsProps {
  readonly settingsService: SettingsService;
  readonly isModal?: boolean;
}

// TODO: stick close button. Make it distinct from remove prompt button
// TODO: Fix editing title, it looses focus on keyup
// TODO: Sort prompts with drag and drop

const Settings: React.FC<SettingsProps> = ({ settingsService, isModal = false }) => {
  const [settings, setSettings] = useState<ISettings>(useMemo(() => ({ ...DefaultSettings }), []));
  // originalSettings is managed via callback in SettingsService, but component doesn't need to track it
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newShortcut, setNewShortcut] = useState<string>('');
  const [success, setSuccess] = useState<string | null>(null);

  // Register callbacks
  useEffect(() => {
    settingsService.setCallbacks({
      onSettingsChange: setSettings,
      onOriginalSettingsChange: () => {
        // Component doesn't need to track originalSettings, service handles it internally
      },
      onAvailableModelsChange: setAvailableModels,
      onLoadingModelsChange: setLoadingModels,
      onErrorChange: setError,
      onSuccessChange: setSuccess,
    });
  }, [settingsService]);

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

  // Handle provider change
  const handleProviderChange = (value: string) => {
    settingsService.updateProvider(value as 'ollama' | 'lmstudio');
  };

  // Handle Ollama input changes
  const handleOllamaAddressChange = (value: string) => {
    settingsService.updateOllamaAddress(value);
  };

  const handleOllamaModelChange = (value: string) => {
    settingsService.updateOllamaModel(value);
  };

  const handleOllamaApiKeyChange = (value: string) => {
    settingsService.updateOllamaApiKey(value);
  };

  // Handle LM Studio input changes
  const handleLMStudioAddressChange = (value: string) => {
    settingsService.updateLMStudioAddress(value);
  };

  const handleLMStudioModelChange = (value: string) => {
    settingsService.updateLMStudioModel(value);
  };

  const handleLMStudioApiKeyChange = (value: string) => {
    settingsService.updateLMStudioApiKey(value);
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
    <div className={isModal ? 'font-sans' : `min-h-screen p-4 font-sans ${BackgroundStyles.main}`}>
      <div className={isModal ? '' : LayoutStyles.container}>
        {!isModal && (
          <>
            <h2 className={TypographyStyles.h1}>Settings</h2>
            <p className={`${TypographyStyles.subtitle} mb-6`}>Configure your application preferences</p>
          </>
        )}

        <SettingsNotifications error={error} success={success} />

        <div className={`${LayoutStyles.sectionCard} ${BackgroundStyles.card} mb-6`}>
          <label htmlFor="llm-provider" className={TypographyStyles.label}>
            Default Provider
          </label>
          <select
            id="llm-provider"
            value={settings.provider || 'ollama'}
            onChange={(e) => {
              handleProviderChange(e.target.value);
            }}
            className={InputStyles}
          >
            <option value="ollama">Ollama</option>
            <option value="lmstudio">LM Studio</option>
          </select>
        </div>

        <OllamaSettingsSection
          address={settings.ollama.address}
          model={settings.ollama.model}
          apiKey={settings.ollama.apiKey}
          availableModels={availableModels}
          loadingModels={loadingModels}
          onAddressChange={handleOllamaAddressChange}
          onModelChange={handleOllamaModelChange}
          onApiKeyChange={handleOllamaApiKeyChange}
          onRefreshModels={fetchAvailableModels}
        />

        <LMStudioSettingsSection
          address={settings.lmstudio.address}
          model={settings.lmstudio.model}
          apiKey={settings.lmstudio.apiKey}
          availableModels={availableModels}
          loadingModels={loadingModels}
          onAddressChange={handleLMStudioAddressChange}
          onModelChange={handleLMStudioModelChange}
          onApiKeyChange={handleLMStudioApiKeyChange}
          onRefreshModels={fetchAvailableModels}
        />

        <PreconfiguredPromptsSection
          prompts={settings.preconfiguredPrompts}
          settings={settings}
          availableModels={availableModels}
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

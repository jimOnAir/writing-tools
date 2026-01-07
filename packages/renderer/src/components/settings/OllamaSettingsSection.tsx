import React from 'react';

import { ButtonStyles, ButtonSizeStyles, InputStyles, BackgroundStyles, TypographyStyles, LayoutStyles, SpinnerIcon, ColorPalette } from '../../styles/Styles';

export interface OllamaSettingsSectionProps {
  readonly address: string;
  readonly model: string | undefined;
  readonly apiKey: string | undefined;
  readonly availableModels: string[];
  readonly loadingModels: boolean;
  readonly onAddressChange: (value: string) => void;
  readonly onModelChange: (value: string) => void;
  readonly onApiKeyChange: (value: string) => void;
  readonly onRefreshModels: () => void;
}

export const OllamaSettingsSection: React.FC<OllamaSettingsSectionProps> = ({
  address,
  model,
  apiKey,
  availableModels,
  loadingModels,
  onAddressChange,
  onModelChange,
  onApiKeyChange,
  onRefreshModels,
}) => {
  return (
    <div className={`${LayoutStyles.sectionCard} ${BackgroundStyles.card}`}>
      <h3 className={TypographyStyles.h2}>Ollama Settings</h3>
      <div className="space-y-3">
        <div>
          <label htmlFor="ollama-address" className={TypographyStyles.label}>
            Ollama Address
          </label>
          <input
            id="ollama-address"
            type="text"
            value={address}
            onChange={(e) => {
              onAddressChange(e.target.value);
            }}
            className={InputStyles}
            placeholder="http://localhost:11434"
          />
        </div>

        <div>
          <label htmlFor="ollama-apikey" className={TypographyStyles.label}>
            Ollama API Key (Optional)
          </label>
          <input
            id="ollama-apikey"
            type="password"
            value={apiKey ?? ''}
            onChange={(e) => {
              onApiKeyChange(e.target.value);
            }}
            className={InputStyles}
            placeholder="Enter API key if required"
          />
        </div>

        <div>
          <label htmlFor="ollama-model" className={TypographyStyles.label}>
            Default Model
          </label>
          <div className="flex items-center gap-3">
            <select
              id="ollama-model"
              value={model ?? ''}
              onChange={(e) => {
                onModelChange(e.target.value);
              }}
              className={InputStyles}
            >
              {availableModels.map(modelOption => (
                <option key={modelOption} value={modelOption}>{modelOption}</option>
              ))}
            </select>
            <button
              onClick={onRefreshModels}
              disabled={loadingModels}
              className={`${ButtonStyles.base} ${ButtonSizeStyles.default} ${loadingModels ? ButtonStyles.disabled : ButtonStyles.primary} whitespace-nowrap`}
            >
              {loadingModels ? (
                <span className="flex items-center">
                  <SpinnerIcon />
                  Loading...
                </span>
              ) : (
                'Refresh Models'
              )}
            </button>
          </div>
          {loadingModels && <div className={`mt-3 text-sm ${ColorPalette.text.muted}`}>Fetching available models...</div>}
        </div>
      </div>
    </div>
  );
};

import React from 'react';

import { ButtonStyles, InputStyles, BackgroundStyles, TypographyStyles, LayoutStyles, SpinnerIcon } from '../../styles/Styles';

interface OllamaSettingsSectionProps {
  readonly address: string;
  readonly model: string | undefined;
  readonly availableModels: string[];
  readonly loadingModels: boolean;
  readonly onAddressChange: (value: string) => void;
  readonly onModelChange: (value: string) => void;
  readonly onRefreshModels: () => void;
}

export const OllamaSettingsSection: React.FC<OllamaSettingsSectionProps> = ({
  address,
  model,
  availableModels,
  loadingModels,
  onAddressChange,
  onModelChange,
  onRefreshModels,
}) => {
  return (
    <>
      <div className={`${LayoutStyles.sectionCard} ${BackgroundStyles.card}`}>
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

      <div className={`${LayoutStyles.sectionCard} ${BackgroundStyles.card}`}>
        <label htmlFor="ollama-model" className={TypographyStyles.label}>
          Ollama Model
        </label>
        <div className="flex items-center space-x-4">
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
            className={`${ButtonStyles.base} ${loadingModels ? ButtonStyles.disabled : ButtonStyles.primary} whitespace-nowrap`}
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
        {loadingModels && <div className="mt-3 text-sm text-gray-400">Fetching available models...</div>}
      </div>
    </>
  );
};

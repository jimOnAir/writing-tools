import React from 'react';

import { ButtonStyles, InputStyles, BackgroundStyles, TypographyStyles, LayoutStyles, SpinnerIcon, ColorPalette } from '../../styles/Styles';

interface LMStudioSettingsSectionProps {
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

export const LMStudioSettingsSection: React.FC<LMStudioSettingsSectionProps> = ({
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
    <>
      <div className={`${LayoutStyles.sectionCard} ${BackgroundStyles.card}`}>
        <label htmlFor="lmstudio-address" className={TypographyStyles.label}>
          LM Studio Address
        </label>
        <input
          id="lmstudio-address"
          type="text"
          value={address}
          onChange={(e) => {
            onAddressChange(e.target.value);
          }}
          className={InputStyles}
          placeholder="http://localhost:1234"
        />
      </div>

      <div className={`${LayoutStyles.sectionCard} ${BackgroundStyles.card}`}>
        <label htmlFor="lmstudio-apikey" className={TypographyStyles.label}>
          LM Studio API Key (Optional)
        </label>
        <input
          id="lmstudio-apikey"
          type="password"
          value={apiKey ?? ''}
          onChange={(e) => {
            onApiKeyChange(e.target.value);
          }}
          className={InputStyles}
          placeholder="Enter API key if required"
        />
      </div>

      <div className={`${LayoutStyles.sectionCard} ${BackgroundStyles.card}`}>
        <label htmlFor="lmstudio-model" className={TypographyStyles.label}>
          LM Studio Model
        </label>
        <div className="flex items-center gap-3">
          <select
            id="lmstudio-model"
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
        {loadingModels && <div className={`mt-3 text-sm ${ColorPalette.text.muted}`}>Fetching available models...</div>}
      </div>
    </>
  );
};

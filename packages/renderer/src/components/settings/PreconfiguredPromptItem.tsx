import type { IPreconfiguredPrompt, ISettings } from '@writing-tools/shared';
import React, { useMemo } from 'react';

import {
  ButtonSizeStyles,
  ButtonStyles,
  CardStyles,
  FileInputStyles,
  InputStyles,
  TypographyStyles,
} from '../../styles/Styles';
import { CloseIcon } from '../icons';

export interface PreconfiguredPromptItemProps {
  readonly prompt: IPreconfiguredPrompt;
  readonly index: number;
  readonly settings: ISettings;
  readonly availableModels: string[];
  readonly onUpdate: (index: number, field: keyof IPreconfiguredPrompt, value: string) => void;
  readonly onIconUpload: (index: number, file: globalThis.File) => Promise<void>;
  readonly onRemove: (index: number) => void;
}

export const PreconfiguredPromptItem: React.FC<PreconfiguredPromptItemProps> = ({
  prompt,
  index,
  settings,
  availableModels,
  onUpdate,
  onIconUpload,
  onRemove,
}) => {
  const indexStr = String(index);

  // Get configured providers (providers with address set)
  const configuredProviders = useMemo(() => {
    const providers: Array<'ollama' | 'lmstudio'> = [];
    if (settings.ollama.address && settings.ollama.address.trim() !== '') {
      providers.push('ollama');
    }
    if (settings.lmstudio.address && settings.lmstudio.address.trim() !== '') {
      providers.push('lmstudio');
    }

    return providers;
  }, [settings]);

  // Get models to show based on selected provider or default provider
  const modelsToShow = useMemo(() => {
    // For now, show availableModels which are for the currently selected provider in settings
    // In the future, we could fetch models per provider separately
    return availableModels;
  }, [availableModels]);

  return (
    <div className={`${CardStyles.promptItemCard} relative`}>
      <button
        onClick={() => {
          onRemove(index);
        }}
        className={`
          absolute top-2 right-2 flex items-center gap-1.5
          ${ButtonStyles.base} ${ButtonStyles.ghost} ${ButtonSizeStyles.default}
          hover:text-red-400 whitespace-nowrap
        `}
        aria-label="Remove prompt"
      >
        <CloseIcon size={16} />
        Remove
      </button>
      <div className="mb-3">
        <label htmlFor={`prompt-title-${indexStr}`} className={TypographyStyles.label}>
          Title
        </label>
        <input
          id={`prompt-title-${indexStr}`}
          type="text"
          value={prompt.title}
          onChange={(e) => {
            onUpdate(index, 'title', e.target.value);
          }}
          className={InputStyles}
          placeholder="Enter prompt title"
        />
      </div>
      <div className="mb-3 flex items-center gap-3">
        {prompt.icon && (
          <img
            src={prompt.icon}
            alt="Icon preview"
            className="w-8 h-8 object-contain rounded"
          />
        )}
        <div className={FileInputStyles.wrapper}>
          <input
            id={`prompt-icon-${indexStr}`}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void onIconUpload(index, file);
              }
            }}
            className={FileInputStyles.input}
          />
          <label
            htmlFor={`prompt-icon-${indexStr}`}
            className={FileInputStyles.label}
          >
            {prompt.icon ? 'Change Icon' : 'Upload Icon'}
          </label>
        </div>
      </div>
      <div className="mb-3">
        <label htmlFor={`prompt-content-${indexStr}`} className={TypographyStyles.label}>
          Prompt
        </label>
        <textarea
          id={`prompt-content-${indexStr}`}
          value={prompt.prompt}
          onChange={(e) => {
            onUpdate(index, 'prompt', e.target.value);
          }}
          className={`${InputStyles} h-24`}
          placeholder="Enter prompt content. Use {text} as placeholder."
        />
      </div>
      <div className="mb-3">
        <label htmlFor={`prompt-provider-${indexStr}`} className={TypographyStyles.label}>
          Provider (Optional)
        </label>
        <select
          id={`prompt-provider-${indexStr}`}
          value={prompt.provider ?? ''}
          onChange={(e) => {
            onUpdate(index, 'provider', e.target.value);
          }}
          className={InputStyles}
        >
          <option value="">Use default</option>
          {configuredProviders.includes('ollama') && (
            <option value="ollama">Ollama</option>
          )}
          {configuredProviders.includes('lmstudio') && (
            <option value="lmstudio">LM Studio</option>
          )}
        </select>
      </div>
      <div className="mb-3">
        <label htmlFor={`prompt-model-${indexStr}`} className={TypographyStyles.label}>
          Model (Optional)
        </label>
        <select
          id={`prompt-model-${indexStr}`}
          value={prompt.model ?? ''}
          onChange={(e) => {
            onUpdate(index, 'model', e.target.value);
          }}
          className={InputStyles}
        >
          <option value="">Use default model</option>
          {modelsToShow.map(modelOption => (
            <option key={modelOption} value={modelOption}>{modelOption}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

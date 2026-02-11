import type { IPreconfiguredPrompt, ISettings } from '@writing-tools/shared';
import React, { useMemo } from 'react';

import type { TAvailableModelsByProvider } from '../../domains/settings/SettingsTypes';
import { getNativeStyles } from '../../styles/NativeStyles';
import {
  ButtonSizeStyles,
  ButtonStyles,
  CardStyles,
  ColorPalette,
  FileInputStyles,
  InputStyles,
  TypographyStyles,
} from '../../styles/Styles';
import { CloseIcon, GripIcon } from '../icons';

export interface PreconfiguredPromptItemProps {
  readonly availableModelsByProvider: TAvailableModelsByProvider;
  readonly index: number;
  readonly platform: 'darwin' | 'win32' | 'linux';
  readonly prompt: IPreconfiguredPrompt;
  readonly settings: ISettings;
  readonly isDragging?: boolean;
  readonly isDragOver?: boolean;
  readonly onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  readonly onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  readonly onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
  readonly onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
  readonly onIconUpload: (index: number, file: globalThis.File) => Promise<void>;
  readonly onRemove: (index: number) => void;
  readonly onUpdate: (index: number, field: keyof IPreconfiguredPrompt, value: string) => void;
}

export const PreconfiguredPromptItem: React.FC<PreconfiguredPromptItemProps> = ({
  availableModelsByProvider,
  index,
  platform,
  prompt,
  settings,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onUpdate,
  onIconUpload,
  onRemove,
}) => {
  const indexStr = String(index);
  const nativeStyles = getNativeStyles(platform);

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

  // Get models to show based on this prompt's provider or default provider
  const modelsToShow = useMemo(() => {
    const provider = prompt.provider ?? settings.provider ?? 'ollama';

    return provider === 'lmstudio' ? availableModelsByProvider.lmstudio : availableModelsByProvider.ollama;
  }, [availableModelsByProvider.lmstudio, availableModelsByProvider.ollama, prompt.provider, settings.provider]);

  const handleCardDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    onDragOver?.(e);
  };

  const handleCardDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    onDrop?.(e);
  };

  const preventDefaultDrag = (e: React.DragEvent<HTMLElement>): void => {
    e.preventDefault();
  };

  return (
    <div
      className={`
        ${CardStyles.promptItemCard} relative
        ${isDragging ? nativeStyles.tabs.tab.dragging : ''}
        ${isDragOver ? nativeStyles.tabs.tab.dragOver : ''}
      `}
      data-prompt-index={indexStr}
      onDragOver={handleCardDragOver}
      onDrop={handleCardDrop}
    >
      <div className="absolute right-0 top-5">
        <button
          onClick={() => {
            onRemove(index);
          }}
          className={`
            flex items-center gap-1.5
            ${ButtonStyles.base} ${ButtonStyles.ghost} ${ButtonSizeStyles.default}
            hover:text-red-400 whitespace-nowrap
          `}
          aria-label="Remove prompt"
        >
          <CloseIcon size={16} />
        </button>
      </div>
      {onDragStart !== undefined && (
        <div
          aria-label="Drag to reorder"
          className={`absolute bottom-0 left-0 top-0 flex w-10 cursor-grab active:cursor-grabbing items-center justify-center opacity-70 hover:opacity-100 ${ColorPalette.text.muted}`}
          data-testid="prompt-drag-handle"
          draggable
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
        >
          <GripIcon size={24} />
        </div>
      )}
      <div
        className={`flex-1 min-w-0 ${onDragStart !== undefined ? 'pl-10' : ''}`}
      >
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
            onDragOver={preventDefaultDrag}
            onDrop={preventDefaultDrag}
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
              onDragOver={preventDefaultDrag}
              onDrop={preventDefaultDrag}
            />
          )}
          <div className={FileInputStyles.wrapper} onDragOver={preventDefaultDrag} onDrop={preventDefaultDrag}>
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
            onDragOver={preventDefaultDrag}
            onDrop={preventDefaultDrag}
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
            onDragOver={preventDefaultDrag}
            onDrop={preventDefaultDrag}
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
            onDragOver={preventDefaultDrag}
            onDrop={preventDefaultDrag}
            className={InputStyles}
          >
            <option value="">Use default model</option>
            {modelsToShow.map(modelOption => (
              <option key={modelOption} value={modelOption}>{modelOption}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

import type { IPreconfiguredPrompt } from '@writing-tools/shared';
import React from 'react';

import { ButtonStyles, InputStyles, TypographyStyles, CardStyles, FileInputStyles, ColorPalette } from '../../styles/Styles';

interface PreconfiguredPromptItemProps {
  readonly prompt: IPreconfiguredPrompt;
  readonly index: number;
  readonly onUpdate: (index: number, field: keyof IPreconfiguredPrompt, value: string) => void;
  readonly onIconUpload: (index: number, file: globalThis.File) => Promise<void>;
  readonly onRemove: (index: number) => void;
}

export const PreconfiguredPromptItem: React.FC<PreconfiguredPromptItemProps> = ({
  prompt,
  index,
  onUpdate,
  onIconUpload,
  onRemove,
}) => {
  const indexStr = String(index);

  return (
    <div className={CardStyles.promptItemCard}>
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
            className={`w-8 h-8 object-contain rounded ${ColorPalette.border.defaultSubtle}`}
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
      <button
        onClick={() => {
          onRemove(index);
        }}
        className={`${ButtonStyles.base} ${ButtonStyles.ghost} whitespace-nowrap`}
      >
        Remove
      </button>
    </div>
  );
};

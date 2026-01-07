import type { IPreconfiguredPrompt, ISettings } from '@writing-tools/shared';
import React from 'react';

import { ButtonStyles, ButtonSizeStyles, TypographyStyles, LayoutStyles, BackgroundStyles } from '../../styles/Styles';

import { PreconfiguredPromptItem } from './PreconfiguredPromptItem';

export interface PreconfiguredPromptsSectionProps {
  readonly prompts: IPreconfiguredPrompt[];
  readonly settings: ISettings;
  readonly availableModels: string[];
  readonly onAdd: () => void;
  readonly onUpdate: (index: number, field: keyof IPreconfiguredPrompt, value: string) => void;
  readonly onIconUpload: (index: number, file: globalThis.File) => Promise<void>;
  readonly onRemove: (index: number) => void;
}

export const PreconfiguredPromptsSection: React.FC<PreconfiguredPromptsSectionProps> = ({
  prompts,
  settings,
  availableModels,
  onAdd,
  onUpdate,
  onIconUpload,
  onRemove,
}) => {
  return (
    <div className={`${LayoutStyles.sectionCard} ${BackgroundStyles.card}`}>
      <h3 className={TypographyStyles.h2}>Preconfigured Prompts</h3>
      <p className={TypographyStyles.description}>
        These prompts will be used when processing selected text with the global shortcut.
        Use &#123;text&#125; as a placeholder for the selected content.
      </p>
      <div className="space-y-3">
        {prompts.map((prompt, index) => {
          const indexStr = String(index);

          return (
            <PreconfiguredPromptItem
              key={`${prompt.title}-${indexStr}`}
              prompt={prompt}
              index={index}
              settings={settings}
              availableModels={availableModels}
              onUpdate={onUpdate}
              onIconUpload={onIconUpload}
              onRemove={onRemove}
            />
          );
        })}
        <button
          onClick={onAdd}
          className={`${ButtonStyles.base} ${ButtonSizeStyles.default} ${ButtonStyles.primary} w-full whitespace-nowrap`}
        >
          Add Prompt
        </button>
      </div>
    </div>
  );
};

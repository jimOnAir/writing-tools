import type { IPreconfiguredPrompt } from '@writing-tools/shared';
import React from 'react';

import { ButtonStyles, TypographyStyles, LayoutStyles } from '../../styles/Styles';

import { PreconfiguredPromptItem } from './PreconfiguredPromptItem';

interface PreconfiguredPromptsSectionProps {
  readonly prompts: IPreconfiguredPrompt[];
  readonly onAdd: () => void;
  readonly onUpdate: (index: number, field: keyof IPreconfiguredPrompt, value: string) => void;
  readonly onIconUpload: (index: number, file: globalThis.File) => Promise<void>;
  readonly onRemove: (index: number) => void;
}

export const PreconfiguredPromptsSection: React.FC<PreconfiguredPromptsSectionProps> = ({
  prompts,
  onAdd,
  onUpdate,
  onIconUpload,
  onRemove,
}) => {
  return (
    <div className={LayoutStyles.section}>
      <h3 className={TypographyStyles.h2}>Preconfigured Prompts</h3>
      <p className={TypographyStyles.description}>
        These prompts will be used when processing selected text with the global shortcut.
        Use &#123;text&#125; as a placeholder for the selected content.
      </p>
      <div className="space-y-4">
        {prompts.map((prompt, index) => {
          const indexStr = String(index);

          return (
            <PreconfiguredPromptItem
              key={`${prompt.title}-${indexStr}`}
              prompt={prompt}
              index={index}
              onUpdate={onUpdate}
              onIconUpload={onIconUpload}
              onRemove={onRemove}
            />
          );
        })}
        <button
          onClick={onAdd}
          className={`${ButtonStyles.base} ${ButtonStyles.primary} w-full`}
        >
          + Add New Prompt
        </button>
      </div>
    </div>
  );
};

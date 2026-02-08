import type { IPreconfiguredPrompt, ISettings } from '@writing-tools/shared';
import React, { useState, useEffect, useRef } from 'react';

import { ButtonStyles, ButtonSizeStyles, TypographyStyles, LayoutStyles, BackgroundStyles } from '../../styles/Styles';
import { getPlatform } from '../../utils/platformDetection';

import { PreconfiguredPromptItem } from './PreconfiguredPromptItem';

export interface PreconfiguredPromptsSectionProps {
  readonly prompts: IPreconfiguredPrompt[];
  readonly settings: ISettings;
  readonly availableModels: string[];
  readonly onAdd: () => void;
  readonly onIconUpload: (index: number, file: globalThis.File) => Promise<void>;
  readonly onRemove: (index: number) => void;
  readonly onReorder: (fromIndex: number, toIndex: number) => void;
  readonly onUpdate: (index: number, field: keyof IPreconfiguredPrompt, value: string) => void;
}
// TOOD: Add optional global shortcut for prompts
export const PreconfiguredPromptsSection: React.FC<PreconfiguredPromptsSectionProps> = ({
  prompts,
  settings,
  availableModels,
  onAdd,
  onReorder,
  onUpdate,
  onIconUpload,
  onRemove,
}) => {
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void getPlatform().then(p => {
      setPlatform(p);
    });
  }, []);

  const findPromptAtIndexPosition = (clientX: number, clientY: number): number | null => {
    if (listRef.current === null) {
      return null;
    }

    const elements = listRef.current.querySelectorAll('[data-prompt-index]');
    let targetIndex: number | null = null;
    let minDistance = Infinity;

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const indexAttr = el.getAttribute('data-prompt-index');
      const index = indexAttr !== null ? parseInt(indexAttr, 10) : NaN;

      if (Number.isNaN(index)) {
        return;
      }

      if (clientY >= rect.top && clientY <= rect.bottom && clientX >= rect.left && clientX <= rect.right) {
        targetIndex = index;
        minDistance = 0;
      } else if (minDistance > 0) {
        const centerY = rect.top + rect.height / 2;
        const centerX = rect.left + rect.width / 2;
        const distance = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));

        if (distance < minDistance && distance < 150) {
          minDistance = distance;
          targetIndex = index;
        }
      }
    });

    return targetIndex;
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number): void => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));

    const dragImage = globalThis.document.createElement('div');
    dragImage.style.width = '1px';
    dragImage.style.height = '1px';
    dragImage.style.opacity = '0';
    dragImage.style.pointerEvents = 'none';
    globalThis.document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);

    globalThis.window.setTimeout(() => {
      if (dragImage.parentNode !== null) {
        dragImage.parentNode.removeChild(dragImage);
      }
    }, 0);

    setDraggedIndex(index);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, index: number): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (index !== dragOverIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, targetIndex: number): void => {
    event.preventDefault();

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  };

  const handleDragEnd = (): void => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onReorder(draggedIndex, dragOverIndex);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleListDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null) {
      return;
    }

    const targetIndex = findPromptAtIndexPosition(event.clientX, event.clientY);

    if (targetIndex !== null && targetIndex !== draggedIndex && targetIndex !== dragOverIndex) {
      setDragOverIndex(targetIndex);
    }
  };

  const handleListDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();

    if (draggedIndex === null) {
      return;
    }

    let targetIndex = dragOverIndex;
    if (targetIndex === null || targetIndex === draggedIndex) {
      targetIndex = findPromptAtIndexPosition(event.clientX, event.clientY);
      if (targetIndex !== null && targetIndex !== draggedIndex) {
        setDragOverIndex(targetIndex);
      }
    }
  };

  return (
    <div className={`${LayoutStyles.sectionCard} ${BackgroundStyles.card}`}>
      <h3 className={TypographyStyles.h2}>Preconfigured Prompts</h3>
      <p className={TypographyStyles.description}>
        These prompts will be used when processing selected text with the global shortcut.
        Use &#123;text&#125; as a placeholder for the selected content.
      </p>
      <div
        ref={listRef}
        className="space-y-3"
        onDragOver={handleListDragOver}
        onDrop={handleListDrop}
      >
        {prompts.map((prompt, index) => {
          const indexStr = String(index);

          return (
            <PreconfiguredPromptItem
              key={indexStr}
              prompt={prompt}
              index={index}
              platform={platform}
              settings={settings}
              availableModels={availableModels}
              isDragging={draggedIndex === index}
              isDragOver={dragOverIndex === index}
              onDragStart={(e) => {
                handleDragStart(e, index);
              }}
              onDragOver={(e) => {
                handleDragOver(e, index);
              }}
              onDrop={(e) => {
                handleDrop(e, index);
              }}
              onDragEnd={handleDragEnd}
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

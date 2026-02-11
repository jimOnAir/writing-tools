import { render, screen, fireEvent, createEvent, act, waitFor } from '@testing-library/react';
import type { IPreconfiguredPrompt, ISettings } from '@writing-tools/shared';
import { DefaultSettings } from '@writing-tools/shared';
import React from 'react';

import type { PreconfiguredPromptsSectionProps } from './PreconfiguredPromptsSection';
import { PreconfiguredPromptsSection } from './PreconfiguredPromptsSection';

type MockPreconfiguredPromptItemProps = {
  availableModelsByProvider: { lmstudio: string[], ollama: string[] },
  index: number,
  onRemove: (index: number) => void,
  prompt: IPreconfiguredPrompt,
  settings: ISettings,
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void,
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void,
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void,
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void,
};

// Mock PreconfiguredPromptItem
jest.mock('./PreconfiguredPromptItem', () => ({
  PreconfiguredPromptItem: jest.fn((props: MockPreconfiguredPromptItemProps) => {
    return (
      <div
        data-prompt-index={props.index}
        data-testid={`prompt-item-${props.index}`}
        draggable={props.onDragStart !== undefined}
        onDragStart={props.onDragStart}
        onDragOver={props.onDragOver}
        onDrop={props.onDrop}
        onDragEnd={props.onDragEnd}
      >
        <div>{props.prompt.title}</div>
        <button
          aria-label="Remove prompt"
          onClick={() => {
            props.onRemove(props.index);
          }}
        />
      </div>
    );
  }),
}));

jest.mock('../../utils/platformDetection', () => ({
  getPlatform: jest.fn().mockResolvedValue('linux'),
}));

describe('PreconfiguredPromptsSection', () => {
  const defaultProps: PreconfiguredPromptsSectionProps = {
    availableModelsByProvider: { lmstudio: [], ollama: [] },
    onAdd: jest.fn(),
    onIconUpload: jest.fn().mockResolvedValue(undefined),
    onRemove: jest.fn(),
    onReorder: jest.fn(),
    onUpdate: jest.fn(),
    prompts: [] as IPreconfiguredPrompt[],
    settings: DefaultSettings,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders section with add button', () => {
    render(<PreconfiguredPromptsSection {...defaultProps} />);

    expect(screen.getByText('Preconfigured Prompts')).toBeInTheDocument();
    expect(screen.getByText('Add Prompt')).toBeInTheDocument();
  });

  it('renders list of prompts', () => {
    const prompts: IPreconfiguredPrompt[] = [
      { prompt: 'Test {text}', title: 'Prompt 1' },
      { prompt: 'Another {text}', title: 'Prompt 2' },
    ];

    render(<PreconfiguredPromptsSection {...defaultProps} prompts={prompts} />);

    expect(screen.getByText('Prompt 1')).toBeInTheDocument();
    expect(screen.getByText('Prompt 2')).toBeInTheDocument();
  });

  it('calls onAdd when add button is clicked', () => {
    render(<PreconfiguredPromptsSection {...defaultProps} />);

    const addButton = screen.getByText('Add Prompt');
    fireEvent.click(addButton);

    expect(defaultProps.onAdd).toHaveBeenCalled();
  });

  it('calls onRemove when remove is clicked on a prompt', () => {
    const prompts: IPreconfiguredPrompt[] = [
      { prompt: 'Test {text}', title: 'Prompt 1' },
    ];

    render(<PreconfiguredPromptsSection {...defaultProps} prompts={prompts} />);

    const removeButton = screen.getByLabelText('Remove prompt');
    fireEvent.click(removeButton);

    expect(defaultProps.onRemove).toHaveBeenCalled();
  });

  it('calls onReorder when prompts are reordered via drag and drop', async () => {
    const prompts: IPreconfiguredPrompt[] = [
      { prompt: 'Test 1', title: 'Prompt 1' },
      { prompt: 'Test 2', title: 'Prompt 2' },
    ];

    render(<PreconfiguredPromptsSection {...defaultProps} prompts={prompts} />);

    await act(async () => {
      await waitFor(() => {
        expect(screen.getByTestId('prompt-item-0')).toBeInTheDocument();
      });
    });

    const firstItem = screen.getByTestId('prompt-item-0');
    const secondItem = screen.getByTestId('prompt-item-1');

    const data: Record<string, string> = {};
    const mockDataTransfer = {
      clearData: jest.fn(),
      dropEffect: 'move' as const,
      effectAllowed: 'move' as const,
      getData: jest.fn((format: string): string => data[format] ?? ''),
      setData: jest.fn((format: string, dataValue: string): void => {
        data[format] = dataValue;
      }),
      setDragImage: jest.fn(),
    };

    const dragStartEvent = createEvent.dragStart(firstItem);
    Object.defineProperty(dragStartEvent, 'dataTransfer', { value: mockDataTransfer });
    fireEvent(firstItem, dragStartEvent);

    const dragOverEvent = createEvent.dragOver(secondItem);
    Object.defineProperty(dragOverEvent, 'dataTransfer', { value: mockDataTransfer });
    Object.defineProperty(dragOverEvent, 'preventDefault', { value: jest.fn() });
    fireEvent(secondItem, dragOverEvent);

    const dropEvent = createEvent.drop(secondItem);
    Object.defineProperty(dropEvent, 'dataTransfer', { value: mockDataTransfer });
    Object.defineProperty(dropEvent, 'preventDefault', { value: jest.fn() });
    fireEvent(secondItem, dropEvent);

    const dragEndEvent = createEvent.dragEnd(firstItem);
    Object.defineProperty(dragEndEvent, 'dataTransfer', { value: mockDataTransfer });
    fireEvent(firstItem, dragEndEvent);

    expect(defaultProps.onReorder).toHaveBeenCalledWith(0, 1);
  });
});

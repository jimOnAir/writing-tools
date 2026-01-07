import { render, screen, fireEvent } from '@testing-library/react';
import type { IPreconfiguredPrompt, ISettings } from '@writing-tools/shared';
import { DefaultSettings } from '@writing-tools/shared';
import React from 'react';

import type { PreconfiguredPromptsSectionProps } from './PreconfiguredPromptsSection';
import { PreconfiguredPromptsSection } from './PreconfiguredPromptsSection';

type MockPreconfiguredPromptItemProps = {
  onRemove: (index: number) => void,
  prompt: IPreconfiguredPrompt,
  settings: ISettings,
};

// Mock PreconfiguredPromptItem
jest.mock('./PreconfiguredPromptItem', () => ({
  PreconfiguredPromptItem: jest.fn((props: MockPreconfiguredPromptItemProps) => {
    return (
      <div>
        <div>{props.prompt.title}</div>
        <button onClick={() => {
          props.onRemove(0);
        }}>Remove</button>
      </div>
    );
  }),
}));

describe('PreconfiguredPromptsSection', () => {
  const defaultProps: PreconfiguredPromptsSectionProps = {
    prompts: [] as IPreconfiguredPrompt[],
    settings: DefaultSettings,
    availableModels: [],
    onAdd: jest.fn(),
    onUpdate: jest.fn(),
    onIconUpload: jest.fn().mockResolvedValue(undefined),
    onRemove: jest.fn(),
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

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    expect(defaultProps.onRemove).toHaveBeenCalled();
  });
});

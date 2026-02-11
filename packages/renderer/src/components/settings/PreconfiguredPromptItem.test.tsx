import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { IPreconfiguredPrompt, ISettings } from '@writing-tools/shared';
import { DefaultSettings } from '@writing-tools/shared';
import React from 'react';

import { PreconfiguredPromptItem } from './PreconfiguredPromptItem';

describe('PreconfiguredPromptItem', () => {
  const mockPrompt: IPreconfiguredPrompt = {
    title: 'Test Prompt',
    prompt: 'Test {text}',
  };

  const mockSettings: ISettings = {
    ...DefaultSettings,
    ollama: {
      ...DefaultSettings.ollama,
      address: 'http://localhost:11434',
    },
    lmstudio: {
      ...DefaultSettings.lmstudio,
      address: 'http://localhost:1234',
    },
  };

  const mockAvailableModels = ['model1', 'model2', 'model3'];
  const mockAvailableModelsByProvider = { lmstudio: [] as string[], ollama: mockAvailableModels };

  let onUpdate: jest.Mock;
  let onIconUpload: jest.Mock;
  let onRemove: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    onUpdate = jest.fn();
    onIconUpload = jest.fn().mockResolvedValue(undefined);
    onRemove = jest.fn();
  });

  it('renders prompt item with title and prompt', () => {
    render(
      <PreconfiguredPromptItem
        prompt={mockPrompt}
        index={0}
        platform="linux"
        settings={mockSettings}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByDisplayValue('Test Prompt')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test {text}')).toBeInTheDocument();
  });

  it('calls onUpdate when title is changed', () => {
    render(
      <PreconfiguredPromptItem
        prompt={mockPrompt}
        index={0}
        platform="linux"
        settings={mockSettings}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    expect(onUpdate).toHaveBeenCalledWith(0, 'title', 'New Title');
  });

  it('calls onUpdate when prompt is changed', () => {
    render(
      <PreconfiguredPromptItem
        prompt={mockPrompt}
        index={0}
        platform="linux"
        settings={mockSettings}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    const promptTextarea = screen.getByLabelText('Prompt');
    fireEvent.change(promptTextarea, { target: { value: 'New {text}' } });

    expect(onUpdate).toHaveBeenCalledWith(0, 'prompt', 'New {text}');
  });

  it('calls onIconUpload when icon file is selected', async () => {
    // Create a mock File object for testing
    const file = {
      name: 'icon.png',
      type: 'image/png',
      size: 4,
    } as globalThis.File;

    render(
      <PreconfiguredPromptItem
        prompt={mockPrompt}
        index={0}
        platform="linux"
        settings={mockSettings}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    const fileInput = screen.getByLabelText('Upload Icon');
    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(onIconUpload).toHaveBeenCalledWith(0, file);
    });
  });

  it('displays icon when icon is provided', () => {
    const promptWithIcon: IPreconfiguredPrompt = {
      ...mockPrompt,
      icon: 'data:image/png;base64,test',
    };

    render(
      <PreconfiguredPromptItem
        prompt={promptWithIcon}
        index={0}
        platform="linux"
        settings={mockSettings}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    const iconImage = screen.getByAltText('Icon preview');
    expect(iconImage).toBeInTheDocument();
    expect(iconImage).toHaveAttribute('src', 'data:image/png;base64,test');
  });

  it('shows "Change Icon" when icon exists', () => {
    const promptWithIcon: IPreconfiguredPrompt = {
      ...mockPrompt,
      icon: 'data:image/png;base64,test',
    };

    render(
      <PreconfiguredPromptItem
        prompt={promptWithIcon}
        index={0}
        platform="linux"
        settings={mockSettings}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText('Change Icon')).toBeInTheDocument();
  });

  it('shows "Upload Icon" when icon does not exist', () => {
    render(
      <PreconfiguredPromptItem
        prompt={mockPrompt}
        index={0}
        platform="linux"
        settings={mockSettings}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText('Upload Icon')).toBeInTheDocument();
  });

  it('shows only configured providers in provider dropdown', () => {
    const settingsWithOnlyOllama: ISettings = {
      ...DefaultSettings,
      ollama: {
        ...DefaultSettings.ollama,
        address: 'http://localhost:11434',
      },
      lmstudio: {
        ...DefaultSettings.lmstudio,
        address: '',
      },
    };

    render(
      <PreconfiguredPromptItem
        prompt={mockPrompt}
        index={0}
        platform="linux"
        settings={settingsWithOnlyOllama}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    const providerSelect = screen.getByLabelText('Provider (Optional)');
    expect(providerSelect).toBeInTheDocument();
    expect(providerSelect).toHaveValue('');
    expect(providerSelect.querySelector('option[value="ollama"]')).toBeInTheDocument();
    expect(providerSelect.querySelector('option[value="lmstudio"]')).not.toBeInTheDocument();
  });

  it('shows all configured providers in provider dropdown', () => {
    render(
      <PreconfiguredPromptItem
        prompt={mockPrompt}
        index={0}
        platform="linux"
        settings={mockSettings}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    const providerSelect = screen.getByLabelText('Provider (Optional)');
    expect(providerSelect).toBeInTheDocument();
    expect(providerSelect.querySelector('option[value="ollama"]')).toBeInTheDocument();
    expect(providerSelect.querySelector('option[value="lmstudio"]')).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    render(
      <PreconfiguredPromptItem
        prompt={mockPrompt}
        index={0}
        platform="linux"
        settings={mockSettings}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    const removeButton = screen.getByLabelText('Remove prompt');
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('has correct labels associated with inputs', () => {
    render(
      <PreconfiguredPromptItem
        prompt={mockPrompt}
        index={0}
        platform="linux"
        settings={mockSettings}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    const titleInput = screen.getByLabelText('Title');
    const promptTextarea = screen.getByLabelText('Prompt');

    expect(titleInput).toHaveAttribute('id', 'prompt-title-0');
    expect(promptTextarea).toHaveAttribute('id', 'prompt-content-0');
  });

  it('renders drag handle and passes drag handlers when provided', () => {
    const onDragStart = jest.fn();
    const onDragOver = jest.fn();
    const onDrop = jest.fn();
    const onDragEnd = jest.fn();

    render(
      <PreconfiguredPromptItem
        prompt={mockPrompt}
        index={0}
        platform="linux"
        settings={mockSettings}
        availableModelsByProvider={mockAvailableModelsByProvider}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onUpdate={onUpdate}
        onIconUpload={onIconUpload}
        onRemove={onRemove}
      />,
    );

    const dragHandle = screen.getByTestId('prompt-drag-handle');
    expect(dragHandle).toBeInTheDocument();
    expect(dragHandle).toHaveAttribute('draggable', 'true');

    fireEvent.dragStart(dragHandle);
    expect(onDragStart).toHaveBeenCalled();
  });
});

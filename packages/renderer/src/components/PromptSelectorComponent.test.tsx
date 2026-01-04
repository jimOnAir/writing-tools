import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { IPreconfiguredPrompt } from '@writing-tools/shared';
import React from 'react';

import type { PromptSelectorService } from '../domains/prompt-selector';

import PromptSelectorComponent from './PromptSelectorComponent';

describe('PromptSelectorComponent', () => {
  let mockPromptSelectorService: jest.Mocked<PromptSelectorService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPromptSelectorService = {
      setCallbacks: jest.fn(),
      initializeListeners: jest.fn(),
      cleanupListeners: jest.fn(),
      selectPrompt: jest.fn().mockResolvedValue(undefined),
      submitCustomPrompt: jest.fn().mockResolvedValue(undefined),
      getSelectedText: jest.fn().mockReturnValue(''),
      getPreconfiguredPrompts: jest.fn().mockReturnValue([]),
      setPromptSelectorData: jest.fn(),
    } as unknown as jest.Mocked<PromptSelectorService>;
  });

  it('renders component with selected text', () => {
    mockPromptSelectorService.getSelectedText.mockReturnValue('Selected text');

    render(<PromptSelectorComponent promptSelectorService={mockPromptSelectorService} />);

    expect(screen.getByText('Select a Prompt')).toBeInTheDocument();
  });

  it('displays selected text', async () => {
    mockPromptSelectorService.getSelectedText.mockReturnValue('Selected text content');

    let onSelectedTextChange: ((text: string) => void) | undefined;

    mockPromptSelectorService.setCallbacks.mockImplementation((callbacks) => {
      onSelectedTextChange = callbacks.onSelectedTextChange;
    });

    render(<PromptSelectorComponent promptSelectorService={mockPromptSelectorService} />);

    const callback = onSelectedTextChange;
    if (callback) {
      act(() => {
        callback('Updated selected text');
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/Updated selected text/)).toBeInTheDocument();
    });
  });

  it('displays empty state when no text is selected', () => {
    mockPromptSelectorService.getSelectedText.mockReturnValue('');

    render(<PromptSelectorComponent promptSelectorService={mockPromptSelectorService} />);

    expect(screen.getByText(/No text selected/)).toBeInTheDocument();
  });

  it('renders preconfigured prompts', () => {
    const mockPrompts: IPreconfiguredPrompt[] = [
      { title: 'Prompt 1', prompt: 'Test {text}' },
      { title: 'Prompt 2', prompt: 'Another {text}' },
    ];

    mockPromptSelectorService.getPreconfiguredPrompts.mockReturnValue(mockPrompts);

    let onPromptsChange: ((prompts: IPreconfiguredPrompt[]) => void) | undefined;

    mockPromptSelectorService.setCallbacks.mockImplementation((callbacks) => {
      onPromptsChange = callbacks.onPromptsChange;
    });

    render(<PromptSelectorComponent promptSelectorService={mockPromptSelectorService} />);

    const callback = onPromptsChange;
    if (callback) {
      act(() => {
        callback(mockPrompts);
      });
    }

    expect(screen.getByText('Prompt 1')).toBeInTheDocument();
    expect(screen.getByText('Prompt 2')).toBeInTheDocument();
  });

  it('calls selectPrompt when prompt is clicked', async () => {
    const mockPrompts: IPreconfiguredPrompt[] = [
      { title: 'Prompt 1', prompt: 'Test {text}' },
    ];

    mockPromptSelectorService.getPreconfiguredPrompts.mockReturnValue(mockPrompts);

    let onPromptsChange: ((prompts: IPreconfiguredPrompt[]) => void) | undefined;

    mockPromptSelectorService.setCallbacks.mockImplementation((callbacks) => {
      onPromptsChange = callbacks.onPromptsChange;
    });

    render(<PromptSelectorComponent promptSelectorService={mockPromptSelectorService} />);

    const callback = onPromptsChange;
    if (callback) {
      act(() => {
        callback(mockPrompts);
      });
    }

    const promptButton = screen.getByText('Prompt 1');
    fireEvent.click(promptButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockPromptSelectorService.selectPrompt).toHaveBeenCalledWith('Test {text}');
    });
  });

  it('submits custom prompt when send button is clicked', async () => {
    mockPromptSelectorService.getSelectedText.mockReturnValue('Selected text');

    render(<PromptSelectorComponent promptSelectorService={mockPromptSelectorService} />);

    const textarea = screen.getByPlaceholderText('Enter your custom prompt...');
    fireEvent.change(textarea, { target: { value: 'Custom prompt' } });

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockPromptSelectorService.submitCustomPrompt).toHaveBeenCalledWith('Custom prompt');
    });
  });

  it('submits custom prompt on Enter key press', async () => {
    mockPromptSelectorService.getSelectedText.mockReturnValue('Selected text');

    render(<PromptSelectorComponent promptSelectorService={mockPromptSelectorService} />);

    const textarea = screen.getByPlaceholderText('Enter your custom prompt...');
    fireEvent.change(textarea, { target: { value: 'Custom prompt' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockPromptSelectorService.submitCustomPrompt).toHaveBeenCalledWith('Custom prompt');
    });
  });

  it('does not submit on Shift+Enter', () => {
    mockPromptSelectorService.getSelectedText.mockReturnValue('Selected text');

    render(<PromptSelectorComponent promptSelectorService={mockPromptSelectorService} />);

    const textarea = screen.getByPlaceholderText('Enter your custom prompt...');
    fireEvent.change(textarea, { target: { value: 'Custom prompt' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockPromptSelectorService.submitCustomPrompt).not.toHaveBeenCalled();
  });

  it('disables send button when custom prompt is empty', () => {
    render(<PromptSelectorComponent promptSelectorService={mockPromptSelectorService} />);

    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when custom prompt has content', () => {
    render(<PromptSelectorComponent promptSelectorService={mockPromptSelectorService} />);

    const textarea = screen.getByPlaceholderText('Enter your custom prompt...');
    fireEvent.change(textarea, { target: { value: 'Custom prompt' } });

    const sendButton = screen.getByText('Send');
    expect(sendButton).not.toBeDisabled();
  });

  it('clears custom prompt after submission', async () => {
    mockPromptSelectorService.getSelectedText.mockReturnValue('Selected text');

    render(<PromptSelectorComponent promptSelectorService={mockPromptSelectorService} />);

    const textarea = screen.getByPlaceholderText('Enter your custom prompt...');
    fireEvent.change(textarea, { target: { value: 'Custom prompt' } });

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });
});

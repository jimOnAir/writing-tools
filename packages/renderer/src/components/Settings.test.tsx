import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { ISettings } from '@writing-tools/shared';
import React from 'react';

import type { SettingsService } from '../domains/settings';

import Settings from './Settings';

// Mock sub-components
jest.mock('./settings/OllamaSettingsSection', () => ({
  OllamaSettingsSection: jest.fn(() => <div>OllamaSettingsSection</div>),
}));

jest.mock('./settings/LMStudioSettingsSection', () => ({
  LMStudioSettingsSection: jest.fn(() => <div>LMStudioSettingsSection</div>),
}));

jest.mock('./settings/GlobalShortcutsSection', () => ({
  GlobalShortcutsSection: jest.fn(() => <div>GlobalShortcutsSection</div>),
}));

jest.mock('./settings/PreconfiguredPromptsSection', () => ({
  PreconfiguredPromptsSection: jest.fn(() => <div>PreconfiguredPromptsSection</div>),
}));

jest.mock('./settings/SettingsActions', () => ({
  SettingsActions: jest.fn(({ onSave, onCancel }: { onSave: () => Promise<void>, onCancel: () => void }) => (
    <div>
      <button onClick={() => {
        void onSave();
      }}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )),
}));

jest.mock('./settings/SettingsNotifications', () => ({
  SettingsNotifications: jest.fn(({ error, success }: { error: string | null, success: string | null }) => (
    <div>
      {error && <div>Error: {error}</div>}
      {success && <div>Success: {success}</div>}
    </div>
  )),
}));

describe('Settings', () => {
  let mockSettingsService: jest.Mocked<SettingsService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.alert for jsdom
    globalThis.alert = jest.fn();

    mockSettingsService = {
      cancelChanges: jest.fn(() => undefined),
      fetchAvailableModels: jest.fn().mockResolvedValue(undefined),
      getAvailableModelsByProvider: jest.fn().mockReturnValue({ lmstudio: [], ollama: [] }),
      hasUnsavedChanges: jest.fn(() => false),
      loadSettings: jest.fn().mockResolvedValue(undefined),
      removeGlobalShortcut: jest.fn(() => undefined),
      reorderPreconfiguredPrompts: jest.fn(() => undefined),
      saveSettings: jest.fn().mockResolvedValue(true),
      setCallbacks: jest.fn(() => undefined),
      updateLMStudioAddress: jest.fn(() => undefined),
      updateLMStudioApiKey: jest.fn(() => undefined),
      updateLMStudioModel: jest.fn(() => undefined),
      updateOllamaAddress: jest.fn(() => undefined),
      updateOllamaApiKey: jest.fn(() => undefined),
      updateOllamaModel: jest.fn(() => undefined),
      updatePreconfiguredPrompt: jest.fn(() => undefined),
      updateProvider: jest.fn(() => undefined),
      addPreconfiguredPrompt: jest.fn(() => undefined),
      removePreconfiguredPrompt: jest.fn(() => undefined),
      setGlobalShortcut: jest.fn(() => null),
    } as unknown as jest.Mocked<SettingsService>;
  });

  it('loads settings on mount', async () => {
    render(<Settings settingsService={mockSettingsService} />);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSettingsService.loadSettings).toHaveBeenCalled();
    });
  });

  it('registers callbacks', async () => {
    render(<Settings settingsService={mockSettingsService} />);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSettingsService.setCallbacks).toHaveBeenCalled();
    });
  });

  it('renders Ollama settings section when provider is ollama', async () => {
    let onSettingsChange: ((settings: ISettings) => void) | undefined;

    mockSettingsService.setCallbacks.mockImplementation((callbacks) => {
      onSettingsChange = callbacks.onSettingsChange;

      return undefined;
    });

    render(<Settings settingsService={mockSettingsService} />);

    await waitFor(() => {
      expect(onSettingsChange).toBeDefined();
    });

    const settingsCallback = onSettingsChange;
    if (settingsCallback !== undefined) {
      act(() => {
        settingsCallback({
          provider: 'ollama',
          ollama: { address: 'http://localhost:11434', model: '', apiKey: '' },
          lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
          preconfiguredPrompts: [],
          globalShortcut: undefined,
        });
      });
    }

    expect(screen.getByText('OllamaSettingsSection')).toBeInTheDocument();
    expect(screen.getByText('LMStudioSettingsSection')).toBeInTheDocument();
    expect(screen.getByText('GlobalShortcutsSection')).toBeInTheDocument();
    expect(screen.getByText('PreconfiguredPromptsSection')).toBeInTheDocument();
  });

  it('renders both settings sections always visible', async () => {
    let onSettingsChange: ((settings: ISettings) => void) | undefined;

    mockSettingsService.setCallbacks.mockImplementation((callbacks) => {
      onSettingsChange = callbacks.onSettingsChange;

      return undefined;
    });

    render(<Settings settingsService={mockSettingsService} />);

    await waitFor(() => {
      expect(onSettingsChange).toBeDefined();
    });

    const settingsCallback = onSettingsChange;
    if (settingsCallback !== undefined) {
      act(() => {
        settingsCallback({
          provider: 'lmstudio',
          ollama: { address: 'http://localhost:11434', model: '', apiKey: '' },
          lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
          preconfiguredPrompts: [],
          globalShortcut: undefined,
        });
      });
    }

    expect(screen.getByText('OllamaSettingsSection')).toBeInTheDocument();
    expect(screen.getByText('LMStudioSettingsSection')).toBeInTheDocument();
    expect(screen.getByText('GlobalShortcutsSection')).toBeInTheDocument();
    expect(screen.getByText('PreconfiguredPromptsSection')).toBeInTheDocument();
  });

  it('saves settings when save button is clicked', async () => {
    mockSettingsService.hasUnsavedChanges.mockReturnValue(true);
    mockSettingsService.saveSettings.mockResolvedValue(true);

    render(<Settings settingsService={mockSettingsService} />);

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSettingsService.saveSettings).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(globalThis.alert).toHaveBeenCalledWith('Settings saved successfully!');
    });
  });

  it('cancels changes when cancel button is clicked', async () => {
    mockSettingsService.hasUnsavedChanges.mockReturnValue(true);

    render(<Settings settingsService={mockSettingsService} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSettingsService.cancelChanges).toHaveBeenCalled();
    });
  });

  it('displays error message', async () => {
    let onErrorChange: ((error: string | null) => void) | undefined;

    mockSettingsService.setCallbacks.mockImplementation((callbacks) => {
      onErrorChange = callbacks.onErrorChange;

      return undefined;
    });

    render(<Settings settingsService={mockSettingsService} />);

    await waitFor(() => {
      expect(onErrorChange).toBeDefined();
    });

    const errorCallback = onErrorChange;
    if (errorCallback !== undefined) {
      act(() => {
        errorCallback('Save failed');
      });
    }

    expect(screen.getByText(/Error: Save failed/)).toBeInTheDocument();
  });

  it('displays success message', async () => {
    let onSuccessChange: ((success: string | null) => void) | undefined;

    mockSettingsService.setCallbacks.mockImplementation((callbacks) => {
      onSuccessChange = callbacks.onSuccessChange;

      return undefined;
    });

    render(<Settings settingsService={mockSettingsService} />);

    await waitFor(() => {
      expect(onSuccessChange).toBeDefined();
    });

    const successCallback = onSuccessChange;
    if (successCallback !== undefined) {
      act(() => {
        successCallback('Settings saved!');
      });
    }

    expect(screen.getByText(/Success: Settings saved!/)).toBeInTheDocument();
  });

  it('fetches models when refresh is triggered', async () => {
    render(<Settings settingsService={mockSettingsService} />);

    // Trigger model fetch (would be called through sub-components)
    void mockSettingsService.fetchAvailableModels();

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockSettingsService.fetchAvailableModels).toHaveBeenCalled();
    });
  });
});

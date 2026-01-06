import { render, screen, waitFor } from '@testing-library/react';
import { EIpcEvent } from '@writing-tools/shared';
import React from 'react';

import App from './App';

// Mock electronAPI for testing
const mockElectronAPI = {
  // eslint-disable-next-line @typescript-eslint/require-await
  invoke: jest.fn(async (_channel, data: { event: EIpcEvent }) => {
    // Return appropriate mock responses based on event type
    if (data.event === EIpcEvent.CHAT_LIST_CHATS) {
      return { chats: [] };
    }
    if (data.event === EIpcEvent.ENV_GET) {
      return { platform: 'linux' };
    }
    if (data.event === EIpcEvent.SETTINGS_LOAD) {
      return {
        provider: 'ollama',
        ollama: { address: 'http://localhost:11434', model: '', apiKey: '' },
        lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
        preconfiguredPrompts: [],
        globalShortcut: null,
      };
    }

    // Default response for other events
    return { success: true };
  }),
  onChatWindowData: jest.fn(() => jest.fn()),
  offChatWindowData: jest.fn(),
  onOllamaResponse: jest.fn(() => jest.fn()),
  offOllamaResponse: jest.fn(),
  onPromptSelectorData: jest.fn(() => jest.fn()),
  offPromptSelectorData: jest.fn(),
  onChatTitleUpdated: jest.fn(() => jest.fn()),
  offChatTitleUpdated: jest.fn(),
  onChatLoadMessagesData: jest.fn(() => jest.fn()),
  offChatLoadMessagesData: jest.fn(),
  onChatCreated: jest.fn(() => jest.fn()),
  offChatCreated: jest.fn(),
  onChatDeleted: jest.fn(() => jest.fn()),
  offChatDeleted: jest.fn(),
  onChatSaveTabsRequest: jest.fn(() => jest.fn()),
  offChatSaveTabsRequest: jest.fn(),
  saveTabs: jest.fn().mockResolvedValue({ success: true }),
  loadTabs: jest.fn().mockResolvedValue({ tabs: [] }),
};

Object.defineProperty(globalThis, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to default behavior
    // eslint-disable-next-line @typescript-eslint/require-await
    mockElectronAPI.invoke.mockImplementation(async (_channel, data: { event: EIpcEvent }) => {
      if (data.event === EIpcEvent.CHAT_LIST_CHATS) {
        return { chats: [] };
      }
      if (data.event === EIpcEvent.ENV_GET) {
        return { platform: 'linux' };
      }
      if (data.event === EIpcEvent.SETTINGS_LOAD) {
        return {
          provider: 'ollama',
          ollama: { address: 'http://localhost:11434', model: '', apiKey: '' },
          lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
          preconfiguredPrompts: [],
          globalShortcut: null,
        };
      }

      return { success: true };
    });
  });

  test('renders chat interface by default', async () => {
    render(<App />);

    // Wait for async operations to complete (loading chats, getting platform)
    await waitFor(() => {
      const chatPlaceholder = screen.getByPlaceholderText('Type your message...');
      expect(chatPlaceholder).toBeInTheDocument();
    });
  });

  test('renders with macOS platform', async () => {
    // eslint-disable-next-line @typescript-eslint/require-await
    mockElectronAPI.invoke.mockImplementation(async (_channel, data: { event: EIpcEvent }) => {
      if (data.event === EIpcEvent.CHAT_LIST_CHATS) {
        return { chats: [] };
      }
      if (data.event === EIpcEvent.ENV_GET) {
        return { platform: 'darwin' };
      }
      if (data.event === EIpcEvent.SETTINGS_LOAD) {
        return {
          provider: 'ollama',
          ollama: { address: 'http://localhost:11434', model: '', apiKey: '' },
          lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
          preconfiguredPrompts: [],
          globalShortcut: null,
        };
      }

      return { success: true };
    });

    render(<App />);

    await waitFor(() => {
      const chatPlaceholder = screen.getByPlaceholderText('Type your message...');
      expect(chatPlaceholder).toBeInTheDocument();
    });
  });

  test('renders with Windows platform', async () => {
    // eslint-disable-next-line @typescript-eslint/require-await
    mockElectronAPI.invoke.mockImplementation(async (_channel, data: { event: EIpcEvent }) => {
      if (data.event === EIpcEvent.CHAT_LIST_CHATS) {
        return { chats: [] };
      }
      if (data.event === EIpcEvent.ENV_GET) {
        return { platform: 'win32' };
      }
      if (data.event === EIpcEvent.SETTINGS_LOAD) {
        return {
          provider: 'ollama',
          ollama: { address: 'http://localhost:11434', model: '', apiKey: '' },
          lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
          preconfiguredPrompts: [],
          globalShortcut: null,
        };
      }

      return { success: true };
    });

    render(<App />);

    await waitFor(() => {
      const chatPlaceholder = screen.getByPlaceholderText('Type your message...');
      expect(chatPlaceholder).toBeInTheDocument();
    });
  });

  test('renders with LM Studio provider settings', async () => {
    // eslint-disable-next-line @typescript-eslint/require-await
    mockElectronAPI.invoke.mockImplementation(async (_channel, data: { event: EIpcEvent }) => {
      if (data.event === EIpcEvent.CHAT_LIST_CHATS) {
        return { chats: [] };
      }
      if (data.event === EIpcEvent.ENV_GET) {
        return { platform: 'linux' };
      }
      if (data.event === EIpcEvent.SETTINGS_LOAD) {
        return {
          provider: 'lmstudio',
          ollama: { address: 'http://localhost:11434', model: '', apiKey: '' },
          lmstudio: { address: 'http://localhost:1234', model: 'test-model', apiKey: 'test-key' },
          preconfiguredPrompts: [],
          globalShortcut: null,
        };
      }

      return { success: true };
    });

    render(<App />);

    await waitFor(() => {
      const chatPlaceholder = screen.getByPlaceholderText('Type your message...');
      expect(chatPlaceholder).toBeInTheDocument();
    });
  });

  test('renders with empty chat list', async () => {
    // eslint-disable-next-line @typescript-eslint/require-await
    mockElectronAPI.invoke.mockImplementation(async (_channel, data: { event: EIpcEvent }) => {
      if (data.event === EIpcEvent.CHAT_LIST_CHATS) {
        return { chats: [] };
      }
      if (data.event === EIpcEvent.ENV_GET) {
        return { platform: 'linux' };
      }
      if (data.event === EIpcEvent.SETTINGS_LOAD) {
        return {
          provider: 'ollama',
          ollama: { address: 'http://localhost:11434', model: '', apiKey: '' },
          lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
          preconfiguredPrompts: [],
          globalShortcut: null,
        };
      }

      return { success: true };
    });

    render(<App />);

    await waitFor(() => {
      const chatPlaceholder = screen.getByPlaceholderText('Type your message...');
      expect(chatPlaceholder).toBeInTheDocument();
    });
  });

  test('handles IPC error responses gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/require-await
    (mockElectronAPI.invoke as jest.Mock).mockImplementation(async (_channel: any, data: { event: EIpcEvent }): Promise<any> => {
      if (data.event === EIpcEvent.CHAT_LIST_CHATS) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { error: 'Failed to load chats' } as any;
      }
      if (data.event === EIpcEvent.ENV_GET) {
        return { platform: 'linux' };
      }
      if (data.event === EIpcEvent.SETTINGS_LOAD) {
        return {
          provider: 'ollama',
          ollama: { address: 'http://localhost:11434', model: '', apiKey: '' },
          lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
          preconfiguredPrompts: [],
          globalShortcut: null,
        };
      }

      return { success: true };
    });

    render(<App />);

    // Component should still render even if chat list fails to load
    await waitFor(() => {
      const chatPlaceholder = screen.getByPlaceholderText('Type your message...');
      expect(chatPlaceholder).toBeInTheDocument();
    });
  });

  test('handles settings load error gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/require-await
    (mockElectronAPI.invoke as jest.Mock).mockImplementation(async (_channel: any, data: { event: EIpcEvent }): Promise<any> => {
      if (data.event === EIpcEvent.CHAT_LIST_CHATS) {
        return { chats: [] };
      }
      if (data.event === EIpcEvent.ENV_GET) {
        return { platform: 'linux' };
      }
      if (data.event === EIpcEvent.SETTINGS_LOAD) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { error: 'Failed to load settings' } as any;
      }

      return { success: true };
    });

    render(<App />);

    // Component should still render even if settings fail to load
    await waitFor(() => {
      const chatPlaceholder = screen.getByPlaceholderText('Type your message...');
      expect(chatPlaceholder).toBeInTheDocument();
    });
  });

  test('handles platform detection error gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/require-await
    (mockElectronAPI.invoke as jest.Mock).mockImplementation(async (_channel: any, data: { event: EIpcEvent }): Promise<any> => {
      if (data.event === EIpcEvent.CHAT_LIST_CHATS) {
        return { chats: [] };
      }
      if (data.event === EIpcEvent.ENV_GET) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { error: 'Failed to get platform' } as any;
      }
      if (data.event === EIpcEvent.SETTINGS_LOAD) {
        return {
          provider: 'ollama',
          ollama: { address: 'http://localhost:11434', model: '', apiKey: '' },
          lmstudio: { address: 'http://localhost:1234', model: '', apiKey: '' },
          preconfiguredPrompts: [],
          globalShortcut: null,
        };
      }

      return { success: true };
    });

    render(<App />);

    // Component should still render even if platform detection fails
    await waitFor(() => {
      const chatPlaceholder = screen.getByPlaceholderText('Type your message...');
      expect(chatPlaceholder).toBeInTheDocument();
    });
  });
});

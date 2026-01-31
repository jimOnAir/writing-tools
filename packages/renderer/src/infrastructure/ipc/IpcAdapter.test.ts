import { EIpcChannel, EIpcEvent } from '@writing-tools/shared';

import type { TIpcRenderListener } from '../../types/TIpcRenderListener';

import { ElectronIpcAdapter } from './IpcAdapter';

describe('ElectronIpcAdapter', () => {
  let adapter: ElectronIpcAdapter;
  let mockElectronAPI: {
    invoke: jest.Mock,
    onChatWindowData: jest.Mock,
    offChatWindowData: jest.Mock,
    onOllamaResponse: jest.Mock,
    offOllamaResponse: jest.Mock,
    onPromptSelectorData: jest.Mock,
    offPromptSelectorData: jest.Mock,
    onChatTitleUpdated: jest.Mock,
    offChatTitleUpdated: jest.Mock,
    onChatLoadMessagesData: jest.Mock,
    offChatLoadMessagesData: jest.Mock,
    onChatCreated: jest.Mock,
    offChatCreated: jest.Mock,
    onChatDeleted: jest.Mock,
    offChatDeleted: jest.Mock,
    onChatStreamChunk: jest.Mock,
    offChatStreamChunk: jest.Mock,
    onChatStreamEnd: jest.Mock,
    offChatStreamEnd: jest.Mock,
    onChatFollowUpQuestions: jest.Mock,
    offChatFollowUpQuestions: jest.Mock,
  };

  beforeEach(() => {
    mockElectronAPI = {
      invoke: jest.fn(),
      onChatWindowData: jest.fn(() => ({ remove: jest.fn() })),
      offChatWindowData: jest.fn(),
      onOllamaResponse: jest.fn(() => ({ remove: jest.fn() })),
      offOllamaResponse: jest.fn(),
      onPromptSelectorData: jest.fn(() => ({ remove: jest.fn() })),
      offPromptSelectorData: jest.fn(),
      onChatTitleUpdated: jest.fn(() => ({ remove: jest.fn() })),
      offChatTitleUpdated: jest.fn(),
      onChatLoadMessagesData: jest.fn(() => ({ remove: jest.fn() })),
      offChatLoadMessagesData: jest.fn(),
      onChatCreated: jest.fn(() => ({ remove: jest.fn() })),
      offChatCreated: jest.fn(),
      onChatDeleted: jest.fn(() => ({ remove: jest.fn() })),
      offChatDeleted: jest.fn(),
      onChatStreamChunk: jest.fn(() => ({ remove: jest.fn() })),
      offChatStreamChunk: jest.fn(),
      onChatStreamEnd: jest.fn(() => ({ remove: jest.fn() })),
      offChatStreamEnd: jest.fn(),
      onChatFollowUpQuestions: jest.fn(() => ({ remove: jest.fn() })),
      offChatFollowUpQuestions: jest.fn(),
    };

    Object.defineProperty(globalThis, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true,
    });

    adapter = new ElectronIpcAdapter();
  });

  afterEach(() => {
    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  describe('invoke', () => {
    it('calls window.electronAPI.invoke with correct parameters', async () => {
      const mockResponse = { chats: [] };
      mockElectronAPI.invoke.mockResolvedValue(mockResponse);

      const payload = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LIST,
        payload: {},
      };

      const result = await adapter.invoke(EIpcChannel.CHAT, payload);

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith(EIpcChannel.CHAT, payload);
      expect(result).toEqual(mockResponse);
    });

    it('rejects when electronAPI is not available', async () => {
      delete (window as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const payload = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LIST,
        payload: {},
      };

      await expect(freshAdapter.invoke(EIpcChannel.CHAT, payload)).rejects.toThrow(
        'electronAPI is not available',
      );
    });

    it('handles errors from electronAPI.invoke', async () => {
      const error = new Error('IPC error');
      mockElectronAPI.invoke.mockRejectedValue(error);

      const payload = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LIST,
        payload: {},
      };

      await expect(adapter.invoke(EIpcChannel.CHAT, payload)).rejects.toThrow('IPC error');
    });
  });

  describe('onChatWindowData', () => {
    it('registers listener and returns listener object', () => {
      const callback = jest.fn();
      const listener = adapter.onChatWindowData(callback);

      expect(mockElectronAPI.onChatWindowData).toHaveBeenCalledWith(callback);
      expect(listener).toBeDefined();
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const callback = jest.fn();

      expect(() => {
        freshAdapter.onChatWindowData(callback);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('offChatWindowData', () => {
    it('unregisters listener', () => {
      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      adapter.offChatWindowData(listener);

      expect(mockElectronAPI.offChatWindowData).toHaveBeenCalledWith(listener);
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      expect(() => {
        freshAdapter.offChatWindowData(listener);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('onOllamaResponse', () => {
    it('registers listener and returns listener object', () => {
      const callback = jest.fn();
      const listener = adapter.onOllamaResponse(callback);

      expect(mockElectronAPI.onOllamaResponse).toHaveBeenCalledWith(callback);
      expect(listener).toBeDefined();
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const callback = jest.fn();

      expect(() => {
        freshAdapter.onOllamaResponse(callback);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('offOllamaResponse', () => {
    it('unregisters listener', () => {
      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      adapter.offOllamaResponse(listener);

      expect(mockElectronAPI.offOllamaResponse).toHaveBeenCalledWith(listener);
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      expect(() => {
        freshAdapter.offOllamaResponse(listener);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('onPromptSelectorData', () => {
    it('registers listener and returns listener object', () => {
      const callback = jest.fn();
      const listener = adapter.onPromptSelectorData(callback);

      expect(mockElectronAPI.onPromptSelectorData).toHaveBeenCalledWith(callback);
      expect(listener).toBeDefined();
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const callback = jest.fn();

      expect(() => {
        freshAdapter.onPromptSelectorData(callback);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('offPromptSelectorData', () => {
    it('unregisters listener', () => {
      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      adapter.offPromptSelectorData(listener);

      expect(mockElectronAPI.offPromptSelectorData).toHaveBeenCalledWith(listener);
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      expect(() => {
        freshAdapter.offPromptSelectorData(listener);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('onChatTitleUpdated', () => {
    it('registers listener and returns listener object', () => {
      const callback = jest.fn();
      const listener = adapter.onChatTitleUpdated(callback);

      expect(mockElectronAPI.onChatTitleUpdated).toHaveBeenCalledWith(callback);
      expect(listener).toBeDefined();
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const callback = jest.fn();

      expect(() => {
        freshAdapter.onChatTitleUpdated(callback);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('offChatTitleUpdated', () => {
    it('unregisters listener', () => {
      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      adapter.offChatTitleUpdated(listener);

      expect(mockElectronAPI.offChatTitleUpdated).toHaveBeenCalledWith(listener);
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      expect(() => {
        freshAdapter.offChatTitleUpdated(listener);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('onChatLoadMessagesData', () => {
    it('registers listener and returns listener object', () => {
      const callback = jest.fn();
      const listener = adapter.onChatLoadMessagesData(callback);

      expect(mockElectronAPI.onChatLoadMessagesData).toHaveBeenCalledWith(callback);
      expect(listener).toBeDefined();
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const callback = jest.fn();

      expect(() => {
        freshAdapter.onChatLoadMessagesData(callback);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('offChatLoadMessagesData', () => {
    it('unregisters listener', () => {
      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      adapter.offChatLoadMessagesData(listener);

      expect(mockElectronAPI.offChatLoadMessagesData).toHaveBeenCalledWith(listener);
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      expect(() => {
        freshAdapter.offChatLoadMessagesData(listener);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('onChatCreated', () => {
    it('registers listener and returns listener object', () => {
      const callback = jest.fn();
      const listener = adapter.onChatCreated(callback);

      expect(mockElectronAPI.onChatCreated).toHaveBeenCalledWith(callback);
      expect(listener).toBeDefined();
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const callback = jest.fn();

      expect(() => {
        freshAdapter.onChatCreated(callback);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('offChatCreated', () => {
    it('unregisters listener', () => {
      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      adapter.offChatCreated(listener);

      expect(mockElectronAPI.offChatCreated).toHaveBeenCalledWith(listener);
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      expect(() => {
        freshAdapter.offChatCreated(listener);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('onChatDeleted', () => {
    it('registers listener and returns listener object', () => {
      const callback = jest.fn();
      const listener = adapter.onChatDeleted(callback);

      expect(mockElectronAPI.onChatDeleted).toHaveBeenCalledWith(callback);
      expect(listener).toBeDefined();
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const callback = jest.fn();

      expect(() => {
        freshAdapter.onChatDeleted(callback);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('offChatDeleted', () => {
    it('unregisters listener', () => {
      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      adapter.offChatDeleted(listener);

      expect(mockElectronAPI.offChatDeleted).toHaveBeenCalledWith(listener);
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      expect(() => {
        freshAdapter.offChatDeleted(listener);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('onChatStreamChunk', () => {
    it('registers listener', () => {
      const callback = jest.fn();

      const listener = adapter.onChatStreamChunk(callback);

      expect(mockElectronAPI.onChatStreamChunk).toHaveBeenCalledWith(callback);
      expect(listener).toBeDefined();
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const callback = jest.fn();

      expect(() => {
        freshAdapter.onChatStreamChunk(callback);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('offChatStreamChunk', () => {
    it('unregisters listener', () => {
      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      adapter.offChatStreamChunk(listener);

      expect(mockElectronAPI.offChatStreamChunk).toHaveBeenCalledWith(listener);
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      expect(() => {
        freshAdapter.offChatStreamChunk(listener);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('onChatStreamEnd', () => {
    it('registers listener', () => {
      const callback = jest.fn();

      const listener = adapter.onChatStreamEnd(callback);

      expect(mockElectronAPI.onChatStreamEnd).toHaveBeenCalledWith(callback);
      expect(listener).toBeDefined();
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const callback = jest.fn();

      expect(() => {
        freshAdapter.onChatStreamEnd(callback);
      }).toThrow('electronAPI is not available');
    });
  });

  describe('offChatStreamEnd', () => {
    it('unregisters listener', () => {
      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      adapter.offChatStreamEnd(listener);

      expect(mockElectronAPI.offChatStreamEnd).toHaveBeenCalledWith(listener);
    });

    it('throws when electronAPI is not available', () => {
      delete (globalThis as { electronAPI?: unknown }).electronAPI;
      const freshAdapter = new ElectronIpcAdapter();

      const listener = { remove: jest.fn() } as unknown as TIpcRenderListener;

      expect(() => {
        freshAdapter.offChatStreamEnd(listener);
      }).toThrow('electronAPI is not available');
    });
  });
});

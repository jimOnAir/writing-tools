import { BrowserWindow } from 'electron';

import type { ISettingsService } from '../settings/ISettingsService';

import { WindowService } from './WindowService';

// Mock electron modules

jest.mock('electron', () => {
  const windows: Array<Electron.BrowserWindow> = [];

  const createMockWindow = (): Electron.BrowserWindow => {
    const mockWindow = {
      focus: jest.fn(),
      isDestroyed: jest.fn(() => false),
      loadURL: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      once: jest.fn((event: string, callback: () => void) => {
        if (event === 'ready-to-show') {
          // Simulate ready-to-show event
          setTimeout(() => {
            callback();
          }, 0);
        }
      }),
      setMenu: jest.fn(),
      show: jest.fn(),
      webContents: {
        getURL: jest.fn(() => ''),
        openDevTools: jest.fn(),
        send: jest.fn(),
      },
    } as unknown as Electron.BrowserWindow;

    windows.push(mockWindow);
    return mockWindow;
  };

  const BrowserWindowConstructor = jest.fn().mockImplementation(() => {
    return createMockWindow();
  });

  (BrowserWindowConstructor as unknown as { getAllWindows: jest.Mock }).getAllWindows = jest.fn(() => windows);

  // Store reference to windows array for clearing in tests
  (globalThis as unknown as { __mockWindows__: Array<Electron.BrowserWindow> }).__mockWindows__ = windows;

  return {
    BrowserWindow: BrowserWindowConstructor,
  };
});

jest.mock('electron-is-dev', () => false);

jest.mock('../../icons', () => ({
  getAppIcon: jest.fn(() => 'icon-path'),
}));

describe('WindowService', () => {
  let mockSettingsService: jest.Mocked<ISettingsService>;
  let windowService: WindowService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear mock windows array
    const windows = (globalThis as unknown as { __mockWindows__?: Array<Electron.BrowserWindow> }).__mockWindows__;
    if (windows) {
      windows.length = 0;
    }

    mockSettingsService = {
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
    } as unknown as jest.Mocked<ISettingsService>;

    windowService = new WindowService(mockSettingsService);
  });

  describe('getChatWindow', () => {
    it('creates a new chat window', async () => {
      const result = await windowService.getChatWindow();

      expect(BrowserWindow).toHaveBeenCalled();
      expect(result.created).toBe(true);
      expect(result.window).toBeDefined();
    });

    it('reuses existing chat window', async () => {
      const firstResult = await windowService.getChatWindow();
      const secondResult = await windowService.getChatWindow();

      expect(secondResult.created).toBe(false);
      expect(secondResult.window).toBe(firstResult.window);
    });

    it('shows and focuses existing window', async () => {
      const firstResult = await windowService.getChatWindow();
      const mockWindow = firstResult.window as {
        focus: jest.Mock,
        show: jest.Mock,
      };

      await windowService.getChatWindow();

      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });
  });

  describe('getPromptSelectorWindow', () => {
    it('creates a new prompt selector window', async () => {
      const result = await windowService.getPromptSelectorWindow();

      expect(BrowserWindow).toHaveBeenCalled();
      expect(result.created).toBe(true);
    });

    it('reuses existing prompt selector window', async () => {
      await windowService.getPromptSelectorWindow();
      const secondResult = await windowService.getPromptSelectorWindow();

      expect(secondResult.created).toBe(false);
    });
  });

  describe('createSettingsWindow', () => {
    it('creates a new settings window', async () => {
      await windowService.createSettingsWindow();

      expect(BrowserWindow).toHaveBeenCalled();
    });

    it('reuses existing settings window', async () => {
      await windowService.createSettingsWindow();
      await windowService.createSettingsWindow();

      // Window should be reused, so BrowserWindow should only be called once
      expect(BrowserWindow).toHaveBeenCalledTimes(1);
    });
  });

  describe('getChatListWindow', () => {
    it('creates a new chat list window', async () => {
      const result = await windowService.getChatListWindow();

      expect(BrowserWindow).toHaveBeenCalled();
      expect(result.created).toBe(true);
    });

    it('reuses existing chat list window', async () => {
      await windowService.getChatListWindow();
      const secondResult = await windowService.getChatListWindow();

      expect(secondResult.created).toBe(false);
    });
  });

  describe('getNativeWindowOptions', () => {
    it('returns platform-specific window options', async () => {
      // This is a private method, but we can test it indirectly through window creation
      const result = await windowService.getChatWindow();

      expect(result).toBeDefined();
      expect(result.window).toBeDefined();
    });
  });
});

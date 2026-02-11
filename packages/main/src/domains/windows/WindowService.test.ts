import { BrowserWindow } from 'electron';

import { WindowService } from './WindowService';

// Mock electron modules

jest.mock('electron', () => {
  const windows: Electron.BrowserWindow[] = [];

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
  (globalThis as unknown as { __mockWindows__: Electron.BrowserWindow[] }).__mockWindows__ = windows;

  return {
    BrowserWindow: BrowserWindowConstructor,
    nativeTheme: {
      shouldUseDarkColors: true,
    },
  };
});

jest.mock('electron-is-dev', () => false);

jest.mock('../../icons', () => ({
  getAppIcon: jest.fn(() => 'icon-path'),
}));

describe('WindowService', () => {
  let windowService: WindowService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear mock windows array
    const windows = (globalThis as unknown as { __mockWindows__?: Electron.BrowserWindow[] }).__mockWindows__;
    if (windows) {
      windows.length = 0;
    }

    windowService = new WindowService();
  });

  describe('getMainWindow', () => {
    it('creates a new mainWindow', async () => {
      const result = await windowService.getMainWindow();

      expect(BrowserWindow).toHaveBeenCalled();
      expect(result.created).toBe(true);
      expect(result.window).toBeDefined();
    });

    it('reuses existing mainWindow', async () => {
      const firstResult = await windowService.getMainWindow();
      const secondResult = await windowService.getMainWindow();

      expect(secondResult.created).toBe(false);
      expect(secondResult.window).toBe(firstResult.window);
    });

    it('shows and focuses existing window', async () => {
      const firstResult = await windowService.getMainWindow();
      const mockWindow = firstResult.window as {
        focus: jest.Mock,
        show: jest.Mock,
      };

      await windowService.getMainWindow();

      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('finds existing mainWindow when reference is lost', async () => {
      const firstResult = await windowService.getMainWindow();
      const mockWindow = firstResult.window as {
        webContents: { getURL: jest.Mock },
        isDestroyed: jest.Mock,
        on: jest.Mock,
        show: jest.Mock,
        focus: jest.Mock,
      };

      // Simulate losing the reference by clearing the internal reference
      // Use empty string URL which matches the condition (winUrl === '' || winUrl === rendererUrl)
      // This simulates a window that's still loading or matches the renderer URL
      mockWindow.webContents.getURL.mockReturnValue('');
      mockWindow.isDestroyed.mockReturnValue(false);

      // Clear the internal reference (simulating it was lost)
      (windowService as unknown as { mainWindow: Electron.BrowserWindow | null }).mainWindow = null;

      // Get all windows mock to return our window
      const getAllWindowsMock = BrowserWindow.getAllWindows as jest.Mock;
      getAllWindowsMock.mockReturnValue([mockWindow]);

      const secondResult = await windowService.getMainWindow();

      expect(secondResult.created).toBe(false);
      expect(secondResult.window).toBe(mockWindow);
    });

    it('findExistingMainWindow correctly identifies mainWindow by URL', async () => {
      const mockWindow1 = {
        isDestroyed: jest.fn(() => false),
        webContents: {
          getURL: jest.fn(() => ''),
        },
        on: jest.fn(),
        show: jest.fn(),
        focus: jest.fn(),
      } as unknown as Electron.BrowserWindow;

      const mockWindow2 = {
        isDestroyed: jest.fn(() => false),
        webContents: {
          getURL: jest.fn(() => 'file:///path/to/renderer/index.html?view=settings'),
        },
        on: jest.fn(),
        show: jest.fn(),
        focus: jest.fn(),
      } as unknown as Electron.BrowserWindow;

      const getAllWindowsMock = BrowserWindow.getAllWindows as jest.Mock;
      getAllWindowsMock.mockReturnValue([mockWindow1, mockWindow2]);

      // Clear internal reference first
      (windowService as unknown as { mainWindow: Electron.BrowserWindow | null }).mainWindow = null;

      // Now getMainWindow should find mockWindow1 (empty URL or no view parameter) but not mockWindow2 (has view parameter)
      const result = await windowService.getMainWindow();

      expect(result.created).toBe(false);
      expect(result.window).toBe(mockWindow1);
    });
  });

  describe('getExistingMainWindow', () => {
    it('returns null when no window exists', async () => {
      const windows = (globalThis as unknown as { __mockWindows__?: Electron.BrowserWindow[] }).__mockWindows__ ?? [];
      (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue(windows);

      const result = await windowService.getExistingMainWindow();

      expect(result).toBeNull();
    });

    it('returns window when it exists', async () => {
      const created = await windowService.getMainWindow();
      const existing = await windowService.getExistingMainWindow();

      expect(existing).toBe(created.window);
    });

    it('does not show or focus the window', async () => {
      const first = await windowService.getMainWindow();
      const mockWindow = first.window as { focus: jest.Mock, show: jest.Mock };
      mockWindow.focus.mockClear();
      mockWindow.show.mockClear();

      await windowService.getExistingMainWindow();

      expect(mockWindow.show).not.toHaveBeenCalled();
      expect(mockWindow.focus).not.toHaveBeenCalled();
    });
  });

  describe('registerOnMainWindowReady', () => {
    it('invokes callback when main window is created', async () => {
      const callback = jest.fn();

      windowService.registerOnMainWindowReady(callback);
      const result = await windowService.getMainWindow();

      expect(callback).toHaveBeenCalledWith(result.window);
    });

    it('invokes callback only once per window instance', async () => {
      const callback = jest.fn();

      windowService.registerOnMainWindowReady(callback);
      await windowService.getMainWindow();
      await windowService.getMainWindow();

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNativeWindowOptions', () => {
    it('returns platform-specific window options', async () => {
      // This is a private method, but we can test it indirectly through window creation
      const result = await windowService.getMainWindow();

      expect(result).toBeDefined();
      expect(result.window).toBeDefined();
    });
  });
});

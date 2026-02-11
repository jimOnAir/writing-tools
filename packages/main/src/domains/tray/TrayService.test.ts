import type { ILogger } from '@writing-tools/shared';
import type { MenuItemConstructorOptions } from 'electron';
import { Menu, Tray, app } from 'electron';

import type { IWindowService } from '../windows/IWindowService';

import { TrayService } from './TrayService';

// Mock electron modules
jest.mock('electron', () => ({
  Tray: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    setContextMenu: jest.fn(),
    setIgnoreDoubleClickEvents: jest.fn(),
  })),
  Menu: {
    buildFromTemplate: jest.fn(),
  },
  app: {
    on: jest.fn(),
    quit: jest.fn(),
  },
}));

jest.mock('../../icons', () => ({
  getAppIcon: jest.fn(() => 'icon-path'),
}));

const MENU_ITEM_COUNT = 3;
const SHOW_INDEX = 0;
const SEPARATOR_INDEX = 1;
const QUIT_INDEX = 2;

describe('TrayService', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let mockTray: jest.Mocked<Tray>;
  let mockWindowService: jest.Mocked<IWindowService>;
  let trayService: TrayService;
  let trayMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockTray = {
      on: jest.fn(),
      setContextMenu: jest.fn(),
      setIgnoreDoubleClickEvents: jest.fn(),
    } as unknown as jest.Mocked<Tray>;

    trayMock = Tray as unknown as jest.Mock;
    trayMock.mockImplementation(() => mockTray);

    mockWindowService = {
      getExistingMainWindow: jest.fn().mockResolvedValue(null),
      getMainWindow: jest.fn().mockResolvedValue({ created: false, window: {} as Electron.BrowserWindow }),
      registerOnMainWindowReady: jest.fn(),
    } as unknown as jest.Mocked<IWindowService>;

    trayService = new TrayService(mockWindowService, mockLogger);
  });

  describe('createTray', () => {
    it('creates tray with menu', () => {
      const mockMenu = {} as Electron.Menu;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const buildFromTemplateMock = Menu.buildFromTemplate as jest.Mock<Electron.Menu, [MenuItemConstructorOptions[]]>;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const setContextMenuMock = mockTray.setContextMenu as jest.Mock;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const setIgnoreDoubleClickEventsMock = mockTray.setIgnoreDoubleClickEvents as jest.Mock;
      buildFromTemplateMock.mockReturnValue(mockMenu);

      trayService.createTray();

      expect(trayMock).toHaveBeenCalledWith('icon-path');
      expect(buildFromTemplateMock).toHaveBeenCalled();
      expect(setContextMenuMock).toHaveBeenCalledWith(mockMenu);
      expect(setIgnoreDoubleClickEventsMock).toHaveBeenCalledWith(false);
    });

    it('does not create duplicate tray', () => {
      trayService.createTray();
      jest.clearAllMocks();

      trayService.createTray();

      // Should not create new Tray instance
      expect(trayMock).not.toHaveBeenCalled();
    });

    it('creates menu with correct items', () => {
      trayService.createTray();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const buildFromTemplateMock = Menu.buildFromTemplate as jest.Mock<Electron.Menu, [MenuItemConstructorOptions[]]>;
      const calls = buildFromTemplateMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      expect(firstCall).toBeDefined();
      const menuTemplate = firstCall[0];

      expect(menuTemplate).toHaveLength(MENU_ITEM_COUNT);
      expect(menuTemplate[SHOW_INDEX]?.label).toBe('Show');
      expect(menuTemplate[SEPARATOR_INDEX]?.type).toBe('separator');
      expect(menuTemplate[QUIT_INDEX]?.label).toBe('Quit');
    });

    it('handles left click on tray icon to toggle window', async () => {
      trayService.createTray();

      const onMock = mockTray.on as jest.Mock;
      expect(onMock).toHaveBeenCalledWith('click', expect.any(Function));
      const clickHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1];
      expect(clickHandler).toBeDefined();

      const getExistingMainWindowMock = mockWindowService.getExistingMainWindow as jest.Mock;
      const getMainWindowMock = mockWindowService.getMainWindow as jest.Mock;

      clickHandler();
      await Promise.resolve();

      expect(getExistingMainWindowMock).toHaveBeenCalled();
      expect(getMainWindowMock).toHaveBeenCalled();
    });

    it('hides window when tray clicked and window is visible', async () => {
      const mockWin = { focus: jest.fn(), hide: jest.fn(), isVisible: jest.fn(() => true), show: jest.fn() };
      (mockWindowService.getExistingMainWindow as jest.Mock).mockResolvedValue(mockWin);

      trayService.createTray();
      const onMock = mockTray.on as jest.Mock;
      const clickHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1];

      clickHandler();
      await Promise.resolve();

      expect(mockWin.hide).toHaveBeenCalled();
      expect(mockWin.show).not.toHaveBeenCalled();
    });

    it('shows window when tray clicked and window is hidden', async () => {
      const mockWin = { focus: jest.fn(), hide: jest.fn(), isVisible: jest.fn(() => false), show: jest.fn() };
      (mockWindowService.getExistingMainWindow as jest.Mock).mockResolvedValue(mockWin);

      trayService.createTray();
      const onMock = mockTray.on as jest.Mock;
      const clickHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'click')?.[1];

      clickHandler();
      await Promise.resolve();

      expect(mockWin.show).toHaveBeenCalled();
      expect(mockWin.focus).toHaveBeenCalled();
      expect(mockWin.hide).not.toHaveBeenCalled();
    });

    it('handles Show menu item click', () => {
      trayService.createTray();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const buildFromTemplateMock = Menu.buildFromTemplate as jest.Mock<Electron.Menu, [MenuItemConstructorOptions[]]>;
      const calls = buildFromTemplateMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      expect(firstCall).toBeDefined();
      const menuTemplate = firstCall[0];
      const showItem = menuTemplate[SHOW_INDEX];
      const getMainWindowMock = mockWindowService.getMainWindow as jest.Mock;

      (showItem.click as (() => void) | undefined)?.();

      expect(getMainWindowMock).toHaveBeenCalled();
    });

    it('handles Quit menu item click', () => {
      trayService.createTray();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const buildFromTemplateMock = Menu.buildFromTemplate as jest.Mock<Electron.Menu, [MenuItemConstructorOptions[]]>;
      const calls = buildFromTemplateMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      expect(firstCall).toBeDefined();
      const menuTemplate = firstCall[0];
      const quitItem = menuTemplate[QUIT_INDEX];
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const quitMock = app.quit as jest.Mock;

      (quitItem.click as (() => void) | undefined)?.();

      expect(quitMock).toHaveBeenCalled();
    });

    it('registers minimize-to-tray callback and attaches close handler when window is provided', () => {
      trayService.createTray();

      const registerMock = mockWindowService.registerOnMainWindowReady as jest.Mock;
      expect(registerMock).toHaveBeenCalledWith(expect.any(Function));

      const callback = registerMock.mock.calls[0][0];
      const mockWin = {
        hide: jest.fn(),
        on: jest.fn(),
      } as unknown as Electron.BrowserWindow;
      const mockEvent = { preventDefault: jest.fn() };

      callback(mockWin);

      const onMock = mockWin.on as jest.Mock;
      expect(onMock).toHaveBeenCalledWith('close', expect.any(Function));

      const closeHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'close')?.[1];
      expect(closeHandler).toBeDefined();

      closeHandler(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockWin.hide).toHaveBeenCalled();
    });

    it('registers before-quit listener in constructor', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const appOnMock = app.on as jest.Mock;

      expect(appOnMock).toHaveBeenCalledWith('before-quit', expect.any(Function));
    });
  });
});

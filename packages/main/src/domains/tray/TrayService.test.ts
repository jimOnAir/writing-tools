import type { ILogger } from '@writing-tools/shared';
import type { MenuItemConstructorOptions } from 'electron';
import { Menu, Tray, app } from 'electron';

import type { IWindowService } from '../windows/IWindowService';

import { TrayService } from './TrayService';

// Mock electron modules
jest.mock('electron', () => ({
  Tray: jest.fn().mockImplementation(() => ({
    setContextMenu: jest.fn(),
    setIgnoreDoubleClickEvents: jest.fn(),
  })),
  Menu: {
    buildFromTemplate: jest.fn(),
  },
  app: {
    quit: jest.fn(),
  },
}));

jest.mock('../../icons', () => ({
  getAppIcon: jest.fn(() => 'icon-path'),
}));

const MENU_ITEM_COUNT = 5;
const CHAT_LIST_INDEX = 0;
const SHOW_INDEX = 1;
const SETTINGS_INDEX = 2;
const SEPARATOR_INDEX = 3;
const QUIT_INDEX = 4;

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
      setContextMenu: jest.fn(),
      setIgnoreDoubleClickEvents: jest.fn(),
    } as unknown as jest.Mocked<Tray>;

    trayMock = Tray as unknown as jest.Mock;
    trayMock.mockImplementation(() => mockTray);

    mockWindowService = {
      createSettingsWindow: jest.fn().mockResolvedValue(undefined),
      getChatListWindow: jest.fn().mockResolvedValue({ created: false, window: {} as Electron.BrowserWindow }),
      getChatWindow: jest.fn().mockResolvedValue({ created: false, window: {} as Electron.BrowserWindow }),
      getPromptSelectorWindow: jest.fn().mockResolvedValue({ created: false, window: {} as Electron.BrowserWindow }),
      getSettingsWindow: jest.fn().mockResolvedValue({ created: false, window: {} as Electron.BrowserWindow }),
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
      expect(menuTemplate[CHAT_LIST_INDEX]?.label).toBe('Chat List');
      expect(menuTemplate[SHOW_INDEX]?.label).toBe('Show');
      expect(menuTemplate[SETTINGS_INDEX]?.label).toBe('Settings');
      expect(menuTemplate[SEPARATOR_INDEX]?.type).toBe('separator');
      expect(menuTemplate[QUIT_INDEX]?.label).toBe('Quit');
    });

    it('handles Chat List menu item click', () => {
      trayService.createTray();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const buildFromTemplateMock = Menu.buildFromTemplate as jest.Mock<Electron.Menu, [MenuItemConstructorOptions[]]>;
      const calls = buildFromTemplateMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      expect(firstCall).toBeDefined();
      const menuTemplate = firstCall[0];
      const chatListItem = menuTemplate[CHAT_LIST_INDEX];
      const getChatListWindowMock = mockWindowService.getChatListWindow as jest.Mock;

      (chatListItem.click as (() => void) | undefined)?.();

      expect(getChatListWindowMock).toHaveBeenCalled();
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
      const getChatWindowMock = mockWindowService.getChatWindow as jest.Mock;

      (showItem.click as (() => void) | undefined)?.();

      expect(getChatWindowMock).toHaveBeenCalled();
    });

    it('handles Settings menu item click', () => {
      trayService.createTray();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const buildFromTemplateMock = Menu.buildFromTemplate as jest.Mock<Electron.Menu, [MenuItemConstructorOptions[]]>;
      const calls = buildFromTemplateMock.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstCall = calls[0];
      expect(firstCall).toBeDefined();
      const menuTemplate = firstCall[0];
      const settingsItem = menuTemplate[SETTINGS_INDEX];
      const createSettingsWindowMock = mockWindowService.createSettingsWindow as jest.Mock;

      (settingsItem.click as (() => void) | undefined)?.();

      expect(createSettingsWindowMock).toHaveBeenCalled();
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
  });
});

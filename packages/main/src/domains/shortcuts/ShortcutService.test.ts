import type { ILogger, IPreconfiguredPrompt, ISettings } from '@writing-tools/shared';
import { EIpcRendererEvent } from '@writing-tools/shared';

import type { ISettingsService } from '../settings/ISettingsService';
import type { ITextSelectionService } from '../text-selection/ITextSelectionService';
import type { IWindowService } from '../windows/IWindowService';

import type { IGlobalShortcut } from './IGlobalShortcut';
import { ShortcutService } from './ShortcutService';

describe('ShortcutService', () => {
  let mockMainWindow: {
    webContents: {
      send: jest.Mock,
    },
  };
  let mockGlobalShortcut: jest.Mocked<IGlobalShortcut>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockSettingsService: jest.Mocked<ISettingsService>;
  let mockTextSelectionService: jest.Mocked<ITextSelectionService>;
  let mockWindowService: jest.Mocked<IWindowService>;
  let shortcutService: ShortcutService;

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

    mockGlobalShortcut = {
      isRegistered: jest.fn(),
      register: jest.fn().mockReturnValue(true),
      unregisterAll: jest.fn(),
    } as unknown as jest.Mocked<IGlobalShortcut>;

    mockMainWindow = {
      webContents: {
        send: jest.fn(),
      },
    };

    mockSettingsService = {
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
    } as unknown as jest.Mocked<ISettingsService>;

    mockTextSelectionService = {
      getSelectedText: jest.fn(),
    } as unknown as jest.Mocked<ITextSelectionService>;

    mockWindowService = {
      getExistingMainWindow: jest.fn(),
      getMainWindow: jest.fn(),
      registerOnMainWindowReady: jest.fn(),
    } as unknown as jest.Mocked<IWindowService>;

    (mockWindowService.getMainWindow as jest.Mock).mockResolvedValue({
      window: mockMainWindow,
      created: false,
    });

    shortcutService = new ShortcutService(
      mockSettingsService,
      mockTextSelectionService,
      mockWindowService,
      mockLogger,
      mockGlobalShortcut,
    );
  });

  describe('registerGlobalShortcuts', () => {
    it('registers global shortcut from settings', async () => {
      const mockSettings: Pick<ISettings, 'globalShortcut' | 'preconfiguredPrompts'> = {
        globalShortcut: 'Command+Shift+I',
        preconfiguredPrompts: [],
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);

      await shortcutService.registerGlobalShortcuts();

      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();

      expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
        'Command+Shift+I',
        expect.any(Function),
      );
    });

    it('does not register shortcut when not set in settings', async () => {
      const mockSettings: Pick<ISettings, 'globalShortcut' | 'preconfiguredPrompts'> = {
        globalShortcut: undefined,
        preconfiguredPrompts: [],
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);

      await shortcutService.registerGlobalShortcuts();

      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();

      expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
    });

    it('handles registration errors', async () => {
      const mockSettings: Pick<ISettings, 'globalShortcut' | 'preconfiguredPrompts'> = {
        globalShortcut: 'Invalid+Shortcut',
        preconfiguredPrompts: [],
      };

      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);
      (mockGlobalShortcut.register as jest.Mock).mockImplementation(() => {
        throw new Error('Registration failed');
      });

      await shortcutService.registerGlobalShortcuts();

      // Should not throw, just log error

      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();
    });
  });

  describe('processGlobalShortcut', () => {
    it('processes shortcut with selected text', async () => {
      const mockPreconfiguredPrompts: IPreconfiguredPrompt[] = [
        { title: 'Prompt 1', prompt: 'Test {text}' },
      ];
      const mockSettings: Pick<ISettings, 'preconfiguredPrompts'> = {
        preconfiguredPrompts: mockPreconfiguredPrompts,
      };

      mockTextSelectionService.getSelectedText.mockReturnValue('Selected text');
      mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);

      await shortcutService.processGlobalShortcut();

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        EIpcRendererEvent.PROMPT_SELECTOR_DATA,
        {
          selectedText: 'Selected text',
          preconfiguredPrompts: mockSettings.preconfiguredPrompts,
        },
      );
    });

    it('does nothing when no text is selected', async () => {
      mockTextSelectionService.getSelectedText.mockReturnValue(null);

      await shortcutService.processGlobalShortcut();

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('does nothing when selected text is empty', async () => {
      mockTextSelectionService.getSelectedText.mockReturnValue('   ');

      await shortcutService.processGlobalShortcut();

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('handles errors when processing shortcut', async () => {
      mockTextSelectionService.getSelectedText.mockImplementation(() => {
        throw new Error('Selection failed');
      });

      await shortcutService.processGlobalShortcut();

      // Should not throw, just log error
      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
});

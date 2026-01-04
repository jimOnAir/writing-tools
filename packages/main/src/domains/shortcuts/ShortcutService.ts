import type { ILogger } from '@writing-tools/shared';
import { EIpcRendererEvent } from '@writing-tools/shared';

import type { ISettingsService } from '../settings/ISettingsService';
import type { ITextSelectionService } from '../text-selection/ITextSelectionService';
import type { IWindowService } from '../windows/IWindowService';

import type { IGlobalShortcut } from './IGlobalShortcut';
import type { IShortcutService } from './IShortcutService';

export class ShortcutService implements IShortcutService {
  private readonly globalShortcut: IGlobalShortcut;
  private readonly logger: ILogger;
  private readonly settingsService: ISettingsService;
  private readonly textSelectionService: ITextSelectionService;
  private readonly windowService: IWindowService;

  public constructor(
    settingsService: ISettingsService,
    textSelectionService: ITextSelectionService,
    windowService: IWindowService,
    logger: ILogger,
    globalShortcut: IGlobalShortcut,
  ) {
    this.logger = logger;
    this.settingsService = settingsService;
    this.textSelectionService = textSelectionService;
    this.windowService = windowService;
    this.globalShortcut = globalShortcut;
  }

  public async registerGlobalShortcuts(): Promise<void> {
    const settings = await this.settingsService.loadSettings();

    this.globalShortcut.unregisterAll();

    if (settings.globalShortcut) {
      try {
        this.globalShortcut.register(settings.globalShortcut, () => {
          this.processGlobalShortcut().catch((error: unknown) => {
            const errorText = error instanceof Error
              ? error.message
              : String(error);
            this.logger.error(`Error processing shortcut: %s`, errorText);
          });
        });
        this.logger.info(`Registered global shortcut: ${settings.globalShortcut}`);
      } catch (error: unknown) {
        const errorText = error instanceof Error
          ? error.message
          : String(error);
        this.logger.error(`Failed to register global shortcut ${settings.globalShortcut}: %s`, errorText);
      }
    }
  }

  public async processGlobalShortcut(): Promise<void> {
    try {
      const selectedText = this.textSelectionService.getSelectedText();

      if (!selectedText?.trim()) {
        this.logger.warn('No text selected, nothing to process');

        return;
      }

      const settings = await this.settingsService.loadSettings();

      // Send prompt selector data to the mainWindow
      // The mainWindow's MultiChatService will create a prompt selector tab
      const { window: mainWindow } = await this.windowService.getMainWindow();
      mainWindow.webContents.send(EIpcRendererEvent.PROMPT_SELECTOR_DATA, {
        selectedText,
        preconfiguredPrompts: settings.preconfiguredPrompts,
      });
    } catch (error: unknown) {
      const errorText = error instanceof Error
        ? error.message
        : String(error);
      this.logger.error('Error processing clipboard content: %s', errorText);
    }
  }
}

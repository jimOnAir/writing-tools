import { EIpcRendererEvent, logger } from '@writing-tools/shared';
import { globalShortcut } from 'electron';

import type { ISettingsService } from '../settings/ISettingsService';
import type { ITextSelectionService } from '../text-selection/ITextSelectionService';
import type { IWindowService } from '../windows/IWindowService';

import type { IShortcutService } from './IShortcutService';

export class ShortcutService implements IShortcutService {
  private readonly settingsService: ISettingsService;
  private readonly textSelectionService: ITextSelectionService;
  private readonly windowService: IWindowService;

  public constructor(
    settingsService: ISettingsService,
    textSelectionService: ITextSelectionService,
    windowService: IWindowService,
  ) {
    this.settingsService = settingsService;
    this.textSelectionService = textSelectionService;
    this.windowService = windowService;
  }

  public async registerGlobalShortcuts(): Promise<void> {
    const settings = await this.settingsService.loadSettings();

    globalShortcut.unregisterAll();

    if (settings.globalShortcut) {
      try {
        globalShortcut.register(settings.globalShortcut, () => {
          this.processGlobalShortcut().catch((error: unknown) => {
            const errorText = error instanceof Error
              ? error.message
              : String(error);
            logger.error(`Error processing shortcut: %s`, errorText);
          });
        });
        logger.info(`Registered global shortcut: ${settings.globalShortcut}`);
      } catch (error: unknown) {
        const errorText = error instanceof Error
          ? error.message
          : String(error);
        logger.error(`Failed to register global shortcut ${settings.globalShortcut}: %s`, errorText);
      }
    }
  }

  public async processGlobalShortcut(): Promise<void> {
    try {
      console.log('processingShortcut');
      const selectedText = this.textSelectionService.getSelectedText();
      console.log(`selectedText`, selectedText);

      if (!selectedText || !selectedText.trim()) {
        logger.warn('No text selected, nothing to process');

        return;
      }

      const settings = await this.settingsService.loadSettings();

      // Show the prompt selector window instead of directly processing
      const { window: promptSelectorWindow } = await this.windowService.getPromptSelectorWindow();
      promptSelectorWindow.webContents.send(EIpcRendererEvent.PROMPT_SELECTOR_DATA, {
        selectedText,
        preconfiguredPrompts: settings.preconfiguredPrompts,
      });
    } catch (error: unknown) {
      const errorText = error instanceof Error
        ? error.message
        : String(error);
      logger.error('Error processing clipboard content: %s', errorText);
    }
  }
}

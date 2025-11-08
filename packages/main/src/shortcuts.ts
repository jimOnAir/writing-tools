import { logger } from '@writing-tools/shared';
import { globalShortcut } from 'electron';

import { getSelectedText } from './getSelectedText';
import { loadSettings } from './settings';
import { getPromptSelectorWindow } from './windows';

export const registerGlobalShortcuts = () => {
  const settings = loadSettings();

  globalShortcut.unregisterAll();

  if (settings.globalShortcut) {
    try {
      globalShortcut.register(settings.globalShortcut, () => {
        processGlobalShortcut().catch((error: unknown) => {
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
};

export async function processGlobalShortcut() {
  try {
    console.log('processingShortcut');
    const selectedText = getSelectedText();
    console.log(`selectedText`, selectedText);

    if (!selectedText || !selectedText.trim()) {
      logger.warn('No text selected, nothing to process');

      return;
    }

    const settings = loadSettings();

    // Show the prompt selector window instead of directly processing
    const { window: promptSelectorWindow } = await getPromptSelectorWindow();
    promptSelectorWindow.webContents.send('prompt-selector-data', {
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

import { logger } from '@writing-tools/shared';
import { globalShortcut } from 'electron';

import { getSelectedText } from './getSelectedText';
import { sendOllamaMessages } from './ollamaHandlers';
import { loadSettings } from './settings';
import { getChatWindow } from './windows';

const TEXT_REPLACEMENT = '{text}';
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

    let promptTemplate = settings.ollama.prompt || `Summarize the following text in one sentence: ${TEXT_REPLACEMENT}`;

    if (!promptTemplate.includes(TEXT_REPLACEMENT)) {
      promptTemplate = promptTemplate + `\n${TEXT_REPLACEMENT}`;
    }

    const prompt = promptTemplate.replace(TEXT_REPLACEMENT, selectedText);

    const { window: chatWindow, created: windowCreated } = await getChatWindow();

    if (windowCreated) {
      // Always wait for ready-to-show to ensure the window is properly initialized
      chatWindow.once('ready-to-show', () => {
        logger.info('Send chat-window-data: %s', prompt);

        chatWindow.webContents.send('chat-window-data', {
          prompt,
        });
      });
    } else {
      logger.info('Send chat-window-data: %s', prompt);
      chatWindow.webContents.send('chat-window-data', {
        prompt,
      });

      chatWindow.focus();
      chatWindow.show();
    }

    const response = await sendOllamaMessages([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    if (response.error) {
      logger.error('Ollama error: %s', response.error);

      chatWindow.webContents.send('ollama-response', {
        error: response.error,
      });

      return;
    }

    const result = response.response;
    chatWindow.webContents.send('ollama-response', {
      result,
    });
  } catch (error: unknown) {
    const errorText = error instanceof Error
      ? error.message
      : String(error);
    logger.error('Error processing clipboard content: %s', errorText);
  }
}

import { globalShortcut, clipboard } from 'electron';
import { loadSettings } from './settings';
import { sendOllamaMessages } from './ollamaHandlers';
import { getChatWindow } from './windows';
import { logger } from './utils/logger';

const TEXT_REPLACEMENT = '{text}';
export const registerGlobalShortcuts = () => {
  const settings = loadSettings();

  globalShortcut.unregisterAll();

  if (settings.globalShortcut) {
    try {
      globalShortcut.register(settings.globalShortcut, () => {
        processGlobalShortcut();
      });
      logger.info(`Registered global shortcut: ${settings.globalShortcut}`);
    } catch (error: any) {
      logger.error(`Failed to register global shortcut ${settings.globalShortcut}: %s`, error);
    }
  }
};

export async function processGlobalShortcut() {
  try {
    const settings = loadSettings();

    const clipboardText = clipboard.readText();

    if (!clipboardText || !clipboardText.trim()) {
      logger.warn('Clipboard is empty, nothing to process');
      return;
    }

    let promptTemplate = settings.ollama.prompt || `Summarize the following text in one sentence: ${TEXT_REPLACEMENT}`;

    if (!promptTemplate.includes(TEXT_REPLACEMENT)) {
      promptTemplate = promptTemplate + `\n${TEXT_REPLACEMENT}`;
    }

    const prompt = promptTemplate.replace(TEXT_REPLACEMENT, clipboardText);

    const { window: chatWindow, created: windowCreated }= getChatWindow();

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
      // Update chat window with error
      if (chatWindow) {
        chatWindow.webContents.send('ollama-response', {
          error: response.error,
        });
      }
      return;
    }

    const result = response.response;
    chatWindow.webContents.send('ollama-response', {
      result,
    });

  } catch (error: any) {
    logger.error('Error processing clipboard content: %s', error.message || 'Unknown error');
  }
}

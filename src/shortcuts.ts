import { globalShortcut, clipboard } from 'electron';
import { loadSettings } from './settings';
import { sendOllamaMessages } from './ollamaHandlers';
import { createChatWindow } from './windows';

export const registerGlobalShortcuts = () => {
  const settings = loadSettings();

  globalShortcut.unregisterAll();

  if (settings.globalShortcut) {
    try {
      globalShortcut.register(settings.globalShortcut, () => {
        processGlobalShortcut();
      });
      console.log(`Registered global shortcut: ${settings.globalShortcut}`);
    } catch (error: any) {
      console.error(`Failed to register global shortcut ${settings.globalShortcut}:`, error);
    }
  }
};

export async function processGlobalShortcut() {
  try {
    const settings = loadSettings();

    const clipboardText = clipboard.readText();

    if (!clipboardText || !clipboardText.trim()) {
      console.warn('Clipboard is empty, nothing to process');
      return;
    }

    let promptTemplate = settings.ollama.prompt || 'Summarize the following text in one sentence: {text}';

    if (promptTemplate.includes('{text}')) {
      promptTemplate = promptTemplate + '\n{text}'
    }

    const prompt = promptTemplate.replace('{text}', clipboardText);

    const chatWindow = createChatWindow();

    chatWindow.once('ready-to-show', () => {
      chatWindow.webContents.send('chat-window-data', {
        prompt,
      });
    })

    const response = await sendOllamaMessages([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    // Check for errors
    if (response.error) {
      console.error('Ollama error:', response.error);
      // Update chat window with error
      if (chatWindow && chatWindow.webContents) {
        chatWindow.webContents.send('ollama-response', {
          error: response.error,
        });
      }
      return;
    }

    // Extract the response content
    const result = response.response;

    // Update chat window with the response
    if (chatWindow && chatWindow.webContents) {
      chatWindow.webContents.send('ollama-response', {
        result,
      });
    }

  } catch (error: any) {
    console.error('Error processing clipboard content:', error.message || 'Unknown error');
  }
}

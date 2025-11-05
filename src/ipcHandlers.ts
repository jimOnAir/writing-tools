import { ipcMain } from 'electron';
import { loadSettings, saveSettings } from './settings';
import { fetchOllamaModels, sendOllamaMessages } from './ollamaHandlers';
import { Message } from 'ollama';
import { ISettings } from './interfaces/ISettings';

export function registerIpcHandlers() {
  ipcMain.handle('load-settings', async () => {
    return loadSettings();
  });

  ipcMain.handle('save-settings', async (_, settings: ISettings) => {
    try {
      saveSettings(settings);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fetch-ollama-models', async (_) => {
    return fetchOllamaModels();
  });

  ipcMain.handle('send-ollama-message', async (_, { messages } : { messages: Message[] }) => {
    return sendOllamaMessages(messages);
  });
}

import { ipcMain } from 'electron';
import { loadSettings, saveSettings } from './settings';
import { fetchOllamaModels, sendOllamaMessage } from './ollamaHandlers';

// IPC handlers
export function registerIpcHandlers() {
  ipcMain.handle('load-settings', async () => {
    return loadSettings();
  });

  ipcMain.handle('save-settings', async (event, settings) => {
    try {
      saveSettings(settings);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fetch-ollama-models', async (event, ollamaAddress) => {
    return fetchOllamaModels(ollamaAddress);
  });

  ipcMain.handle('send-ollama-message', async (event, { address, model, messages }) => {
    return sendOllamaMessage(address, model, messages);
  });
}

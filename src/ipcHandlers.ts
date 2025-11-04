import { ipcMain } from 'electron';
import { Ollama } from 'ollama';
import { loadSettings, saveSettings } from './settings';

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
    try {
      const ollama = new Ollama({ host: ollamaAddress });
      const response = await ollama.list();
      return { models: response.models };
    } catch (error: any) {
      console.error('Failed to fetch Ollama models:', error);
      return { error: error.message };
    }
  });
}

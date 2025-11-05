import { globalShortcut, clipboard} from 'electron';
import { loadSettings } from './settings';

export const registerGlobalShortcuts = () => {
  // Load settings to get global shortcuts configuration
  const settings = loadSettings();

  // Unregister all existing global shortcuts first
  globalShortcut.unregisterAll();

  // Register new shortcut if configured
  if (settings.globalShortcut) {
    try {
      globalShortcut.register(settings.globalShortcut, () => {
        // When shortcut is pressed, capture text from clipboard and show alert
        const text = clipboard.readText();
        console.log(text)
      });
      console.log(`Registered global shortcut: ${settings.globalShortcut}`);
    } catch (error) {
      console.error(`Failed to register global shortcut ${settings.globalShortcut}:`, error);
    }
  }
};

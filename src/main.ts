import { app, globalShortcut } from 'electron';
import { createMainWindow, mainWindow } from './windows';
import { createTray } from './tray';
import { registerIpcHandlers } from './ipcHandlers';
import { loadSettings } from './settings';

// Register IPC handlers
registerIpcHandlers();

// Function to register global shortcuts
const registerGlobalShortcuts = () => {
  // Load settings to get global shortcuts configuration
  const settings = loadSettings();

  // Unregister all existing global shortcuts first
  globalShortcut.unregisterAll();

  // Register new shortcut if configured
  if (settings.globalShortcut) {
    try {
      globalShortcut.register(settings.globalShortcut, () => {
        // When shortcut is pressed, capture text and show alert
        if (mainWindow) {
          mainWindow.webContents.send('global-shortcut-triggered', settings.globalShortcut);
        }
      });
      console.log(`Registered global shortcut: ${settings.globalShortcut}`);
    } catch (error) {
      console.error(`Failed to register global shortcut ${settings.globalShortcut}:`, error);
    }
  }
};

app.on('ready', () => {
  createMainWindow();
  createTray(mainWindow);

  // Register global shortcuts after the app is ready
  registerGlobalShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Unregister global shortcuts before quitting
    globalShortcut.unregisterAll();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

// Handle app restart/reload for global shortcuts
app.on('browser-window-focus', () => {
  // Re-register shortcuts when window regains focus
  registerGlobalShortcuts();
});

// Handle app relaunch for global shortcuts
app.on('second-instance', () => {
  // If a second instance is launched, focus the main window
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

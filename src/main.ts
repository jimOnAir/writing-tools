import { app, globalShortcut } from 'electron';
import { createMainWindow, mainWindow } from './windows';
import { createTray } from './tray';
import { registerIpcHandlers } from './ipcHandlers';
import { registerGlobalShortcuts } from './shortcuts';

registerIpcHandlers();

app.on('ready', () => {
  createMainWindow();
  createTray(mainWindow);
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

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

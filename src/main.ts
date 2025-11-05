import { app } from 'electron';
import { createChatWindow, mainWindow } from './windows';
import { createTray } from './tray';
import { registerIpcHandlers } from './ipcHandlers';
import { registerGlobalShortcuts } from './shortcuts';

registerIpcHandlers();

app.on('ready', () => {
  createTray(mainWindow);
  registerGlobalShortcuts();
});

app.on('window-all-closed', () => {
  // do nothing
});

app.on('activate', () => {
  if (mainWindow === null) {
    createChatWindow();
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

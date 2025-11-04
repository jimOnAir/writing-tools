import { app, BrowserWindow, Menu, Tray, nativeImage, MenuItemConstructorOptions, NativeImage, ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';
import isDev from 'electron-is-dev';
import { ISettings } from './interfaces/ISettings';
import { createMainWindow, mainWindow, settingsWindow } from './windows';
import { createTray, tray } from './tray';
import { registerIpcHandlers } from './ipcHandlers';

// Register IPC handlers
registerIpcHandlers();

app.on('ready', () => {
  createMainWindow();
  createTray(mainWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

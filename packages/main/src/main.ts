import { app } from 'electron';
import { getChatWindow } from './windows';
import { createTray } from './tray';
import { registerIpcHandlers } from './ipcHandlers';
import { registerGlobalShortcuts } from './shortcuts';
import { logger } from '@writing-tools/shared';

registerIpcHandlers();
logger.setEnvironment('development');

app.on('ready', () => {
  createTray();
  registerGlobalShortcuts();
});

app.on('window-all-closed', () => {
  // do nothing
});

app.on('activate', () => {
  getChatWindow();
});

app.on('second-instance', () => {
  getChatWindow();
});

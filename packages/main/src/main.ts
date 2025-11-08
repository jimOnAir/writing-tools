import { logger } from '@writing-tools/shared';
import { app } from 'electron';

import { registerIpcHandlers } from './ipcHandlers';
import { registerGlobalShortcuts } from './shortcuts';
import { createTray } from './tray';
import { getChatWindow } from './windows';

registerIpcHandlers();

app.on('ready', () => {
  createTray();
  registerGlobalShortcuts();
});

app.on('window-all-closed', () => {
  // do nothing
});

app.on('activate', () => {
  getChatWindow().catch((error: unknown) => {
    const errorText = error instanceof Error
      ? error.message
      : String(error);
    logger.error(`Can't show window: %s`, errorText);
  });
});

app.on('second-instance', () => {
  getChatWindow().catch((error: unknown) => {
    const errorText = error instanceof Error
      ? error.message
      : String(error);
    logger.error(`Can't show window: %s`, errorText);
  });
});

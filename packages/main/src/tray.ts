import { logger } from '@writing-tools/shared';
import type { MenuItemConstructorOptions } from 'electron';
import { Tray, Menu, app } from 'electron';

import { getAppIcon } from './icons';
import { createSettingsWindow, getChatWindow } from './windows';

let tray: Tray | null = null;

export function createTray() {
  if (!tray) {
    tray = new Tray(getAppIcon());
  }

  const menuItems: MenuItemConstructorOptions[] = [
    {
      label: 'Show',
      click: () => {
        getChatWindow().catch((error: unknown) => {
          if (error instanceof Error) {
            logger.error(error.message);
          } else {
            logger.error(String(error));
          }
        });
      },
    },
    {
      label: 'Settings',
      click: () => {
        createSettingsWindow().catch((error: unknown) => {
          if (error instanceof Error) {
            logger.error(error.message);
          } else {
            logger.error(String(error));
          }
        });
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ];

  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setContextMenu(contextMenu);
  tray.setIgnoreDoubleClickEvents(false);
}

export { tray };

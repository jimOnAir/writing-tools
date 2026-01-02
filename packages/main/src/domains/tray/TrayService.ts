import { logger } from '@writing-tools/shared';
import type { MenuItemConstructorOptions } from 'electron';
import { Tray, Menu, app } from 'electron';

import { getAppIcon } from '../../icons';
import type { IWindowService } from '../windows/IWindowService';

import type { ITrayService } from './ITrayService';

export class TrayService implements ITrayService {
  private tray: Tray | null = null;
  private readonly windowService: IWindowService;

  public constructor(windowService: IWindowService) {
    this.windowService = windowService;
  }

  public createTray(): void {
    this.tray ??= new Tray(getAppIcon());

    const menuItems: MenuItemConstructorOptions[] = [
      {
        label: 'Chat List',
        click: () => {
          this.windowService.getChatListWindow().catch((error: unknown) => {
            if (error instanceof Error) {
              logger.error(error.message);
            } else {
              logger.error(String(error));
            }
          });
        },
      },
      {
        label: 'Show',
        click: () => {
          this.windowService.getChatWindow().catch((error: unknown) => {
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
          this.windowService.createSettingsWindow().catch((error: unknown) => {
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
    this.tray.setContextMenu(contextMenu);
    this.tray.setIgnoreDoubleClickEvents(false);
  }

  private getTray(): Tray | null {
    return this.tray;
  }
}

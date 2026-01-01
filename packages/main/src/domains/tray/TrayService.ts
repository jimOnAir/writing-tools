import { logger } from '@writing-tools/shared';
import type { MenuItemConstructorOptions } from 'electron';
import { Tray, Menu, app } from 'electron';

import { getAppIcon } from '../../icons';
import { WindowService } from '../windows';

export class TrayService {
  private tray: Tray | null = null;
  private readonly windowService: WindowService;

  public constructor(windowService: WindowService = new WindowService()) {
    this.windowService = windowService;
  }

  public createTray(): void {
    if (!this.tray) {
      this.tray = new Tray(getAppIcon());
    }

    const menuItems: MenuItemConstructorOptions[] = [
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

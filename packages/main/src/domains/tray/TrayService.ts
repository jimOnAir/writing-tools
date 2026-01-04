import type { ILogger } from '@writing-tools/shared';
import type { MenuItemConstructorOptions } from 'electron';
import { Tray, Menu, app } from 'electron';

import { getAppIcon } from '../../icons';
import type { IWindowService } from '../windows/IWindowService';

import type { ITrayService } from './ITrayService';

export class TrayService implements ITrayService {
  private tray: Tray | null = null;
  private readonly logger: ILogger;
  private readonly windowService: IWindowService;

  public constructor(windowService: IWindowService, logger: ILogger) {
    this.logger = logger;
    this.windowService = windowService;
  }

  public createTray(): void {
    this.tray ??= new Tray(getAppIcon());

    const menuItems: MenuItemConstructorOptions[] = [
      {
        label: 'Show',
        click: () => {
          this.windowService.getMainWindow().catch((error: unknown) => {
            if (error instanceof Error) {
              this.logger.error(error.message);
            } else {
              this.logger.error(String(error));
            }
          });
        },
      },
      {
        type: 'separator',
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
}

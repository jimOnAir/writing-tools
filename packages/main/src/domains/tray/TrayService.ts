import type { ILogger } from '@writing-tools/shared';
import type { MenuItemConstructorOptions } from 'electron';
import { Tray, Menu, app } from 'electron';

import { getAppIcon } from '../../icons';
import type { IWindowService } from '../windows/IWindowService';

import type { ITrayService } from './ITrayService';

export class TrayService implements ITrayService {
  private isAppQuitting = false;
  private tray: Tray | null = null;

  public constructor(
    private readonly windowService: IWindowService,
    private readonly logger: ILogger,
  ) {
    app.on('before-quit', () => {
      this.isAppQuitting = true;
    });
  }

  public createTray(): void {
    this.tray ??= new Tray(getAppIcon());

    this.windowService.registerOnMainWindowReady((win) => {
      win.on('close', (e) => {
        if (!this.isAppQuitting) {
          e.preventDefault();
          win.hide();
        }
      });
    });

    this.tray.on('click', () => {
      this.toggleMainWindow();
    });

    const menuItems: MenuItemConstructorOptions[] = [
      {
        label: 'Show',
        click: () => {
          this.showApp();
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

  private showApp(): void {
    void this.windowService.getMainWindow().catch((error: unknown) => {
      if (error instanceof Error) {
        this.logger.error('Failed to show app: %s', error.message);
      } else {
        this.logger.error('Failed to show app: %s', String(error));
      }
    });
  }

  private toggleMainWindow(): void {
    const win = this.windowService.getExistingMainWindow();
    if (win === null) {
      this.showApp();

      return;
    }
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  }
}

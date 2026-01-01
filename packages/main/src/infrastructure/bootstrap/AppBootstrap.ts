import { logger } from '@writing-tools/shared';
import { app } from 'electron';

import { ModelService } from '../../domains/llm';
import { SettingsService } from '../../domains/settings';
import { ShortcutService } from '../../domains/shortcuts';
import { TextSelectionService } from '../../domains/text-selection';
import { TrayService } from '../../domains/tray';
import { WindowService } from '../../domains/windows';
import { IpcHandlers } from '../ipc';

export class AppBootstrap {
  private readonly settingsService: SettingsService;
  private readonly shortcutService: ShortcutService;
  private readonly trayService: TrayService;
  private readonly windowService: WindowService;
  private readonly ipcHandlers: IpcHandlers;

  public constructor() {
    this.settingsService = new SettingsService();
    this.windowService = new WindowService(this.settingsService);
    const textSelectionService = new TextSelectionService();
    this.shortcutService = new ShortcutService(
      this.settingsService,
      textSelectionService,
      this.windowService,
    );
    this.trayService = new TrayService(this.windowService);
    const modelService = new ModelService(this.settingsService);
    this.ipcHandlers = new IpcHandlers(
      this.settingsService,
      modelService,
      this.windowService,
    );
  }

  public initialize(): void {
    this.ipcHandlers.register();

    app.on('ready', () => {
      // Load settings on startup to initialize the in-memory store
      (async () => {
        try {
          await this.settingsService.loadSettings();
        } catch (error: unknown) {
          const errorText = error instanceof Error
            ? error.message
            : String(error);
          logger.error('Failed to load settings on startup: %s', errorText);
        }

        this.trayService.createTray();

        await this.shortcutService.registerGlobalShortcuts();
      })().catch((error: unknown) => {
        const errorText = error instanceof Error
          ? error.message
          : String(error);
        logger.error('Error in ready handler: %s', errorText);
      });
    });

    app.on('window-all-closed', () => {
      // do nothing
    });

    app.on('activate', () => {
      this.windowService.getChatWindow().catch((error: unknown) => {
        const errorText = error instanceof Error
          ? error.message
          : String(error);
        logger.error(`Can't show window: %s`, errorText);
      });
    });

    app.on('second-instance', () => {
      this.windowService.getChatWindow().catch((error: unknown) => {
        const errorText = error instanceof Error
          ? error.message
          : String(error);
        logger.error(`Can't show window: %s`, errorText);
      });
    });
  }
}

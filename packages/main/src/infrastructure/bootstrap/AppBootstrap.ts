import { logger } from '@writing-tools/shared';
import { app } from 'electron';

import type { IChatService } from '../../domains/chat';
import { ChatRepository, ChatService } from '../../domains/chat';
import { ModelService } from '../../domains/llm';
import { SettingsRepository, SettingsService } from '../../domains/settings';
import type { ISettingsService } from '../../domains/settings/ISettingsService';
import { ShortcutService } from '../../domains/shortcuts';
import type { IShortcutService } from '../../domains/shortcuts/IShortcutService';
import { TextSelectionService } from '../../domains/text-selection';
import type { ITextSelectionService } from '../../domains/text-selection/ITextSelectionService';
import { TrayService } from '../../domains/tray';
import type { ITrayService } from '../../domains/tray/ITrayService';
import { WindowService } from '../../domains/windows';
import type { IWindowService } from '../../domains/windows/IWindowService';
import { IpcHandlers } from '../ipc';
import type { IIpcHandlers } from '../ipc/IIpcHandlers';

export class AppBootstrap {
  private readonly chatService: IChatService;
  private readonly ipcHandlers: IIpcHandlers;
  private readonly settingsService: ISettingsService;
  private readonly shortcutService: IShortcutService;
  private readonly textSelectionService: ITextSelectionService;
  private readonly trayService: ITrayService;
  private readonly windowService: IWindowService;

  public constructor() {
    // Create repositories (no dependencies)
    const settingsRepository = new SettingsRepository();
    const chatRepository = new ChatRepository();

    // Create services in dependency order
    this.settingsService = new SettingsService(settingsRepository);
    this.windowService = new WindowService(this.settingsService);
    this.textSelectionService = new TextSelectionService();
    this.shortcutService = new ShortcutService(
      this.settingsService,
      this.textSelectionService,
      this.windowService,
    );
    this.trayService = new TrayService(this.windowService);
    const modelService = new ModelService(this.settingsService);
    this.chatService = new ChatService(chatRepository);
    this.ipcHandlers = new IpcHandlers(
      this.settingsService,
      modelService,
      this.windowService,
      this.chatService,
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

        try {
          // Initialize chat database
          await this.chatService.initialize();
        } catch (error: unknown) {
          const errorText = error instanceof Error
            ? error.message
            : String(error);
          logger.error('Failed to initialize chat database: %s', errorText);
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

import type { ILogger } from '@writing-tools/shared';
import { app, globalShortcut } from 'electron';
import isDev from 'electron-is-dev';
import * as path from 'node:path';

import type { IChatService } from '../../domains/chat';
import { ChatRepository, ChatService } from '../../domains/chat';
import { LMStudioModelService, ModelService, OllamaModelService } from '../../domains/llm';
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
  private readonly logger: ILogger;
  private readonly settingsService: ISettingsService;
  private readonly shortcutService: IShortcutService;
  private readonly textSelectionService: ITextSelectionService;
  private readonly trayService: ITrayService;
  private readonly windowService: IWindowService;

  public constructor(logger: ILogger) {
    this.logger = logger;
    // Create repositories (no dependencies)
    // In development, use the development app-data directory
    // In production, use Electron's app data directory
    // process.cwd() in development: packages/main
    // So path.resolve(process.cwd(), 'app-data') = packages/main/app-data
    const appPath = isDev
      ? path.resolve(process.cwd(), 'app-data')
      : path.join(app.getPath('appData'), app.getName());
    const settingsRepository = new SettingsRepository(this.logger, appPath);
    const chatRepository = new ChatRepository(this.logger, appPath);

    // Create services in dependency order
    this.settingsService = new SettingsService(settingsRepository);
    this.windowService = new WindowService();
    this.textSelectionService = new TextSelectionService();
    this.shortcutService = new ShortcutService(
      this.settingsService,
      this.textSelectionService,
      this.windowService,
      this.logger,
      globalShortcut,
    );
    this.trayService = new TrayService(this.windowService, this.logger);
    const ollamaModelService = new OllamaModelService(this.settingsService, this.logger);
    const lmStudioModelService = new LMStudioModelService(this.settingsService, this.logger);
    const modelService = new ModelService(
      this.settingsService,
      ollamaModelService,
      lmStudioModelService,
    );
    this.chatService = new ChatService(chatRepository, modelService, this.logger);
    this.ipcHandlers = new IpcHandlers(
      this.settingsService,
      modelService,
      this.windowService,
      this.chatService,
      this.logger,
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
          this.logger.error('Failed to load settings on startup: %s', errorText);
        }

        try {
          // Initialize chat database
          await this.chatService.initialize();
        } catch (error: unknown) {
          const errorText = error instanceof Error
            ? error.message
            : String(error);
          this.logger.error('Failed to initialize chat database: %s', errorText);
        }

        this.trayService.createTray();

        await this.shortcutService.registerGlobalShortcuts();
      })().catch((error: unknown) => {
        const errorText = error instanceof Error
          ? error.message
          : String(error);
        this.logger.error('Error in ready handler: %s', errorText);
      });
    });

    app.on('window-all-closed', () => {
      // do nothing
    });

    app.on('second-instance', () => {
      this.windowService.getMainWindow().catch((error: unknown) => {
        const errorText = error instanceof Error
          ? error.message
          : String(error);
        this.logger.error(`Can't show window: %s`, errorText);
      });
    });
  }
}

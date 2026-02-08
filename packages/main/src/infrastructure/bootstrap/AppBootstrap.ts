import type { ILogger } from '@writing-tools/shared';
import { app, globalShortcut } from 'electron';
import isDev from 'electron-is-dev';
import * as path from 'node:path';
import { FollowUpQuestionsService } from 'src/domains/chat/FollowUpQuestionsService';
import { TitleGenerationService } from 'src/domains/chat/TitleGenerationService';

import type { IChatRepository, IChatService } from '../../domains/chat';
import { ChatRepository, ChatService } from '../../domains/chat';
import type { IFollowUpQuestionsService } from '../../domains/chat/IFollowUpQuestionsService';
import type { ILlmStreamingService } from '../../domains/chat/ILlmStreamingService';
import type { IMessageRepository } from '../../domains/chat/IMessageRepository';
import type { IMessageService } from '../../domains/chat/IMessageService';
import type { ITitleGenerationService } from '../../domains/chat/ITitleGenerationService';
import { LlmStreamingService } from '../../domains/chat/LlmStreamingService';
import { MessageRepository } from '../../domains/chat/MessageRepository';
import { MessageService } from '../../domains/chat/MessageService';
import type { IDbWatcherService } from '../../domains/db-watcher';
import {
  DbWatcherChatSubscriber,
  DbWatcherMessageSubscriber,
  DbWatcherRepository,
  DbWatcherService,
} from '../../domains/db-watcher';
import type { ILMStudioModelService, IModelService, IOllamaModelService } from '../../domains/llm';
import { LMStudioModelService, ModelService, OllamaModelService } from '../../domains/llm';
import type { IOpenTabsRepository } from '../../domains/open-tabs';
import { OpenTabsRepository } from '../../domains/open-tabs';
import type { IOpenTabsService } from '../../domains/open-tabs/IOpenTabsService';
import { OpenTabsService } from '../../domains/open-tabs/OpenTabsService';
import type { ISettingsRepository } from '../../domains/settings';
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
import { DatabaseConnection } from '../database/DatabaseConnection';
import type { IIpcChatHandler } from '../ipc/IIpcChatHandler';
import type { IIpcEnvHandler } from '../ipc/IIpcEnvHandler';
import type { IIpcMessageHandler } from '../ipc/IIpcMessageHandler';
import type { IIpcModelHandler } from '../ipc/IIpcModelHandler';
import type { IIpcPromptSelectorHandler } from '../ipc/IIpcPromptSelectorHandler';
import type { IIpcSettingsHandler } from '../ipc/IIpcSettingsHandler';
import type { IIpcTabHandler } from '../ipc/IIpcTabHandler';
import { IpcChatHandler } from '../ipc/IpcChatHandler';
import { IpcEnvHandler } from '../ipc/IpcEnvHandler';
import { IpcMessageHandler } from '../ipc/IpcMessageHandler';
import { IpcModelHandler } from '../ipc/IpcModelHandler';
import { IpcPromptSelectorHandler } from '../ipc/IpcPromptSelectorHandler';
import { IpcSettingsHandler } from '../ipc/IpcSettingsHandlers';
import { IpcTabHandler } from '../ipc/IpcTabHandler';

// TODO: minimize to tray
export class AppBootstrap {
  private readonly chatRepository: IChatRepository;
  private readonly chatService: IChatService;
  private readonly dbConnection: DatabaseConnection;
  private readonly dbWatcherChatSubscriber: DbWatcherChatSubscriber;
  private readonly dbWatcherMessageSubscriber: DbWatcherMessageSubscriber;
  private readonly dbWatcherRepository: DbWatcherRepository;
  private readonly dbWatcherService: IDbWatcherService;
  private readonly followUpQuestionsService: IFollowUpQuestionsService;
  private readonly ipcChatHandler: IIpcChatHandler;
  private readonly llmStreamingService: ILlmStreamingService;
  private readonly ipcEnvHandler: IIpcEnvHandler;
  private readonly ipcMessageHandler: IIpcMessageHandler;
  private readonly ipcModelHandler: IIpcModelHandler;
  private readonly ipcPromptSelectorHandler: IIpcPromptSelectorHandler;
  private readonly ipcSettingsHandler: IIpcSettingsHandler;
  private readonly ipcTabHandler: IIpcTabHandler;
  private readonly lmStudioModelService: ILMStudioModelService;
  private readonly logger: ILogger;
  private readonly messageRepository: IMessageRepository;
  private readonly messageService: IMessageService;
  private readonly modelService: IModelService;
  private readonly ollamaModelService: IOllamaModelService;
  private readonly openTabsRepository: IOpenTabsRepository;
  private readonly openTabsService: IOpenTabsService;
  private readonly settingsRepository: ISettingsRepository;
  private readonly settingsService: ISettingsService;
  private readonly shortcutService: IShortcutService;
  private readonly textSelectionService: ITextSelectionService;
  private readonly titleGenerationService: ITitleGenerationService;
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
    this.settingsRepository = new SettingsRepository(this.logger, appPath);
    this.dbConnection = new DatabaseConnection(this.logger, appPath);
    this.chatRepository = new ChatRepository(this.dbConnection);
    this.openTabsRepository = new OpenTabsRepository(this.logger, this.dbConnection);
    this.messageRepository = new MessageRepository(this.logger, this.dbConnection);

    // Create services in dependency order
    this.openTabsService = new OpenTabsService(this.openTabsRepository);
    this.settingsService = new SettingsService(this.settingsRepository);
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
    this.ollamaModelService = new OllamaModelService(this.settingsService, this.logger);
    this.lmStudioModelService = new LMStudioModelService(this.settingsService, this.logger);
    this.messageService = new MessageService(this.messageRepository);
    this.modelService = new ModelService(
      this.settingsService,
      this.ollamaModelService,
      this.lmStudioModelService,
    );
    this.chatService = new ChatService(
      this.chatRepository,
    );
    this.llmStreamingService = new LlmStreamingService(
      this.chatService,
      this.logger,
      this.messageService,
      this.modelService,
      this.settingsService,
    );

    this.ipcEnvHandler = new IpcEnvHandler();
    this.ipcSettingsHandler = new IpcSettingsHandler(this.settingsService);
    this.ipcModelHandler = new IpcModelHandler(this.modelService);
    this.titleGenerationService = new TitleGenerationService(
      this.chatService,
      this.logger,
      this.messageService,
      this.modelService,
    );
    this.followUpQuestionsService = new FollowUpQuestionsService(
      this.logger,
      this.modelService,
    );
    this.dbWatcherRepository = new DbWatcherRepository(this.dbConnection, this.logger);
    this.dbWatcherService = new DbWatcherService(
      this.dbConnection,
      this.dbWatcherRepository,
      this.logger,
    );
    this.dbWatcherChatSubscriber = new DbWatcherChatSubscriber(
      this.dbWatcherService as DbWatcherService,
      this.logger,
    );
    this.dbWatcherMessageSubscriber = new DbWatcherMessageSubscriber(
      this.dbWatcherService as DbWatcherService,
      this.followUpQuestionsService,
      this.logger,
      this.messageService,
      this.titleGenerationService,
    );
    this.ipcPromptSelectorHandler = new IpcPromptSelectorHandler(
      this.chatService,
      this.logger,
      this.llmStreamingService,
      this.messageService,
      this.settingsService,
      this.windowService,
    );
    this.ipcChatHandler = new IpcChatHandler(
      this.chatService,
      this.logger,
      this.openTabsService,
      this.settingsService,
      this.windowService,
      this.messageService,
    );

    this.ipcTabHandler = new IpcTabHandler(
      this.openTabsService,
      this.logger,
    );

    this.ipcMessageHandler = new IpcMessageHandler(
      this.chatService,
      this.logger,
      this.llmStreamingService,
      this.messageService,
      this.settingsService,
      this.windowService,
    );
  }

  public initialize(): void {
    this.ipcEnvHandler.register();
    this.ipcSettingsHandler.register();
    this.ipcModelHandler.register();
    this.ipcPromptSelectorHandler.register();
    this.ipcChatHandler.register();
    this.ipcTabHandler.register();
    this.ipcMessageHandler.register();

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
          await this.dbConnection.initialize();
        } catch (error: unknown) {
          const errorText = error instanceof Error
            ? error.message
            : String(error);
          this.logger.error('Failed to initialize database: %s', errorText);
          throw new Error(`Failed to initialize database:  ${errorText}`);
        }

        this.dbWatcherChatSubscriber.subscribe();
        this.dbWatcherMessageSubscriber.subscribe();

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

    app.on('quit', () => {
      this.dbConnection.close();
    });
  }
}

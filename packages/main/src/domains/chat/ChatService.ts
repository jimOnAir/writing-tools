import type { IChatInfo, IChatMessage, ILogger } from '@writing-tools/shared';
import { EIpcRendererEvent } from '@writing-tools/shared';
import { BrowserWindow } from 'electron';

import type { IModelService } from '../llm/IModelService';
import type { IWindowService } from '../windows/IWindowService';

import type { IChatRepository } from './IChatRepository';
import type { IChatService } from './IChatService';

export class ChatService implements IChatService {
  private readonly logger: ILogger;
  private readonly modelService: IModelService;
  private readonly repository: IChatRepository;
  private readonly windowService: IWindowService;

  public constructor(
    repository: IChatRepository,
    modelService: IModelService,
    windowService: IWindowService,
    logger: ILogger,
  ) {
    this.logger = logger;
    this.modelService = modelService;
    this.repository = repository;
    this.windowService = windowService;
  }

  public async initialize(): Promise<void> {
    await this.repository.initialize();
  }

  public startNewChat(title: string, provider: string, model: string): number {
    const chatId = this.repository.createChat(title, provider, model);
    void this.notifyChatCreated(chatId);

    return chatId;
  }

  public saveMessage(chatId: number, message: IChatMessage): void {
    this.repository.saveMessage(chatId, message);
  }

  public loadChatMessages(chatId: number): IChatMessage[] {
    return this.repository.getChatMessages(chatId);
  }

  public getAllChats(): IChatInfo[] {
    return this.repository.getAllChats();
  }

  public getChat(chatId: number): IChatInfo | null {
    return this.repository.getChat(chatId);
  }

  public updateChatTitle(chatId: number, title: string): void {
    this.repository.updateChatTitle(chatId, title);
    void this.notifyChatTitleUpdated(chatId, title);
  }

  public deleteChat(chatId: number): void {
    this.repository.deleteChat(chatId);
    this.notifyChatDeleted(chatId);
  }

  public close(): void {
    this.repository.close();
  }

  public async generateChatTitle(userMessage: string, assistantMessage: string): Promise<string | null> {
    try {
      const prompt = `Generate a concise simple text title (maximum 5-6 words) for this conversation based on the first exchange:
User: ${userMessage}
Assistant: ${assistantMessage}
`;

      const response = await this.modelService.sendMessages([
        {
          role: 'user',
          content: prompt,
        },
      ]);

      if (!response.success) {
        this.logger.error('Failed to generate chat title: %s', response.error);

        return null;
      }

      // Clean up the title: remove quotes, trim whitespace
      let title = response.response.trim();

      // Remove surrounding quotes if present
      if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
        title = title.slice(1, -1);
      }
      title = title.trim();

      return title || null;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Error generating chat title: %s', errorText);

      return null;
    }
  }

  /**
   * Notify all windows about chat creation
   */
  private async notifyChatCreated(chatId: number): Promise<void> {
    try {
      const { window: mainWindow, created: mainWindowCreated } = await this.windowService.getMainWindow();
      // Only send notification if window already existed (created === false)
      // If window was just created (created === true), don't send notification and close it
      if (!mainWindowCreated && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(EIpcRendererEvent.CHAT_CREATED, {
          chatId,
        });
        this.logger.info('CHAT_CREATED event sent: chatId=%s', String(chatId));
      } else if (mainWindowCreated) {
        // Window was created unnecessarily - close it to prevent it from showing
        mainWindow.close();
      }
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to send CHAT_CREATED event: %s', errorText);
      // Don't throw - event notification failure shouldn't break chat functionality
    }
  }

  /**
   * Notify all windows about chat deletion
   */
  private notifyChatDeleted(chatId: number): void {
    try {
      // Notify all existing windows (don't create windows just to notify)
      const allWindows = BrowserWindow.getAllWindows();
      for (const win of allWindows) {
        if (!win.isDestroyed()) {
          try {
            win.webContents.send(EIpcRendererEvent.CHAT_DELETED, {
              chatId,
            });
          } catch {
            // Window might be destroyed, ignore
          }
        }
      }
      this.logger.info('CHAT_DELETED event sent: chatId=%s', String(chatId));
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to send CHAT_DELETED event: %s', errorText);
      // Don't throw - event notification failure shouldn't break chat functionality
    }
  }

  /**
   * Notify main window about chat title update
   */
  private async notifyChatTitleUpdated(chatId: number, title: string): Promise<void> {
    try {
      const { window: mainWindow, created: mainWindowCreated } = await this.windowService.getMainWindow();
      // Only send notification if window already existed (created === false)
      // If window was just created (created === true), don't send notification and close it
      if (!mainWindowCreated && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(EIpcRendererEvent.CHAT_TITLE_UPDATED, {
          chatId,
          title,
        });
        this.logger.info('CHAT_TITLE_UPDATED event sent: chatId=%s, title="%s"', String(chatId), title);
      } else if (mainWindowCreated) {
        // Window was created unnecessarily - close it to prevent it from showing
        mainWindow.close();
      }
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to send CHAT_TITLE_UPDATED event: %s', errorText);
      // Don't throw - event notification failure shouldn't break chat functionality
    }
  }
}

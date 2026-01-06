import type { ILogger } from '@writing-tools/shared';
import { asc, eq } from 'drizzle-orm';

import type { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';
import { openTabs } from '../../infrastructure/database/schema';

import type { IOpenTabsRepository, TOpenTab } from './IOpenTabsRepository';

export class OpenTabsRepository implements IOpenTabsRepository {
  private dbConnection: DatabaseConnection | null = null;
  private readonly logger: ILogger;

  public constructor(logger: ILogger, dbConnection: DatabaseConnection) {
    this.logger = logger;
    this.dbConnection = dbConnection;
  }

  public saveOpenTabs(tabs: TOpenTab[]): void {
    if (this.dbConnection === null) {
      throw new Error('Database not initialized');
    }

    const db = this.dbConnection.getDatabase();
    const now = new Date().toISOString();

    // Delete all existing tabs first
    db.delete(openTabs).run();

    // Insert new tabs
    if (tabs.length > 0) {
      db.insert(openTabs).values(
        tabs.map(tab => ({
          chatId: tab.chatId,
          tabOrder: tab.tabOrder,
          isActive: tab.isActive ? 1 : 0,
          createdAt: now,
        })),
      ).run();
    }

    this.logger.info('Saved %d open tabs', tabs.length);
  }

  public loadOpenTabs(): TOpenTab[] {
    if (this.dbConnection === null) {
      throw new Error('Database not initialized');
    }

    const db = this.dbConnection.getDatabase();

    const rows = db.select({
      chatId: openTabs.chatId,
      tabOrder: openTabs.tabOrder,
      isActive: openTabs.isActive,
    }).from(openTabs).orderBy(asc(openTabs.tabOrder)).all();

    return rows.map(row => ({
      chatId: row.chatId,
      tabOrder: row.tabOrder,
      isActive: row.isActive === 1,
    }));
  }

  public clearOpenTabs(): void {
    if (this.dbConnection === null) {
      throw new Error('Database not initialized');
    }

    const db = this.dbConnection.getDatabase();
    db.delete(openTabs).run();
    this.logger.info('Cleared all open tabs');
  }

  public deleteTabsByChatId(chatId: number): void {
    if (this.dbConnection === null) {
      throw new Error('Database not initialized');
    }

    const db = this.dbConnection.getDatabase();
    const deletedCount = db.delete(openTabs).where(eq(openTabs.chatId, chatId)).run().changes;

    if (deletedCount > 0) {
      this.logger.info('Deleted %d open_tabs entries for chatId=%d', deletedCount, chatId);
    }
  }
}

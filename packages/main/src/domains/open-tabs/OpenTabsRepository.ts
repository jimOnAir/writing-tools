import type { ILogger } from '@writing-tools/shared';
import { asc, eq } from 'drizzle-orm';

import type { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';
import { openTabs } from '../../infrastructure/database/schema';

import type { IOpenTabsRepository, TOpenTab } from './IOpenTabsRepository';

export class OpenTabsRepository implements IOpenTabsRepository {
  public constructor(
    private readonly logger: ILogger,
    private readonly dbConnection: DatabaseConnection,
  ) {}

  public saveOpenTabs(tabs: TOpenTab[]): void {
    const db = this.dbConnection.getDatabase();
    const now = new Date().toISOString();

    // Delete all existing tabs first
    db.delete(openTabs)
      .run();
    if (tabs.length === 0) {
      return;
    }
    // Insert new tabs
    db.insert(openTabs)
      .values(
        tabs.map(tab => ({
          chatId: tab.chatId,
          tabOrder: tab.tabOrder,
          isActive: tab.isActive ? 1 : 0,
          createdAt: now,
        })),
      ).run();

    this.logger.info('Saved %s open tabs', tabs.length.toString());
  }

  public loadOpenTabs(): TOpenTab[] {
    const db = this.dbConnection.getDatabase();

    const rows = db.select({
      chatId: openTabs.chatId,
      tabOrder: openTabs.tabOrder,
      isActive: openTabs.isActive,
    }).from(openTabs)
      .orderBy(asc(openTabs.tabOrder))
      .all();

    return rows.map(row => ({
      chatId: row.chatId,
      tabOrder: row.tabOrder,
      isActive: row.isActive === 1,
    }));
  }

  public clearOpenTabs(): void {
    const db = this.dbConnection.getDatabase();
    db.delete(openTabs)
      .run();
    this.logger.info('Cleared all open tabs');
  }

  public deleteTabsByChatId(chatId: number): void {
    const db = this.dbConnection.getDatabase();
    const deletedCount = db.delete(openTabs)
      .where(eq(openTabs.chatId, chatId))
      .run()
      .changes;

    if (deletedCount > 0) {
      this.logger.info('Deleted %s open_tabs entries for chatId=%s', deletedCount.toString(), chatId.toString());
    }
  }
}

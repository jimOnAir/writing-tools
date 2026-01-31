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
    // Insert open tabs (tabOrder >= 0) and scroll-only rows (tabOrder === -1) for closed chats
    db.insert(openTabs)
      .values(
        tabs.map(tab => ({
          chatId: tab.chatId,
          createdAt: now,
          isActive: tab.isActive ? 1 : 0,
          scrollPosition: tab.scrollPosition ?? 0,
          tabOrder: tab.tabOrder,
        })),
      ).run();

    this.logger.info('Saved %s open tabs', tabs.length.toString());
  }

  public loadOpenTabs(): { openTabs: TOpenTab[], scrollPositionsByChatId: Record<number, number> } {
    const db = this.dbConnection.getDatabase();

    const rows = db.select({
      chatId: openTabs.chatId,
      isActive: openTabs.isActive,
      scrollPosition: openTabs.scrollPosition,
      tabOrder: openTabs.tabOrder,
    }).from(openTabs)
      .all();

    const openTabsList: TOpenTab[] = [];
    const scrollPositionsByChatId: Record<number, number> = {};

    for (const row of rows) {
      if (row.tabOrder >= 0) {
        openTabsList.push({
          chatId: row.chatId,
          isActive: row.isActive === 1,
          scrollPosition: row.scrollPosition,
          tabOrder: row.tabOrder,
        });
      } else if (row.chatId !== null) {
        scrollPositionsByChatId[row.chatId] = row.scrollPosition;
      }
    }

    openTabsList.sort((a, b) => a.tabOrder - b.tabOrder);

    return { openTabs: openTabsList, scrollPositionsByChatId };
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

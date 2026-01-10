import type { IChatMessage, ILogger, IMessageStatistics } from '@writing-tools/shared';
import { asc, eq } from 'drizzle-orm';
import type { DatabaseConnection } from 'src/infrastructure/database/DatabaseConnection';

import { chats, messages } from '../../infrastructure/database/schema';

import type { IMessageRepository } from './IMessageRepository';

export class MessageRepository implements IMessageRepository {
  public constructor(
    private readonly logger: ILogger,

    private readonly dbConnection: DatabaseConnection,
  ) {}

  public saveMessage(chatId: number, message: IChatMessage): void {
    const db = this.dbConnection.getDatabase();

    const statisticsJson = message.statistics
      ? JSON.stringify(message.statistics)
      : null;

    // Use onConflictDoUpdate to update message with statistics if it already exists
    // This ensures that when a message is saved first without statistics and then saved again with statistics,
    // the statistics are properly updated instead of being ignored
    db.insert(messages)
      .values({
        id: message.id,
        chat_id: chatId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        created_at: new Date().toISOString(),
        statistics: statisticsJson,
      }).onConflictDoUpdate({
        target: messages.id,
        set: {
          content: message.content,
          timestamp: message.timestamp.toISOString(),
          statistics: statisticsJson,
        },
      }).run();

    // Update chat's updated_at timestamp
    db.update(chats)
      .set({
        updated_at: new Date().toISOString(),
      })
      .where(eq(chats.id, chatId))
      .run();
  }

  public getChatMessages(chatId: number): IChatMessage[] {
    const db = this.dbConnection.getDatabase();

    const rows = db.select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      timestamp: messages.timestamp,
      statistics: messages.statistics,
    })
      .from(messages)
      .where(eq(messages.chat_id, chatId))
      .orderBy(asc(messages.timestamp))
      .all();

    return rows.map(row => {
      let statistics: IMessageStatistics | undefined;

      if (row.statistics !== null) {
        try {
          const parsed = JSON.parse(row.statistics) as IMessageStatistics;
          // Convert generatedAt string back to Date
          parsed.generatedAt = new Date(parsed.generatedAt);
          statistics = parsed;
        } catch (error: unknown) {
          const errorText = error instanceof Error ? error.message : String(error);
          this.logger.warn('Failed to parse message statistics: %s', errorText);
        }
      }

      const loadedMessage = {
        id: row.id,
        role: row.role as 'user' | 'assistant',
        content: row.content,
        timestamp: new Date(row.timestamp),
        statistics,
      };

      return loadedMessage;
    });
  }
}

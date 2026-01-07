import type { IChatMessage, IChatInfo, ILogger, IMessageStatistics } from '@writing-tools/shared';
import { asc, desc, eq } from 'drizzle-orm';

import type { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';
import { chats, messages } from '../../infrastructure/database/schema';

import type { IChatRepository } from './IChatRepository';

export class ChatRepository implements IChatRepository {
  private dbConnection: DatabaseConnection | null = null;
  private readonly logger: ILogger;

  public constructor(logger: ILogger, dbConnection: DatabaseConnection) {
    this.logger = logger;
    this.dbConnection = dbConnection;
  }

  public async initialize(): Promise<void> {
    if (this.dbConnection === null) {
      throw new Error('Database connection not provided');
    }

    try {
      await this.dbConnection.initialize();
      this.logger.info('Chat database initialized');
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to initialize chat database: %s', errorText);
      throw error;
    }
  }

  public createChat(title: string, provider: string, model: string): number {
    if (this.dbConnection === null) {
      throw new Error('Database not initialized');
    }

    const now = new Date().toISOString();
    const db = this.dbConnection.getDatabase();

    const result = db.insert(chats).values({
      title,
      provider,
      model,
      created_at: now,
      updated_at: now,
    }).returning({ id: chats.id }).get();

    return result.id;
  }

  public saveMessage(chatId: number, message: IChatMessage): void {
    if (this.dbConnection === null) {
      throw new Error('Database not initialized');
    }

    const db = this.dbConnection.getDatabase();

    const statisticsJson = message.statistics !== undefined ? JSON.stringify(message.statistics) : null;

    // Log statistics for debugging
    if (message.statistics !== undefined) {
      this.logger.debug('Saving message with statistics: messageId=%s, statistics=%j', message.id, message.statistics);
    }

    // Use onConflictDoNothing to handle duplicate messages gracefully
    db.insert(messages).values({
      id: message.id,
      chat_id: chatId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      created_at: new Date().toISOString(),
      statistics: statisticsJson,
    }).onConflictDoNothing().run();

    // Update chat's updated_at timestamp
    db.update(chats).set({
      updated_at: new Date().toISOString(),
    }).where(eq(chats.id, chatId)).run();
  }

  public getChatMessages(chatId: number): IChatMessage[] {
    if (this.dbConnection === null) {
      throw new Error('Database not initialized');
    }

    const db = this.dbConnection.getDatabase();

    const rows = db.select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      timestamp: messages.timestamp,
      statistics: messages.statistics,
    }).from(messages).where(eq(messages.chat_id, chatId)).orderBy(asc(messages.timestamp)).all();

    return rows.map(row => {
      let statistics: IMessageStatistics | undefined;

      if (row.statistics !== null && row.statistics !== undefined) {
        try {
          const parsed = JSON.parse(row.statistics) as IMessageStatistics;
          // Convert generatedAt string back to Date
          if (parsed.generatedAt !== undefined) {
            parsed.generatedAt = new Date(parsed.generatedAt);
          }
          statistics = parsed;
        } catch (error: unknown) {
          const errorText = error instanceof Error ? error.message : String(error);
          this.logger.warn('Failed to parse message statistics: %s', errorText);
        }
      }

      return {
        id: row.id,
        role: row.role as 'user' | 'assistant',
        content: row.content,
        timestamp: new Date(row.timestamp),
        statistics,
      };
    });
  }

  public getAllChats(): IChatInfo[] {
    if (this.dbConnection === null) {
      throw new Error('Database not initialized');
    }

    const db = this.dbConnection.getDatabase();

    return db.select({
      id: chats.id,
      title: chats.title,
      provider: chats.provider,
      model: chats.model,
      created_at: chats.created_at,
      updated_at: chats.updated_at,
    }).from(chats).orderBy(desc(chats.updated_at)).all();
  }

  public getChat(chatId: number): IChatInfo | null {
    if (this.dbConnection === null) {
      throw new Error('Database not initialized');
    }

    const db = this.dbConnection.getDatabase();

    const result = db.select({
      id: chats.id,
      title: chats.title,
      provider: chats.provider,
      model: chats.model,
      created_at: chats.created_at,
      updated_at: chats.updated_at,
    }).from(chats).where(eq(chats.id, chatId)).limit(1).get();

    return result ?? null;
  }

  public updateChatTitle(chatId: number, title: string): void {
    if (this.dbConnection === null) {
      throw new Error('Database not initialized');
    }

    const db = this.dbConnection.getDatabase();

    db.update(chats).set({
      title,
      updated_at: new Date().toISOString(),
    }).where(eq(chats.id, chatId)).run();
  }

  public deleteChat(chatId: number): void {
    if (this.dbConnection === null) {
      throw new Error('Database not initialized');
    }

    const db = this.dbConnection.getDatabase();

    // Permanent hard delete - messages are automatically deleted via CASCADE foreign key constraint
    db.delete(chats).where(eq(chats.id, chatId)).run();
  }

  public close(): void {
    if (this.dbConnection !== null) {
      this.dbConnection.close();
      this.dbConnection = null;
      this.logger.info('Chat database connection closed');
    }
  }
}

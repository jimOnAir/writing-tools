import type { IChatInfo } from '@writing-tools/shared';
import { desc, eq } from 'drizzle-orm';

import type { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';
import { chats } from '../../infrastructure/database/schema';

import type { IChatRepository } from './IChatRepository';

export class ChatRepository implements IChatRepository {
  public constructor(
    private readonly dbConnection: DatabaseConnection,
  ) {}

  public createChat(title: string, provider: string, model: string): number {
    const now = new Date().toISOString();
    const db = this.dbConnection.getDatabase();

    const result = db.insert(chats)
      .values({
        title,
        provider,
        model,
        created_at: now,
        updated_at: now,
      })
      .returning({ id: chats.id })
      .get();

    return result.id;
  }

  public getAllChats(): IChatInfo[] {
    const db = this.dbConnection.getDatabase();

    return db.select({
      id: chats.id,
      title: chats.title,
      provider: chats.provider,
      model: chats.model,
      created_at: chats.created_at,
      updated_at: chats.updated_at,
    }).from(chats)
      .orderBy(desc(chats.updated_at))
      .all();
  }

  public getChat(chatId: number): IChatInfo | null {
    const db = this.dbConnection.getDatabase();

    const result = db.select({
      id: chats.id,
      title: chats.title,
      provider: chats.provider,
      model: chats.model,
      created_at: chats.created_at,
      updated_at: chats.updated_at,
    }).from(chats)
      .where(eq(chats.id, chatId))
      .limit(1)
      .get();

    return result ?? null;
  }

  public updateChatTitle(chatId: number, title: string): void {
    const db = this.dbConnection.getDatabase();

    db.update(chats)
      .set({
        title,
        updated_at: new Date().toISOString(),
      })
      .where(eq(chats.id, chatId))
      .run();
  }

  public updateChatModel(chatId: number, model: string, provider: string): void {
    const db = this.dbConnection.getDatabase();

    db.update(chats)
      .set({
        model,
        provider,
        updated_at: new Date().toISOString(),
      })
      .where(eq(chats.id, chatId))
      .run();
  }

  public deleteChat(chatId: number): void {
    const db = this.dbConnection.getDatabase();

    // Permanent hard delete - messages are automatically deleted via CASCADE foreign key constraint
    db.delete(chats)
      .where(eq(chats.id, chatId))
      .run();
  }
}

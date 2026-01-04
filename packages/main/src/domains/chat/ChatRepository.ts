import type { IChatMessage, IChatInfo, ILogger } from '@writing-tools/shared';
import Database from 'better-sqlite3-multiple-ciphers';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type { IChatRepository } from './IChatRepository';

export class ChatRepository implements IChatRepository {
  private db: Database.Database | null = null;
  private readonly appPath: string;
  private readonly logger: ILogger;

  public constructor(logger: ILogger, appPath: string) {
    this.logger = logger;
    this.appPath = appPath;
  }

  public async initialize(): Promise<void> {
    try {
      await this.ensureDatabaseDirectory();
      const dbPath = this.getDatabasePath();
      this.db = new Database(dbPath);
      this.createTables();
      this.logger.info('Chat database initialized at: %s', dbPath);
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to initialize chat database: %s', errorText);
      throw error;
    }
  }

  public createChat(title: string, provider: string, model: string): number {
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO chats (title, provider, model, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title,
      provider,
      model,
      now,
      now,
    );

    return result.lastInsertRowid as number;
  }

  public saveMessage(chatId: number, message: IChatMessage): void {
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    // Use INSERT OR IGNORE to handle duplicate messages gracefully
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO messages (id, chat_id, role, content, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      chatId,
      message.role,
      message.content,
      message.timestamp.toISOString(),
      new Date().toISOString(),
    );

    // Update chat's updated_at timestamp
    const updateChatStmt = this.db.prepare(`
      UPDATE chats SET updated_at = ? WHERE id = ?
    `);
    updateChatStmt.run(new Date().toISOString(), chatId);
  }

  public getChatMessages(chatId: number): IChatMessage[] {
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      SELECT id, role, content, timestamp
      FROM messages
      WHERE chat_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(chatId) as Array<{
      id: string,
      role: 'user' | 'assistant',
      content: string,
      timestamp: string,
    }>;

    return rows.map(row => ({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: new Date(row.timestamp),
    }));
  }

  public getAllChats(): IChatInfo[] {
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      SELECT id, title, provider, model, created_at, updated_at
      FROM chats
      ORDER BY updated_at DESC
    `);

    return stmt.all() as IChatInfo[];
  }

  public getChat(chatId: number): IChatInfo | null {
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      SELECT id, title, provider, model, created_at, updated_at
      FROM chats
      WHERE id = ?
    `);

    const result = stmt.get(chatId) as IChatInfo | undefined;

    return result ?? null;
  }

  public updateChatTitle(chatId: number, title: string): void {
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      UPDATE chats
      SET title = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(title, new Date().toISOString(), chatId);
  }

  public deleteChat(chatId: number): void {
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    // Permanent hard delete - messages are automatically deleted via CASCADE foreign key constraint
    const stmt = this.db.prepare(`
      DELETE FROM chats
      WHERE id = ?
    `);

    stmt.run(chatId);
  }

  public close(): void {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
      this.logger.info('Chat database connection closed');
    }
  }

  private createTables(): void {
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    // Check if chats table exists
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='chats'
    `).get() !== undefined;

    if (tableExists) {
      // Migrate existing data: set default values for NULL fields
      try {
        this.db.exec(`
          UPDATE chats
          SET title = COALESCE(title, ''),
              provider = COALESCE(provider, 'ollama'),
              model = COALESCE(model, '')
          WHERE title IS NULL OR provider IS NULL OR model IS NULL
        `);
      } catch {
        // Migration failed, but continue
      }
    }

    // Create chats table with NOT NULL constraints
    // If table exists, this won't recreate it, but new tables will have constraints
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT '',
        provider TEXT NOT NULL DEFAULT 'ollama',
        model TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      )
    `);

    // Create index for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)
    `);
  }

  private getDatabasePath(): string {
    return path.join(this.appPath, 'chats.db');
  }

  private async ensureDatabaseDirectory(): Promise<void> {
    try {
      await fs.access(this.appPath);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(this.appPath, { recursive: true });
    }
  }
}

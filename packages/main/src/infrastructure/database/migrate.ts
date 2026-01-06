import type { ILogger } from '@writing-tools/shared';
import type Database from 'better-sqlite3';

/**
 * Runs initial schema migration for existing databases
 * This handles backward compatibility with existing databases
 */
export function runInitialMigration(db: Database.Database, logger: ILogger): void {
  // Check if chats table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='chats'
  `).get() !== undefined;

  if (tableExists) {
    // Migrate existing data: set default values for NULL fields
    try {
      db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)
  `);
}

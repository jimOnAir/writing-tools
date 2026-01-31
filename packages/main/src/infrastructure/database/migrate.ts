import type Database from 'better-sqlite3';

/**
 * Runs initial schema migration for existing databases
 * This handles backward compatibility with existing databases
 */
export function runInitialMigration(db: Database.Database): void {
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
      statistics TEXT,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )
  `);

  // Add statistics column to existing messages table if it doesn't exist
  try {
    db.exec(`
      ALTER TABLE messages ADD COLUMN statistics TEXT
    `);
  } catch {
    // Column already exists, ignore error
  }

  // Create index for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)
  `);

  // Create open_tabs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS open_tabs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER,
      tab_order INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      scroll_position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )
  `);

  // Add scroll_position column to existing open_tabs table if it doesn't exist
  try {
    db.exec(`
      ALTER TABLE open_tabs ADD COLUMN scroll_position INTEGER NOT NULL DEFAULT 0
    `);
  } catch {
    // Column already exists, ignore error
  }

  // Create index for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_open_tabs_chat_id ON open_tabs(chat_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_open_tabs_tab_order ON open_tabs(tab_order)
  `);
}

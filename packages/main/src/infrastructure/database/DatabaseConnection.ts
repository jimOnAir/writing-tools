import type { ILogger } from '@writing-tools/shared';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { runInitialMigration } from './migrate';
import * as schema from './schema';

export class DatabaseConnection {
  private db: Database.Database | null = null;
  private drizzleDb: BetterSQLite3Database<typeof schema> | null = null;

  public constructor(
    private readonly logger: ILogger,
    private readonly appPath: string,
  ) {}

  public async initialize(): Promise<void> {
    try {
      await this.ensureDatabaseDirectory();
      const dbPath = this.getDatabasePath();
      this.db = new Database(dbPath);
      runInitialMigration(this.db);
      this.drizzleDb = drizzle(this.db, { schema });
      this.logger.info('Database connection initialized at: %s', dbPath);

      // TODO: enable WAL     // db.pragma('journal_mode = WAL');
      // TODO: enable FK constrains      // db.pragma('foreign_keys = ON');
      // TODO: enable db.pragma('synchronous = NORMAL'); // Normal synchronous mode for better performance
      // TODO: enable db.pragma('temp_store = MEMORY'); // Use memory for temporary tables
      // TODO: enable db.pragma('cache_size = -50000'); // Set page cache size to 50MB (negative value means KB)
      // TODO: enable db.pragma('mmap_size = 268435456'); // Set memory-mapped file I/O to 256MB
      // TODO: enable db.pragma('optimize'); // Run internal query planner cleanup
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize database connection: %s', errorText);
      throw error;
    }
  }

  public getDatabase(): BetterSQLite3Database<typeof schema> {
    if (this.drizzleDb === null) {
      throw new Error('Database not initialized');
    }

    return this.drizzleDb;
  }

  public getRawDatabase(): Database.Database {
    if (this.db === null) {
      throw new Error('Database not initialized');
    }

    return this.db;
  }

  public close(): void {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
      this.drizzleDb = null;
      this.logger.info('Database connection closed');
    }
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

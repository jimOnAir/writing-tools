import type { ILogger } from '@writing-tools/shared';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { runInitialMigration } from './migrate';
import * as schema from './schema';

const CACHE_SIZE_KB = 50_000; // 50MB page cache (SQLite uses negative value for KB)
const MMAP_SIZE_BYTES = 256 * 1024 * 1024; // 256MB memory-mapped I/O

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
      this.applyPragmas(this.db);
      runInitialMigration(this.db);
      this.drizzleDb = drizzle(this.db, { schema });
      this.logger.info('Database connection initialized at: %s', dbPath);
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
      this.db.pragma('analysis_limit = 400');
      this.db.pragma('optimize');
      this.db.close();
      this.db = null;
      this.drizzleDb = null;
      this.logger.info('Database connection closed');
    }
  }

  private applyPragmas(db: Database.Database): void {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');
    db.pragma(`cache_size = -${CACHE_SIZE_KB}`);
    db.pragma(`mmap_size = ${MMAP_SIZE_BYTES}`);
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

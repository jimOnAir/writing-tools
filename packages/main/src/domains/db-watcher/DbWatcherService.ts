import type { ILogger } from '@writing-tools/shared';
import { getTableName } from 'drizzle-orm';
import EventEmitter from 'node:events';

import type { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';

import type { DbWatcherRepository } from './DbWatcherRepository';
import {
  getTableColumnNames,
  getWatchedTable,
  WATCHED_TABLES,
} from './dbWatcherTables';
import { EDbOperation } from './EDbOperation';
import type { IDbWatcherService } from './IDbWatcherService';

export type TTableEvent = { operation: string, payload: Record<string, unknown> };

export class DbWatcherService extends EventEmitter implements IDbWatcherService {
  private functionsRegistered = false;
  private readonly triggersCreated = new Set<string>();

  public constructor(
    private readonly dbConnection: DatabaseConnection,
    private readonly dbWatcherRepository: DbWatcherRepository,
    private readonly logger: ILogger,
  ) {
    super();
  }

  public on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    const result = super.on(event, listener);

    const tableName = String(event);
    const watchedTable = getWatchedTable(tableName);

    if (watchedTable !== undefined) {
      this.ensureFunctionsRegistered();
    }

    if (watchedTable !== undefined && !this.triggersCreated.has(tableName)) {
      this.triggersCreated.add(tableName);
      this.dbWatcherRepository.dropTriggers(tableName);
      this.dbWatcherRepository.createTriggers(
        tableName,
        `watcher_${tableName}`,
        [EDbOperation.DELETE, EDbOperation.INSERT, EDbOperation.UPDATE],
        getTableColumnNames(watchedTable),
      );
      this.logger.info('DbWatcherService: triggers created for %s (first subscriber)', tableName);
    }

    return result;
  }

  private ensureFunctionsRegistered(): void {
    if (this.functionsRegistered) {
      return;
    }
    this.functionsRegistered = true;
    const db = this.dbConnection.getRawDatabase();

    for (const table of WATCHED_TABLES) {
      const tableName = getTableName(table);
      const functionName = `watcher_${tableName}`;

      db.function(functionName, { varargs: false }, (operation: string, valueJson: string) => {
        try {
          const payload = JSON.parse(valueJson) as Record<string, unknown>;
          this.emit(tableName, { operation, payload });
        } catch (error: unknown) {
          const errorText = error instanceof Error ? error.message : String(error);
          this.logger.error('DbWatcherService %s callback error: %s', functionName, errorText);
        }
      });
    }

    const tableNames = WATCHED_TABLES.map((t) => getTableName(t)).join(' and ');
    this.logger.info('DbWatcherService: SQLite functions registered for %s', tableNames);
  }
}

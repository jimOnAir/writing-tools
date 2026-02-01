import type { ILogger } from '@writing-tools/shared';

import type { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';

import { EDbOperation } from './EDbOperation';

export class DbWatcherRepository {
  public constructor(
    private readonly dbConnection: DatabaseConnection,
    private readonly logger: ILogger,
  ) {}

  public createTriggers(
    tableName: string,
    functionName: string,
    operations: EDbOperation[],
    columns: string[],
  ): void {
    const db = this.dbConnection.getRawDatabase();

    for (const operation of operations) {
      const triggerName = this.getTriggerName(tableName, operation);
      const rowRef = operation === EDbOperation.DELETE ? 'OLD' : 'NEW';
      const jsonPairs = columns
        .map((col) => `'${col}', ${rowRef}.${col}`)
        .join(', ');
      const sql = `CREATE TRIGGER ${triggerName} AFTER ${operation} ON ${tableName}
        WHEN EXISTS (SELECT 1 FROM pragma_function_list WHERE name = '${functionName}')
        BEGIN
          SELECT ${functionName}('${operation}', json_object(${jsonPairs}));
        END`;
      db.prepare(sql).run();
      this.logger.debug('Created trigger: %s', triggerName);
    }
  }

  public dropTriggers(tableName: string): void {
    const db = this.dbConnection.getRawDatabase();
    const rows = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'trigger' AND tbl_name = ?
    `).all(tableName) as Array<{ name: string }>;

    for (const row of rows) {
      db.prepare(`DROP TRIGGER IF EXISTS ${row.name}`).run();
      this.logger.debug('Dropped trigger: %s', row.name);
    }
  }

  private getTriggerName(tableName: string, operation: EDbOperation): string {
    return `${tableName}_${operation}`;
  }
}

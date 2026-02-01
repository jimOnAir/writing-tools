import { getTableColumns, getTableName } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { chats, messages } from '../../infrastructure/database/schema';

export const WATCHED_TABLES: SQLiteTable[] = [chats, messages];

export function getTableColumnNames(table: SQLiteTable): string[] {
  return Object.values(getTableColumns(table))
    .map((col) => col.name)
    .sort((a, b) => a.localeCompare(b));
}

export function getWatchedTable(tableName: string): SQLiteTable | undefined {
  return WATCHED_TABLES.find((t) => getTableName(t) === tableName);
}

import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const chats = sqliteTable('chats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull().default(''),
  provider: text('provider').notNull().default('ollama'),
  model: text('model').notNull().default(''),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chat_id: integer('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  timestamp: text('timestamp').notNull(),
  created_at: text('created_at').notNull(),
  statistics: text('statistics'),
});

export const chatsRelations = relations(chats, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chat_id],
    references: [chats.id],
  }),
}));

export const openTabs = sqliteTable('open_tabs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').references(() => chats.id, { onDelete: 'cascade' }),
  tabOrder: integer('tab_order').notNull(),
  isActive: integer('is_active').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

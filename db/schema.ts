import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const owners = sqliteTable('owners',{ id:integer('id').primaryKey(), userId:text('user_id').notNull() });
export const members = sqliteTable('members',{email:text('email').primaryKey(),userId:text('user_id'),role:text('role').notNull(),name:text('name').notNull()});
export const documents = sqliteTable('documents',{id:integer('id').primaryKey(),revision:integer('revision').notNull(),payload:text('payload').notNull(),changeId:text('change_id').notNull()});
export const audits = sqliteTable('audits',{id:text('id').primaryKey(),actor:text('actor').notNull(),operation:text('operation').notNull(),createdAt:text('created_at').notNull(),revision:integer('revision').notNull()});

import { pgTable, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const userTasksTable = pgTable(
  "user_tasks",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull().default(""),
    notes: text("notes").notNull().default(""),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: varchar("status", { length: 32 }).notNull().default("open"),
    priority: varchar("priority", { length: 16 }).notNull().default("normal"),
    linkedEntityType: varchar("linked_entity_type", { length: 64 }).notNull().default(""),
    linkedEntityId: varchar("linked_entity_id", { length: 64 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("user_tasks_user_idx").on(table.userId),
    statusIdx: index("user_tasks_status_idx").on(table.status),
    linkedIdx: index("user_tasks_linked_idx").on(table.linkedEntityType, table.linkedEntityId),
  }),
);

export type UserTask = typeof userTasksTable.$inferSelect;
export type InsertUserTask = typeof userTasksTable.$inferInsert;

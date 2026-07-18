import { pgTable, varchar, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const activityEventsTable = pgTable(
  "activity_events",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    title: varchar("title", { length: 500 }).notNull().default(""),
    description: text("description").notNull().default(""),
    linkedEntityType: varchar("linked_entity_type", { length: 64 }).notNull().default(""),
    linkedEntityId: varchar("linked_entity_id", { length: 64 }).notNull().default(""),
    clientId: varchar("client_id", { length: 64 }).notNull().default(""),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("activity_events_user_idx").on(table.userId),
    linkedIdx: index("activity_events_linked_idx").on(table.linkedEntityType, table.linkedEntityId),
    clientIdx: index("activity_events_client_idx").on(table.clientId),
  }),
);

export type ActivityEvent = typeof activityEventsTable.$inferSelect;
export type InsertActivityEvent = typeof activityEventsTable.$inferInsert;

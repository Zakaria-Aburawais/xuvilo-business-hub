import { pgTable, varchar, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const fileObjectsTable = pgTable(
  "file_objects",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    storageKey: varchar("storage_key", { length: 1024 }).notNull(),
    filename: varchar("filename", { length: 500 }).notNull().default(""),
    contentType: varchar("content_type", { length: 128 }).notNull().default("application/octet-stream"),
    sizeBytes: integer("size_bytes").notNull().default(0),
    purpose: varchar("purpose", { length: 64 }).notNull().default("generic"),
    linkedEntityType: varchar("linked_entity_type", { length: 64 }).notNull().default(""),
    linkedEntityId: varchar("linked_entity_id", { length: 64 }).notNull().default(""),
    clientId: varchar("client_id", { length: 64 }).notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("file_objects_user_idx").on(table.userId),
    linkedIdx: index("file_objects_linked_idx").on(table.linkedEntityType, table.linkedEntityId),
    clientIdx: index("file_objects_client_idx").on(table.clientId),
    purposeIdx: index("file_objects_purpose_idx").on(table.purpose),
  }),
);

export type FileObject = typeof fileObjectsTable.$inferSelect;
export type InsertFileObject = typeof fileObjectsTable.$inferInsert;

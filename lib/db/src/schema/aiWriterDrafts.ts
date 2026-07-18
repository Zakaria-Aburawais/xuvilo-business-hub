import { pgTable, varchar, text, timestamp, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const aiWriterDraftsTable = pgTable(
  "ai_writer_drafts",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 64 }).notNull(),
    language: varchar("language", { length: 8 }).notNull().default("en"),
    tone: varchar("tone", { length: 32 }).notNull().default("polite"),
    length: varchar("length", { length: 16 }).notNull().default("medium"),
    subject: text("subject").notNull().default(""),
    body: text("body").notNull().default(""),
    inputs: jsonb("inputs").notNull().default({}),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("ai_writer_drafts_user_idx").on(table.userId),
    createdIdx: index("ai_writer_drafts_created_idx").on(table.createdAt),
  }),
);

export type AiWriterDraft = typeof aiWriterDraftsTable.$inferSelect;
export type InsertAiWriterDraft = typeof aiWriterDraftsTable.$inferInsert;

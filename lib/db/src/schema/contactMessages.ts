import {
  pgTable,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const contactMessagesTable = pgTable(
  "contact_messages",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    name: varchar("name", { length: 200 }).notNull().default(""),
    email: varchar("email", { length: 320 }).notNull().default(""),
    subject: varchar("subject", { length: 300 }).notNull().default(""),
    message: text("message").notNull().default(""),
    lang: varchar("lang", { length: 8 }).notNull().default("en"),
    ip: varchar("ip", { length: 64 }).notNull().default(""),
    userAgent: text("user_agent").notNull().default(""),
    mailStatus: varchar("mail_status", { length: 16 }).notNull().default("pending"),
    triageStatus: varchar("triage_status", { length: 16 })
      .notNull()
      .default("new"),
  },
  (table) => ({
    createdIdx: index("contact_messages_created_idx").on(table.createdAt),
    emailIdx: index("contact_messages_email_idx").on(table.email),
    mailStatusIdx: index("contact_messages_mail_status_idx").on(table.mailStatus),
    triageStatusIdx: index("contact_messages_triage_status_idx").on(
      table.triageStatus,
    ),
    nameTrgmIdx: index("contact_messages_name_trgm_idx").using(
      "gin",
      sql`${table.name} gin_trgm_ops`,
    ),
    emailTrgmIdx: index("contact_messages_email_trgm_idx").using(
      "gin",
      sql`${table.email} gin_trgm_ops`,
    ),
    subjectTrgmIdx: index("contact_messages_subject_trgm_idx").using(
      "gin",
      sql`${table.subject} gin_trgm_ops`,
    ),
  }),
);

export type ContactMessage = typeof contactMessagesTable.$inferSelect;
export type InsertContactMessage = typeof contactMessagesTable.$inferInsert;

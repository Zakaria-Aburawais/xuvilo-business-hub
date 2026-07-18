import { pgTable, varchar, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const rfqDocumentsTable = pgTable(
  "rfq_documents",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    rfqNumber: varchar("rfq_number", { length: 128 }).notNull().default(""),
    prNumber: varchar("pr_number", { length: 128 }).notNull().default(""),
    clientId: varchar("client_id", { length: 64 }).notNull().default(""),
    detectedClientName: varchar("detected_client_name", { length: 255 }).notNull().default(""),
    enquiryDate: varchar("enquiry_date", { length: 64 }).notNull().default(""),
    closingDate: varchar("closing_date", { length: 64 }).notNull().default(""),
    submissionEmail: varchar("submission_email", { length: 320 }).notNull().default(""),
    submissionInstructions: text("submission_instructions").notNull().default(""),
    paymentTerms: text("payment_terms").notNull().default(""),
    deliveryTerms: text("delivery_terms").notNull().default(""),
    validityDays: integer("validity_days").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default(""),
    itemCount: integer("item_count").notNull().default(0),
    parsedData: jsonb("parsed_data").notNull().default({}),
    researchData: jsonb("research_data").notNull().default({}),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    taskId: varchar("task_id", { length: 64 }).notNull().default(""),
    fileId: varchar("file_id", { length: 64 }).notNull().default(""),
    sourceFilename: varchar("source_filename", { length: 500 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("rfq_documents_user_idx").on(table.userId),
    statusIdx: index("rfq_documents_status_idx").on(table.status),
    clientIdx: index("rfq_documents_client_idx").on(table.clientId),
  }),
);

export type RfqDocument = typeof rfqDocumentsTable.$inferSelect;
export type InsertRfqDocument = typeof rfqDocumentsTable.$inferInsert;

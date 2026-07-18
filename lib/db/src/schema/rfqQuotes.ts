import { pgTable, varchar, text, timestamp, numeric, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const rfqQuotesTable = pgTable(
  "rfq_quotes",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    quoteNumber: varchar("quote_number", { length: 128 }).notNull().default(""),
    rfqDocumentId: varchar("rfq_document_id", { length: 64 }).notNull().default(""),
    clientId: varchar("client_id", { length: 64 }).notNull().default(""),
    rfqReference: varchar("rfq_reference", { length: 128 }).notNull().default(""),
    subject: varchar("subject", { length: 500 }).notNull().default(""),
    quoteDate: varchar("quote_date", { length: 32 }).notNull().default(""),
    validUntil: varchar("valid_until", { length: 32 }).notNull().default(""),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    subtotal: numeric("subtotal", { precision: 18, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 18, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 18, scale: 2 }).notNull().default("0"),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    lineItems: jsonb("line_items").notNull().default([]),
    commercialTerms: jsonb("commercial_terms").notNull().default({}),
    signatureData: text("signature_data").notNull().default(""),
    signatoryName: varchar("signatory_name", { length: 255 }).notNull().default(""),
    signatoryTitle: varchar("signatory_title", { length: 255 }).notNull().default(""),
    pdfFileId: varchar("pdf_file_id", { length: 64 }).notNull().default(""),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    emailSentTo: varchar("email_sent_to", { length: 1000 }).notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("rfq_quotes_user_idx").on(table.userId),
    statusIdx: index("rfq_quotes_status_idx").on(table.status),
    quoteNumberIdx: uniqueIndex("rfq_quotes_user_quote_number_uniq").on(table.userId, table.quoteNumber),
    clientIdx: index("rfq_quotes_client_idx").on(table.clientId),
    rfqIdx: index("rfq_quotes_rfq_idx").on(table.rfqDocumentId),
  }),
);

export type RfqQuote = typeof rfqQuotesTable.$inferSelect;
export type InsertRfqQuote = typeof rfqQuotesTable.$inferInsert;

import { pgTable, varchar, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const companyProfilesTable = pgTable(
  "company_profiles",
  {
    id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    companyName: varchar("company_name", { length: 255 }).notNull().default(""),
    logoData: text("logo_data").notNull().default(""),
    address: text("address").notNull().default(""),
    city: varchar("city", { length: 128 }).notNull().default(""),
    country: varchar("country", { length: 64 }).notNull().default(""),
    phone: varchar("phone", { length: 64 }).notNull().default(""),
    email: varchar("email", { length: 320 }).notNull().default(""),
    website: varchar("website", { length: 512 }).notNull().default(""),
    taxOrVatNumber: varchar("tax_or_vat_number", { length: 64 }).notNull().default(""),
    registrationNumber: varchar("registration_number", { length: 64 }).notNull().default(""),
    defaultCurrency: varchar("default_currency", { length: 8 }).notNull().default("USD"),
    defaultLanguage: varchar("default_language", { length: 8 }).notNull().default("en"),
    defaultPaymentTerms: text("default_payment_terms").notNull().default(""),
    defaultNotes: text("default_notes").notNull().default(""),
    brandColor: varchar("brand_color", { length: 16 }).notNull().default("#185FA5"),
    signatoryName: varchar("signatory_name", { length: 255 }).notNull().default(""),
    signatoryTitle: varchar("signatory_title", { length: 255 }).notNull().default(""),
    signatureData: text("signature_data").notNull().default(""),
    bankName: varchar("bank_name", { length: 255 }).notNull().default(""),
    bankAccountName: varchar("bank_account_name", { length: 255 }).notNull().default(""),
    bankAccountNumber: varchar("bank_account_number", { length: 128 }).notNull().default(""),
    bankIban: varchar("bank_iban", { length: 128 }).notNull().default(""),
    bankSwift: varchar("bank_swift", { length: 64 }).notNull().default(""),
    bankAddress: text("bank_address").notNull().default(""),
    defaultDeliveryTerms: text("default_delivery_terms").notNull().default(""),
    defaultWarranty: text("default_warranty").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userUniq: uniqueIndex("company_profiles_user_uniq").on(table.userId),
  }),
);

export type CompanyProfile = typeof companyProfilesTable.$inferSelect;
export type InsertCompanyProfile = typeof companyProfilesTable.$inferInsert;

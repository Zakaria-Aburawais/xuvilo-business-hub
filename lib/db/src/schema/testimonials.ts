import { pgTable, serial, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  quoteEn: text("quote_en").notNull(),
  quoteAr: text("quote_ar").notNull(),
  roleEn: varchar("role_en", { length: 255 }).notNull(),
  roleAr: varchar("role_ar", { length: 255 }).notNull(),
  stars: integer("stars").notNull().default(5),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTestimonialSchema = z.object({
  name: z.string().min(1).max(255),
  quoteEn: z.string().min(1),
  quoteAr: z.string().min(1),
  roleEn: z.string().min(1).max(255),
  roleAr: z.string().min(1).max(255),
  stars: z.number().int().min(1).max(5).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonialsTable.$inferSelect;

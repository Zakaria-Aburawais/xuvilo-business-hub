import { db, usersTable, type AppUser } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function findOrCreateUser(email: string, name: string): Promise<AppUser> {
  const norm = normalizeEmail(email);
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, norm)).limit(1);
  if (existing[0]) {
    if (name && name !== existing[0].name) {
      const [updated] = await db
        .update(usersTable)
        .set({ name, updatedAt: new Date() })
        .where(eq(usersTable.id, existing[0].id))
        .returning();
      return updated ?? existing[0];
    }
    return existing[0];
  }
  const [created] = await db
    .insert(usersTable)
    .values({
      id: randomUUID(),
      email: norm,
      name: name || "",
      tier: "free",
    })
    .returning();
  if (!created) throw new Error("Failed to create user");
  return created;
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const norm = normalizeEmail(email);
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, norm)).limit(1);
  return rows[0] ?? null;
}

export async function setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
  await db
    .update(usersTable)
    .set({ stripeCustomerId, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
}

export async function createUserWithPassword(
  email: string,
  name: string,
  passwordHash: string,
): Promise<AppUser> {
  const norm = normalizeEmail(email);
  const [created] = await db
    .insert(usersTable)
    .values({
      id: randomUUID(),
      email: norm,
      name: name || "",
      passwordHash,
      tier: "free",
    })
    .returning();
  if (!created) throw new Error("Failed to create user");
  return created;
}

export async function getUserByStripeCustomerId(customerId: string): Promise<AppUser | null> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.stripeCustomerId, customerId))
    .limit(1);
  return rows[0] ?? null;
}

export async function setPreferredLanguage(userId: string, lang: string): Promise<void> {
  await db
    .update(usersTable)
    .set({ preferredLanguage: lang, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
}

export async function setUserPasswordHash(userId: string, passwordHash: string): Promise<void> {
  await db
    .update(usersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
}

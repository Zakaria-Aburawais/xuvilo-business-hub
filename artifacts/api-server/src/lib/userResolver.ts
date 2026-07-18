import { db, usersTable, type AppUser } from "@workspace/db";
import { eq } from "drizzle-orm";

const cache = new Map<string, { id: string; tier: string; expiresAt: number }>();
const TTL_MS = 60_000;

/**
 * Resolves an authenticated email to its full app user row, with a small
 * in-memory TTL cache so we don't hit the DB on every authenticated request.
 */
export async function resolveAuthedUser(email: string): Promise<AppUser | null> {
  const norm = email.toLowerCase().trim();
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, norm)).limit(1);
  return rows[0] ?? null;
}

/** Lightweight: returns only id+tier; cached for 60s. */
export async function resolveUserIdAndTier(email: string): Promise<{ id: string; tier: string } | null> {
  const norm = email.toLowerCase().trim();
  const now = Date.now();
  const cached = cache.get(norm);
  if (cached && cached.expiresAt > now) return { id: cached.id, tier: cached.tier };
  const user = await resolveAuthedUser(norm);
  if (!user) return null;
  cache.set(norm, { id: user.id, tier: user.tier ?? "free", expiresAt: now + TTL_MS });
  return { id: user.id, tier: user.tier ?? "free" };
}

import { db, userSettingsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

/** Read a single setting value (or empty string if not set). */
export async function getSetting(userId: string, key: string): Promise<string> {
  const rows = await db
    .select({ value: userSettingsTable.value })
    .from(userSettingsTable)
    .where(and(eq(userSettingsTable.userId, userId), eq(userSettingsTable.key, key)))
    .limit(1);
  return rows[0]?.value ?? "";
}

/** Read all settings as a map. */
export async function getAllSettings(userId: string): Promise<Record<string, string>> {
  const rows = await db
    .select({ key: userSettingsTable.key, value: userSettingsTable.value })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId));
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/** Upsert a single setting (case-insensitive key max 128 chars). */
export async function setSetting(userId: string, key: string, value: string): Promise<void> {
  const k = key.slice(0, 128);
  const v = (value ?? "").slice(0, 8192);
  await db
    .insert(userSettingsTable)
    .values({ userId, key: k, value: v })
    .onConflictDoUpdate({
      target: [userSettingsTable.userId, userSettingsTable.key],
      set: { value: v, updatedAt: new Date() },
    });
}

/** Upsert many settings in a single transaction-ish loop. */
export async function setSettings(userId: string, kv: Record<string, string>): Promise<void> {
  for (const [k, v] of Object.entries(kv)) {
    await setSetting(userId, k, String(v ?? ""));
  }
}

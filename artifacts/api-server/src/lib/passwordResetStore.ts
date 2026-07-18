import { db, passwordResetTokensTable } from "@workspace/db";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

const TOKEN_TTL_MS = 1000 * 60 * 30;

export function generateResetToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  return { token, tokenHash, expiresAt };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createResetToken(email: string): Promise<{ token: string; expiresAt: Date }> {
  const { token, tokenHash, expiresAt } = generateResetToken();
  await db.insert(passwordResetTokensTable).values({
    tokenHash,
    email: email.toLowerCase().trim(),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function consumeResetToken(token: string): Promise<string | null> {
  const tokenHash = hashResetToken(token);
  const now = new Date();
  const updated = await db
    .update(passwordResetTokensTable)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, now),
      ),
    )
    .returning({ email: passwordResetTokensTable.email });
  return updated[0]?.email ?? null;
}

export async function purgeExpiredTokens(): Promise<void> {
  await db
    .delete(passwordResetTokensTable)
    .where(lt(passwordResetTokensTable.expiresAt, new Date(Date.now() - 1000 * 60 * 60 * 24)));
}

export async function invalidateUserTokens(email: string): Promise<void> {
  const norm = email.toLowerCase().trim();
  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokensTable.email, norm), isNull(passwordResetTokensTable.usedAt)));
}

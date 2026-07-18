/**
 * Fuzzy-match a detected RFQ buyer name against the user's CRM client list.
 * Uses lowercase token-overlap scoring + short_code exact match.
 */
import { db, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface ClientMatch {
  id: string;
  name: string;
  company: string;
  shortCode: string;
  score: number;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  "co", "ltd", "inc", "llc", "the", "and", "of", "for", "company", "corporation",
  "gmbh", "sa", "ag", "bv", "limited", "group",
]);

/** Returns the best match (score >= 0.4) or null. */
export async function detectClient(userId: string, rfqText: string): Promise<ClientMatch | null> {
  const allClients = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      company: clientsTable.company,
      shortCode: clientsTable.shortCode,
    })
    .from(clientsTable)
    .where(eq(clientsTable.userId, userId));
  if (allClients.length === 0) return null;

  const head = rfqText.slice(0, 2000).toUpperCase();
  // Short code: exact substring match (e.g. ZOC, NOC)
  for (const c of allClients) {
    if (c.shortCode && head.includes(c.shortCode.toUpperCase())) {
      return { id: c.id, name: c.name, company: c.company, shortCode: c.shortCode, score: 1 };
    }
  }
  const headTokens = new Set(tokenize(head));
  let best: ClientMatch | null = null;
  for (const c of allClients) {
    const candidate = `${c.name} ${c.company}`;
    const tokens = tokenize(candidate);
    if (tokens.length === 0) continue;
    let hits = 0;
    for (const t of tokens) if (headTokens.has(t)) hits++;
    const score = hits / tokens.length;
    if (score >= 0.4 && (!best || score > best.score)) {
      best = { id: c.id, name: c.name, company: c.company, shortCode: c.shortCode, score };
    }
  }
  return best;
}

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { eq, inArray, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, usersTable, aiWriterDraftsTable } from "@workspace/db";

vi.mock("../../lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

// Mock the AI provider so POST /ai-writer/generate succeeds without a real
// key. The generate handler is what invokes persistDraft (the trim path).
vi.mock("../../services/ai-provider", () => {
  class AIProviderError extends Error {}
  class AIProviderUnavailableError extends Error {
    provider = "openai";
    quotaExceeded = false;
  }
  return {
    generateJson: vi.fn(async () =>
      JSON.stringify({ subject: "Test subject", body: "Test body" }),
    ),
    getActiveProvider: () => "mock",
    getActiveModel: () => "mock-model",
    isAIConfigured: () => true,
    AIProviderError,
    AIProviderUnavailableError,
  };
});

const aiWriterRouter = (await import("../aiwriter")).default;
const { issueToken } = await import("../../lib/auth");

const OWNER_EMAIL = "aiwriter-pinned-owner-test@example.com";
const OTHER_EMAIL = "aiwriter-pinned-other-test@example.com";
const TEST_EMAILS = [OWNER_EMAIL, OTHER_EMAIL];

const OWNER_ID = randomUUID();
const OTHER_ID = randomUUID();

const DRAFTS_PER_USER_LIMIT = 50;
const UNPINNED_SEEDED = 55;

function makeApp(): Express {
  const app = express();
  app.set("trust proxy", true);
  app.use((req, _res, next) => {
    (req as unknown as { log: unknown }).log = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };
    next();
  });
  app.use("/api", aiWriterRouter);
  return app;
}

async function cleanupRows() {
  await db
    .delete(aiWriterDraftsTable)
    .where(inArray(aiWriterDraftsTable.userId, [OWNER_ID, OTHER_ID]));
  await db.delete(usersTable).where(inArray(usersTable.email, TEST_EMAILS));
}

let pinnedId: string;
let otherUsersDraftId: string;

beforeAll(async () => {
  await cleanupRows();
  await db.insert(usersTable).values([
    { id: OWNER_ID, email: OWNER_EMAIL, name: "Pinned Owner", tier: "free" },
    { id: OTHER_ID, email: OTHER_EMAIL, name: "Other User", tier: "free" },
  ]);

  const base = Date.now() - 10 * 60_000;

  // The pinned draft is intentionally the OLDEST row, so a naive trim that
  // ignores the pinned flag would delete it first.
  pinnedId = randomUUID();
  await db.insert(aiWriterDraftsTable).values({
    id: pinnedId,
    userId: OWNER_ID,
    purpose: "formal_business",
    subject: "Protected pinned draft",
    body: "Keep me forever",
    inputs: {},
    pinned: true,
    createdAt: new Date(base - 60_000),
  });

  // 55 newer unpinned drafts, distinct timestamps so ordering is stable.
  const unpinned = Array.from({ length: UNPINNED_SEEDED }, (_, i) => ({
    id: randomUUID(),
    userId: OWNER_ID,
    purpose: "formal_business",
    subject: `Unpinned draft ${i + 1}`,
    body: `Body ${i + 1}`,
    inputs: {},
    pinned: false,
    createdAt: new Date(base + i * 1000),
  }));
  await db.insert(aiWriterDraftsTable).values(unpinned);

  // A draft belonging to a different user, for the PATCH ownership test.
  otherUsersDraftId = randomUUID();
  await db.insert(aiWriterDraftsTable).values({
    id: otherUsersDraftId,
    userId: OTHER_ID,
    purpose: "formal_business",
    subject: "Someone else's draft",
    body: "Not yours",
    inputs: {},
    pinned: false,
    createdAt: new Date(),
  });
});

afterAll(async () => {
  await cleanupRows();
  vi.resetModules();
});

describe("AI Writer drafts — pinned drafts survive the trim path", () => {
  it("keeps the pinned draft and caps unpinned drafts at the limit after a new generation", async () => {
    const app = makeApp();

    // Trigger persistDraft (and its trim) via a real generation request.
    const res = await request(app)
      .post("/api/ai-writer/generate")
      .set("Authorization", `Bearer ${issueToken(OWNER_EMAIL)}`)
      .send({
        purpose: "formal_business",
        mainPurpose: "Trigger the trim path",
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.draftId).toBeTruthy();

    // The pinned draft (oldest row of all) must still exist.
    const [pinnedRow] = await db
      .select()
      .from(aiWriterDraftsTable)
      .where(eq(aiWriterDraftsTable.id, pinnedId))
      .limit(1);
    expect(pinnedRow).toBeTruthy();
    expect(pinnedRow!.pinned).toBe(true);

    // Unpinned drafts must be capped at DRAFTS_PER_USER_LIMIT.
    const unpinnedRows = await db
      .select({ id: aiWriterDraftsTable.id })
      .from(aiWriterDraftsTable)
      .where(
        and(
          eq(aiWriterDraftsTable.userId, OWNER_ID),
          eq(aiWriterDraftsTable.pinned, false),
        ),
      );
    expect(unpinnedRows.length).toBe(DRAFTS_PER_USER_LIMIT);

    // The newly generated draft must be among the survivors (trim drops the
    // oldest, never the newest).
    expect(unpinnedRows.map((r) => r.id)).toContain(res.body.draftId);
  });

  it("GET /ai-writer/drafts returns the pinned draft first despite being oldest", async () => {
    const app = makeApp();
    const res = await request(app)
      .get("/api/ai-writer/drafts")
      .set("Authorization", `Bearer ${issueToken(OWNER_EMAIL)}`);
    expect(res.status).toBe(200);
    const drafts = res.body.drafts as Array<{ id: string; pinned: boolean }>;
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts[0]!.id).toBe(pinnedId);
    expect(drafts[0]!.pinned).toBe(true);
    // Every pinned draft sorts before every unpinned one.
    const firstUnpinnedIdx = drafts.findIndex((d) => !d.pinned);
    if (firstUnpinnedIdx !== -1) {
      expect(drafts.slice(firstUnpinnedIdx).every((d) => !d.pinned)).toBe(true);
    }
  });

  it("PATCH requires authentication", async () => {
    const app = makeApp();
    const res = await request(app)
      .patch(`/api/ai-writer/drafts/${pinnedId}`)
      .send({ pinned: false });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("unauthenticated");
  });

  it("PATCH returns 404 for another user's draft (no cross-user pin edits)", async () => {
    const app = makeApp();
    const res = await request(app)
      .patch(`/api/ai-writer/drafts/${otherUsersDraftId}`)
      .set("Authorization", `Bearer ${issueToken(OWNER_EMAIL)}`)
      .send({ pinned: true });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("not_found");

    // The other user's draft is untouched.
    const [row] = await db
      .select()
      .from(aiWriterDraftsTable)
      .where(eq(aiWriterDraftsTable.id, otherUsersDraftId))
      .limit(1);
    expect(row!.pinned).toBe(false);
  });

  it("PATCH rejects a non-boolean pinned value", async () => {
    const app = makeApp();
    const res = await request(app)
      .patch(`/api/ai-writer/drafts/${otherUsersDraftId}`)
      .set("Authorization", `Bearer ${issueToken(OTHER_EMAIL)}`)
      .send({ pinned: "yes" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });
});

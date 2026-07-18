import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { inArray, like, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  newsletterSubscribersTable,
} from "@workspace/db";

vi.mock("../../lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const adminNewsletterImport = await import("../adminNewsletter");
const adminNewsletterRouter = adminNewsletterImport.default;
const { issueToken } = await import("../../lib/auth");

const STAMP = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ADMIN_EMAIL = `admin-newsletter-${STAMP}@example.test`;
const USER_EMAIL = `user-newsletter-${STAMP}@example.test`;

const SEED_EMAILS = [
  `plain-${STAMP}@example.test`,
  // Formula-injection probe: starts with "=" and contains a comma & quotes.
  `=HYPERLINK("http://evil/${STAMP}","x"),attacker@example.test`,
  // Leading "+" should also be neutralized.
  `+1${STAMP}@example.test`,
  // Leading "-" (looks like a negative number / formula in Excel).
  `-cmd-${STAMP}@example.test`,
];

function makeApp(): Express {
  const app = express();
  app.use("/api", adminNewsletterRouter);
  return app;
}

beforeAll(async () => {
  await db.insert(usersTable).values([
    {
      id: `test-admin-${STAMP}`,
      email: ADMIN_EMAIL,
      passwordHash: "s1$00$00",
      role: "admin",
    },
    {
      id: `test-user-${STAMP}`,
      email: USER_EMAIL,
      passwordHash: "s1$00$00",
      role: "user",
    },
  ]);
});

afterAll(async () => {
  await db
    .delete(newsletterSubscribersTable)
    .where(inArray(newsletterSubscribersTable.email, SEED_EMAILS));
  await db
    .delete(usersTable)
    .where(inArray(usersTable.email, [ADMIN_EMAIL, USER_EMAIL]));
});

beforeEach(async () => {
  await db
    .delete(newsletterSubscribersTable)
    .where(inArray(newsletterSubscribersTable.email, SEED_EMAILS));
});

test("GET /admin/newsletter-subscribers requires a bearer token", async () => {
  const res = await request(makeApp()).get("/api/admin/newsletter-subscribers");
  expect(res.status).toBe(401);
});

test("GET /admin/newsletter-subscribers rejects non-admin users", async () => {
  const token = issueToken(USER_EMAIL);
  const res = await request(makeApp())
    .get("/api/admin/newsletter-subscribers")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(403);
});

test("GET /admin/newsletter-subscribers returns active subscribers for admin", async () => {
  await db.insert(newsletterSubscribersTable).values([
    { email: SEED_EMAILS[0]!, source: "homepage" },
    { email: SEED_EMAILS[1]!, source: "homepage" },
  ]);

  const token = issueToken(ADMIN_EMAIL);
  const res = await request(makeApp())
    .get("/api/admin/newsletter-subscribers")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  const items = res.body.items as Array<{ email: string }>;
  const emails = items.map((i) => i.email);
  expect(emails).toContain(SEED_EMAILS[0]);
  expect(emails).toContain(SEED_EMAILS[1]);
});

test("GET /admin/newsletter-subscribers excludes unsubscribed rows", async () => {
  await db.insert(newsletterSubscribersTable).values([
    { email: SEED_EMAILS[0]!, source: "homepage" },
    {
      email: SEED_EMAILS[2]!,
      source: "homepage",
      unsubscribedAt: new Date(),
    },
  ]);

  const token = issueToken(ADMIN_EMAIL);
  const res = await request(makeApp())
    .get("/api/admin/newsletter-subscribers")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  const emails = (res.body.items as Array<{ email: string }>).map(
    (i) => i.email,
  );
  expect(emails).toContain(SEED_EMAILS[0]);
  expect(emails).not.toContain(SEED_EMAILS[2]);
});

test("GET /admin/newsletter-subscribers filters by search substring", async () => {
  await db.insert(newsletterSubscribersTable).values([
    { email: SEED_EMAILS[0]!, source: "homepage" }, // plain-...
    { email: SEED_EMAILS[2]!, source: "homepage" }, // +1...
  ]);

  const token = issueToken(ADMIN_EMAIL);
  const res = await request(makeApp())
    .get("/api/admin/newsletter-subscribers")
    .query({ search: "plain-" })
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  const emails = (res.body.items as Array<{ email: string }>).map(
    (i) => i.email,
  );
  expect(emails).toContain(SEED_EMAILS[0]);
  expect(emails).not.toContain(SEED_EMAILS[2]);
});

test("GET /admin/newsletter-subscribers honors limit and offset pagination", async () => {
  await db.insert(newsletterSubscribersTable).values(
    SEED_EMAILS.map((email, i) => ({
      email,
      source: "homepage",
      createdAt: new Date(Date.now() - i * 60_000),
    })),
  );

  const token = issueToken(ADMIN_EMAIL);

  const page1 = await request(makeApp())
    .get("/api/admin/newsletter-subscribers")
    .query({ search: STAMP, limit: 2, offset: 0 })
    .set("Authorization", `Bearer ${token}`);
  expect(page1.status).toBe(200);
  expect(page1.body.limit).toBe(2);
  expect(page1.body.offset).toBe(0);
  expect(page1.body.total).toBe(SEED_EMAILS.length);
  expect((page1.body.items as unknown[]).length).toBe(2);

  const page2 = await request(makeApp())
    .get("/api/admin/newsletter-subscribers")
    .query({ search: STAMP, limit: 2, offset: 2 })
    .set("Authorization", `Bearer ${token}`);
  expect(page2.status).toBe(200);
  expect(page2.body.offset).toBe(2);
  expect((page2.body.items as unknown[]).length).toBe(2);

  const page1Emails = (page1.body.items as Array<{ email: string }>).map(
    (i) => i.email,
  );
  const page2Emails = (page2.body.items as Array<{ email: string }>).map(
    (i) => i.email,
  );
  // Pages must not overlap and together cover all seeded rows.
  for (const e of page2Emails) expect(page1Emails).not.toContain(e);
  expect(new Set([...page1Emails, ...page2Emails]).size).toBe(
    SEED_EMAILS.length,
  );
});

test("GET /admin/newsletter-subscribers clamps invalid pagination params to defaults", async () => {
  const token = issueToken(ADMIN_EMAIL);
  const res = await request(makeApp())
    .get("/api/admin/newsletter-subscribers")
    .query({ limit: "not-a-number", offset: -5 })
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.limit).toBe(50);
  expect(res.body.offset).toBe(0);

  const capped = await request(makeApp())
    .get("/api/admin/newsletter-subscribers")
    .query({ limit: 9999 })
    .set("Authorization", `Bearer ${token}`);
  expect(capped.status).toBe(200);
  expect(capped.body.limit).toBe(200);
});

test("GET /admin/newsletter-subscribers escapes LIKE wildcards in search", async () => {
  await db.insert(newsletterSubscribersTable).values([
    { email: SEED_EMAILS[0]!, source: "homepage" }, // plain-...
    { email: SEED_EMAILS[2]!, source: "homepage" }, // +1...
  ]);

  const token = issueToken(ADMIN_EMAIL);
  // "%" would match everything if not escaped; escaped it matches nothing.
  const res = await request(makeApp())
    .get("/api/admin/newsletter-subscribers")
    .query({ search: `%${STAMP}` })
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.total).toBe(0);
  expect((res.body.items as unknown[]).length).toBe(0);

  // "_" is a single-char wildcard; "plain_" must not match "plain-".
  const underscore = await request(makeApp())
    .get("/api/admin/newsletter-subscribers")
    .query({ search: `plain_${STAMP}` })
    .set("Authorization", `Bearer ${token}`);
  expect(underscore.status).toBe(200);
  expect(underscore.body.total).toBe(0);
});

test("GET /admin/newsletter-subscribers.csv requires auth and admin role", async () => {
  const noToken = await request(makeApp()).get(
    "/api/admin/newsletter-subscribers.csv",
  );
  expect(noToken.status).toBe(401);

  const userToken = issueToken(USER_EMAIL);
  const nonAdmin = await request(makeApp())
    .get("/api/admin/newsletter-subscribers.csv")
    .set("Authorization", `Bearer ${userToken}`);
  expect(nonAdmin.status).toBe(403);
});

test("GET /admin/newsletter-subscribers.csv excludes unsubscribed rows", async () => {
  await db.insert(newsletterSubscribersTable).values([
    { email: SEED_EMAILS[0]!, source: "homepage" },
    {
      email: SEED_EMAILS[2]!,
      source: "homepage",
      unsubscribedAt: new Date(),
    },
  ]);

  const token = issueToken(ADMIN_EMAIL);
  const res = await request(makeApp())
    .get("/api/admin/newsletter-subscribers.csv")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.text).toContain(SEED_EMAILS[0]!);
  expect(res.text).not.toContain(SEED_EMAILS[2]!);
});

test("GET /admin/newsletter-subscribers.csv neutralizes formula-injection payloads", async () => {
  // Insert all four probe rows, including emails that start with =, +, -.
  await db.insert(newsletterSubscribersTable).values(
    SEED_EMAILS.map((email) => ({ email, source: "homepage" })),
  );

  const token = issueToken(ADMIN_EMAIL);
  const res = await request(makeApp())
    .get("/api/admin/newsletter-subscribers.csv")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toMatch(/text\/csv/);
  expect(res.headers["content-disposition"]).toMatch(/attachment/);

  const body = res.text;
  expect(body.startsWith("email,source,signed_up_at\n")).toBe(true);

  const lines = body.split("\n").filter((l) => l.length > 0);
  const dataLines = lines.slice(1);

  // No data row may begin with a raw formula-leading character. The escape
  // function prepends `'` (then wraps in quotes if needed). With quoting,
  // the line begins with `"'` instead of `"=`. The key invariant: after
  // stripping a leading `"` (CSV quote), the next char must NOT be one of
  // `=+-@\t\r`.
  for (const line of dataLines) {
    const firstCellStart = line.startsWith('"') ? line[1] : line[0];
    expect(firstCellStart).toBeDefined();
    expect(/[=+\-@\t\r]/.test(firstCellStart!)).toBe(false);
  }

  // The =HYPERLINK probe must appear in the file (we still preserve the
  // value), just neutralized with a leading apostrophe inside the quoted
  // CSV cell.
  expect(body).toContain(`"'=HYPERLINK`);
  // The +1 probe row must be present and prefixed with `'`.
  expect(body).toContain(`'+1${STAMP}@example.test`);
  // The -cmd probe row must be present and prefixed with `'`.
  expect(body).toContain(`'-cmd-${STAMP}@example.test`);
});

test("GET /admin/newsletter-subscribers.csv caps the export at 50,000 rows", async () => {
  const bulkPrefix = `bulk-cap-${STAMP}`;
  const BULK_COUNT = 50_050;

  // Seed >50k active rows in a single generate_series insert (a multi-row
  // VALUES insert would blow past the Postgres parameter limit).
  await db.execute(sql`
    INSERT INTO newsletter_subscribers (email, source, created_at)
    SELECT ${bulkPrefix} || '-' || g || '@example.test',
           'homepage',
           now() - (g || ' seconds')::interval
    FROM generate_series(1, ${BULK_COUNT}) AS g
  `);

  try {
    const token = issueToken(ADMIN_EMAIL);
    const res = await request(makeApp())
      .get("/api/admin/newsletter-subscribers.csv")
      .query({ search: bulkPrefix })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);

    const lines = res.text.split("\n").filter((l) => l.length > 0);
    expect(lines[0]).toBe("email,source,signed_up_at");
    // Exactly 50,000 data rows despite 50,050 matching subscribers.
    expect(lines.length - 1).toBe(50_000);

    // Newest-first ordering: the cap must drop the oldest rows, so the
    // 50 oldest seeded rows (highest g values) are the ones excluded.
    expect(lines[1]).toContain(`${bulkPrefix}-1@example.test`);
    expect(res.text).not.toContain(`${bulkPrefix}-${BULK_COUNT}@example.test`);
  } finally {
    await db
      .delete(newsletterSubscribersTable)
      .where(like(newsletterSubscribersTable.email, `${bulkPrefix}-%`));
  }
}, 120_000);

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { eq, ilike } from "drizzle-orm";
import { db, contactMessagesTable, usersTable } from "@workspace/db";
import type { ContactMailResult } from "../../lib/contactMailer";

vi.mock("../../lib/logger", () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}));

const sendContactEmailsMock = vi.fn<() => Promise<ContactMailResult>>();
vi.mock("../../lib/contactMailer", () => ({
  sendContactEmails: (...args: unknown[]) =>
    sendContactEmailsMock(...(args as [])),
}));

const notifyContactFailureMock = vi.fn<() => Promise<void>>(async () => {});
vi.mock("../../lib/contactFailureNotifier", () => ({
  notifyContactFailure: (...args: unknown[]) =>
    notifyContactFailureMock(...(args as [])),
}));

const adminContactRouterImport = await import("../adminContact");
const adminContactRouter = adminContactRouterImport.default;
const { issueToken } = await import("../../lib/auth");

const ADMIN_EMAIL = `admin-resend-${Date.now()}@example.test`;

// Unique-per-run marker so fixtures never collide with other rows in the
// shared database, mirroring the pattern in adminContact.needsFollowUp.test.ts.
const MARKER = `resend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function makeApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", adminContactRouter);
  return app;
}

async function seedMessage(mailStatus: string): Promise<string> {
  const rows = await db
    .insert(contactMessagesTable)
    .values({
      name: `Resend ${mailStatus}`,
      email: `${mailStatus}-resend@example.test`,
      subject: `${MARKER} ${mailStatus}`,
      message: "fixture row for admin resend endpoint regression test",
      lang: "en",
      mailStatus,
    })
    .returning({ id: contactMessagesTable.id });
  const id = rows[0]?.id;
  if (!id) throw new Error("failed to seed contact message fixture");
  return id;
}

async function getMailStatus(id: string): Promise<string | null> {
  const rows = await db
    .select({ mailStatus: contactMessagesTable.mailStatus })
    .from(contactMessagesTable)
    .where(eq(contactMessagesTable.id, id))
    .limit(1);
  return rows[0]?.mailStatus ?? null;
}

beforeAll(async () => {
  await db.insert(usersTable).values({
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    email: ADMIN_EMAIL,
    passwordHash: "s1$00$00",
    role: "admin",
  });
});

afterAll(async () => {
  await db
    .delete(contactMessagesTable)
    .where(ilike(contactMessagesTable.subject, `${MARKER}%`));
  await db.delete(usersTable).where(eq(usersTable.email, ADMIN_EMAIL));
});

beforeEach(() => {
  sendContactEmailsMock.mockReset();
  notifyContactFailureMock.mockReset();
  notifyContactFailureMock.mockResolvedValue(undefined);
});

function authedPost(app: Express, id: string, body?: Record<string, unknown>) {
  const token = issueToken(ADMIN_EMAIL);
  return request(app)
    .post(`/api/admin/contact-messages/${id}/resend`)
    .set("Authorization", `Bearer ${token}`)
    .set("Content-Type", "application/json")
    .send(body ?? {});
}

describe("POST /api/admin/contact-messages/:id/resend", () => {
  it("rejects unauthenticated requests with 401 and does not send mail", async () => {
    const app = makeApp();
    const res = await request(app)
      .post("/api/admin/contact-messages/some-id/resend")
      .send({});

    expect(res.status).toBe(401);
    expect(sendContactEmailsMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid token with 401", async () => {
    const app = makeApp();
    const res = await request(app)
      .post("/api/admin/contact-messages/some-id/resend")
      .set("Authorization", "Bearer not-a-real-token")
      .send({});

    expect(res.status).toBe(401);
    expect(sendContactEmailsMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown id", async () => {
    const app = makeApp();
    const res = await authedPost(app, "00000000-0000-0000-0000-000000000000");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: "not_found" });
    expect(sendContactEmailsMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an overlong id", async () => {
    const app = makeApp();
    const res = await authedPost(app, "x".repeat(65));

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: "invalid_id" });
    expect(sendContactEmailsMock).not.toHaveBeenCalled();
  });

  it("returns 409 for a sent row without force and does not resend", async () => {
    const app = makeApp();
    const id = await seedMessage("sent");
    const res = await authedPost(app, id);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, error: "already_sent" });
    expect(sendContactEmailsMock).not.toHaveBeenCalled();
    expect(notifyContactFailureMock).not.toHaveBeenCalled();
    expect(await getMailStatus(id)).toBe("sent");
  });

  it("resends a sent row when force=true is passed", async () => {
    const app = makeApp();
    const id = await seedMessage("sent");
    sendContactEmailsMock.mockResolvedValue({
      userMailOk: true,
      teamMailOk: true,
      mailStatus: "sent",
    });

    const res = await authedPost(app, id, { force: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      id,
      previousMailStatus: "sent",
      mailStatus: "sent",
    });
    expect(sendContactEmailsMock).toHaveBeenCalledTimes(1);
    expect(notifyContactFailureMock).not.toHaveBeenCalled();
  });

  it("failed -> sent: updates mail_status and skips the failure notifier", async () => {
    const app = makeApp();
    const id = await seedMessage("failed");
    sendContactEmailsMock.mockResolvedValue({
      userMailOk: true,
      teamMailOk: true,
      mailStatus: "sent",
    });

    const res = await authedPost(app, id);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      id,
      previousMailStatus: "failed",
      mailStatus: "sent",
      userMailOk: true,
      teamMailOk: true,
    });
    expect(await getMailStatus(id)).toBe("sent");
    expect(notifyContactFailureMock).not.toHaveBeenCalled();
  });

  it("failed -> partial: updates mail_status and invokes the failure notifier", async () => {
    const app = makeApp();
    const id = await seedMessage("failed");
    sendContactEmailsMock.mockResolvedValue({
      userMailOk: true,
      teamMailOk: false,
      mailStatus: "partial",
    });

    const res = await authedPost(app, id);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      id,
      previousMailStatus: "failed",
      mailStatus: "partial",
      userMailOk: true,
      teamMailOk: false,
    });
    expect(await getMailStatus(id)).toBe("partial");
    expect(notifyContactFailureMock).toHaveBeenCalledTimes(1);
    expect(notifyContactFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: id,
        mailStatus: "partial",
        userMailOk: true,
        teamMailOk: false,
      }),
    );
  });

  it("failed -> failed: responds 502, keeps mail_status failed, invokes the notifier", async () => {
    const app = makeApp();
    const id = await seedMessage("failed");
    sendContactEmailsMock.mockResolvedValue({
      userMailOk: false,
      teamMailOk: false,
      mailStatus: "failed",
    });

    const res = await authedPost(app, id);

    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({
      success: false,
      id,
      previousMailStatus: "failed",
      mailStatus: "failed",
      userMailOk: false,
      teamMailOk: false,
    });
    expect(await getMailStatus(id)).toBe("failed");
    expect(notifyContactFailureMock).toHaveBeenCalledTimes(1);
    expect(notifyContactFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: id,
        mailStatus: "failed",
      }),
    );
  });

  it("pending rows can be resent without force", async () => {
    const app = makeApp();
    const id = await seedMessage("pending");
    sendContactEmailsMock.mockResolvedValue({
      userMailOk: true,
      teamMailOk: true,
      mailStatus: "sent",
    });

    const res = await authedPost(app, id);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      previousMailStatus: "pending",
      mailStatus: "sent",
    });
    expect(await getMailStatus(id)).toBe("sent");
  });

  it("passes the stored row's fields and normalized lang to the mailer", async () => {
    const app = makeApp();
    const id = await seedMessage("failed");
    sendContactEmailsMock.mockResolvedValue({
      userMailOk: true,
      teamMailOk: true,
      mailStatus: "sent",
    });

    await authedPost(app, id);

    expect(sendContactEmailsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Resend failed",
        email: "failed-resend@example.test",
        subject: `${MARKER} failed`,
        message: "fixture row for admin resend endpoint regression test",
        lang: "en",
      }),
    );
  });
});

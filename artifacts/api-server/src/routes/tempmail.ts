import { Router, type Request, type Response as ExpressResponse } from "express";

const router = Router();
const MAILTM = "https://api.mail.tm";

/* ── Rate limiter (30 req / min per IP) ─────────────────────────────────── */
const rl = new Map<string, { n: number; reset: number }>();

function checkRate(req: Request, res: ExpressResponse): boolean {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rl.get(ip);
  if (!entry || now > entry.reset) {
    rl.set(ip, { n: 1, reset: now + 60_000 });
    return false;
  }
  if (entry.n >= 120) {
    res.status(429).json({ error: "Too many requests — wait a minute." });
    return true;
  }
  entry.n++;
  return false;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function authHeader(req: Request) {
  return req.headers["authorization"] as string | undefined;
}

async function proxy(
  upstream: () => Promise<globalThis.Response>,
  res: ExpressResponse
): Promise<void> {
  try {
    const r = await upstream();
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("json")) {
      const data = await r.json();
      res.status(r.status).json(data);
      return;
    }
    res.status(r.status).end();
  } catch (err) {
    res.status(502).json({ error: "Upstream request failed" });
  }
}

/* ── Routes ─────────────────────────────────────────────────────────────── */

// GET  /api/tempmail/domains
router.get("/tempmail/domains", async (req, res) => {
  if (checkRate(req, res)) return;
  await proxy(() => fetch(`${MAILTM}/domains`, {
    headers: { Accept: "application/ld+json" },
    cache: "no-store",
  }), res);
});

// POST /api/tempmail/accounts
router.post("/tempmail/accounts", async (req, res) => {
  if (checkRate(req, res)) return;
  await proxy(() => fetch(`${MAILTM}/accounts`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  }), res);
});

// POST /api/tempmail/token
router.post("/tempmail/token", async (req, res) => {
  if (checkRate(req, res)) return;
  await proxy(() => fetch(`${MAILTM}/token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  }), res);
});

// GET  /api/tempmail/messages
router.get("/tempmail/messages", async (req, res) => {
  if (checkRate(req, res)) return;
  const auth = authHeader(req);
  if (!auth) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }
  const page = (req.query.page as string) || "1";
  await proxy(() => fetch(`${MAILTM}/messages?page=${page}`, {
    headers: { Accept: "application/ld+json", Authorization: auth },
    cache: "no-store",
  }), res);
});

// GET  /api/tempmail/message/:id
router.get("/tempmail/message/:id", async (req, res) => {
  if (checkRate(req, res)) return;
  const auth = authHeader(req);
  if (!auth) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }
  await proxy(() => fetch(`${MAILTM}/messages/${req.params.id}`, {
    headers: { Accept: "application/ld+json", Authorization: auth },
    cache: "no-store",
  }), res);
});

// DELETE /api/tempmail/message/:id
router.delete("/tempmail/message/:id", async (req, res) => {
  if (checkRate(req, res)) return;
  const auth = authHeader(req);
  if (!auth) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }
  try {
    const r = await fetch(`${MAILTM}/messages/${req.params.id}`, {
      method: "DELETE",
      headers: { Authorization: auth },
    });
    res.status(r.status).end();
  } catch {
    res.status(502).json({ error: "Delete failed" });
  }
});

// PATCH /api/tempmail/message/:id/read  (mark as seen on mail.tm)
router.patch("/tempmail/message/:id/read", async (req, res) => {
  if (checkRate(req, res)) return;
  const auth = authHeader(req);
  if (!auth) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }
  await proxy(() => fetch(`${MAILTM}/messages/${req.params.id}`, {
    method: "PATCH",
    headers: { Accept: "application/json", "Content-Type": "application/merge-patch+json", Authorization: auth },
    body: JSON.stringify({ seen: true }),
  }), res);
});

export default router;

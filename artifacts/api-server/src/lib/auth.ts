import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "./logger";
import { getUserByEmail } from "./userStore";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

function getSigningSecret(): string {
  const fromEnv = process.env["AUTH_SIGNING_SECRET"];
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  const fallback = process.env["DATABASE_URL"];
  if (!fallback) {
    throw new Error("AUTH_SIGNING_SECRET (or DATABASE_URL fallback) is required");
  }
  return `derived::${fallback}`;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `s1$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith("s1$")) return false;
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const salt = Buffer.from(parts[1]!, "hex");
  const expected = Buffer.from(parts[2]!, "hex");
  const actual = scryptSync(password, salt, expected.length, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

interface TokenPayload {
  email: string;
  exp: number;
}

export function issueToken(email: string): string {
  const payload: TokenPayload = {
    email: email.toLowerCase().trim(),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(createHmac("sha256", getSigningSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expectedSig = b64url(createHmac("sha256", getSigningSecret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as TokenPayload;
    if (typeof payload.email !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      userEmail?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["authorization"];
  const token = typeof header === "string" && header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    res.status(401).json({ error: "unauthenticated", message: "Sign in to continue." });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "invalid_token", message: "Your session has expired. Please sign in again." });
    return;
  }
  req.userEmail = payload.email;
  next();
}

/**
 * Higher-order middleware: requires a valid bearer token AND that the
 * authenticated user has the given role (currently "admin"). Returns
 * { success: false, error, message } JSON for both 401 and 403 to match
 * the global error envelope used elsewhere in the API.
 *
 * Usage: router.get("/admin/things", requireRole("admin"), handler)
 */
export function requireRole(requiredRole: "admin"): RequestHandler {
  return async (req, res, next) => {
    const header = req.headers["authorization"];
    const token =
      typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice("Bearer ".length).trim()
        : "";
    if (!token) {
      res.status(401).json({
        success: false,
        error: "Unauthenticated",
        message: "Sign in to continue.",
      });
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({
        success: false,
        error: "Unauthenticated",
        message: "Your session has expired. Please sign in again.",
      });
      return;
    }
    try {
      const user = await getUserByEmail(payload.email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: "Unauthenticated",
          message: "Your session has expired. Please sign in again.",
        });
        return;
      }
      if (user.role !== requiredRole) {
        res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "You do not have permission to access this resource.",
        });
        return;
      }
      req.userEmail = payload.email;
      next();
    } catch (err) {
      logger.error({ err }, "requireRole lookup failed");
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Something went wrong on our end. Please try again.",
      });
    }
  };
}

export function logAuthInit(): void {
  try {
    getSigningSecret();
    logger.info("Auth signing secret loaded");
  } catch (err) {
    logger.error({ err }, "Auth signing secret unavailable");
  }
}

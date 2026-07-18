import express, {
  type Express,
  type Request,
  type Response,
  type ErrorRequestHandler,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
// STRIPE DISABLED — re-enable along with the mount below when payments are ready.
// import stripeWebhookRouter from "./routes/stripeWebhook";
import { logger } from "./lib/logger";

const app: Express = express();

// Suppress the "X-Powered-By: Express" fingerprint header.
app.disable("x-powered-by");

// We sit behind exactly one proxy in dev (Replit's edge proxy) and in
// production. Telling Express to trust ONE hop means `req.ip` will reflect
// the immediate proxy's view of the client, instead of letting an attacker
// inject an arbitrary X-Forwarded-For chain. This is critical for the auth
// rate limiter, which keys partly by IP — without it, a bad actor could
// rotate `X-Forwarded-For: <random>` on each request and bypass the limit.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Restrict CORS to our own origins. The frontend proxies all /api/* calls
// through the shared reverse-proxy (same-origin from the browser's view), so
// CORS is only exercised on direct cross-origin requests (scripts, tools, etc.).
// Requests with no Origin header (server-to-server, curl) are also allowed.
const ALLOWED_ORIGINS = new Set([
  "https://xuvilo.com",
  "https://www.xuvilo.com",
]);
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        ALLOWED_ORIGINS.has(origin) ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
        origin.endsWith(".replit.dev") ||
        origin.endsWith(".repl.co")
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS: origin not allowed"));
      }
    },
    credentials: true,
  }),
);

// Baseline security headers on all API responses.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// STRIPE DISABLED — webhook router unmounted. Stub returns 503 so Stripe-side
// retries fail fast and the URL still answers cleanly. Restore the original
// mount (BEFORE express.json(), since the webhook needs the raw body) when
// payments are re-enabled.
// app.use("/api", stripeWebhookRouter);
app.post("/api/stripe/webhook", (_req, res) => {
  res.status(503).json({ message: "Payment system coming soon" });
});

// Default body-parser limit (100kb) is too small for endpoints that accept
// embedded image data URLs (e.g. company-profile logos up to ~1.4MB once
// base64-encoded). 2MB is comfortably above our route-level cap and
// still small enough to discourage abuse.
// 12mb covers RFQ source PDFs and quote PDFs uploaded as base64 (≤10MB raw,
// +33% base64 overhead). Per-route validators still cap actual payload sizes.
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// JSON 404 for any /api/* path that no router matched
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Not found",
    message: "API endpoint not found.",
  });
});

// Global JSON error middleware. Ensures the API never returns HTML for
// malformed bodies, oversize payloads, or unhandled exceptions.
const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const e = err as Error & {
    type?: string;
    status?: number;
    statusCode?: number;
    expose?: boolean;
  };
  const status =
    typeof e.status === "number"
      ? e.status
      : typeof e.statusCode === "number"
        ? e.statusCode
        : 500;

  // body-parser: malformed JSON
  if (
    e.type === "entity.parse.failed" ||
    (e instanceof SyntaxError && status === 400 && "body" in e)
  ) {
    return res.status(400).json({
      success: false,
      error: "Invalid request",
      message: "The request body is not valid JSON.",
    });
  }

  // body-parser: payload too large
  if (e.type === "entity.too.large" || status === 413) {
    return res.status(413).json({
      success: false,
      error: "Payload too large",
      message: "The request body is too large.",
    });
  }

  // Other 4xx — client error: only forward the message if the framework
  // marked it safe to expose, otherwise use a generic line.
  if (status >= 400 && status < 500) {
    return res.status(status).json({
      success: false,
      error: "Invalid request",
      message:
        e.expose && typeof e.message === "string" && e.message.length > 0
          ? e.message
          : "The request body is invalid or too large.",
    });
  }

  // 5xx — log full error server-side, return a generic message.
  logger.error({ err }, "Unhandled API error");
  return res.status(500).json({
    success: false,
    error: "Internal server error",
    message: "Something went wrong on our end. Please try again.",
  });
};

app.use(jsonErrorHandler);

export default app;

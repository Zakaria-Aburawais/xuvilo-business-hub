/**
 * OpenAI provider for the AI Writer.
 *
 * Uses the Responses API with Structured Outputs (JSON schema) so the model
 * is forced to return a valid `{ subject, body }` object. Falls back to the
 * Chat Completions JSON-object response format if the Responses API call
 * itself fails for any reason.
 *
 * Throws `OpenAIUnavailableError` when `OPENAI_API_KEY` is missing so the
 * route can return a friendly 503 instead of a generic 500.
 */

import OpenAI from "openai";

export class OpenAIUnavailableError extends Error {
  constructor(message = "OPENAI_API_KEY is not configured") {
    super(message);
    this.name = "OpenAIUnavailableError";
  }
}

export class OpenAIError extends Error {
  /** HTTP status from the OpenAI API, when available. */
  public readonly status?: number;
  /** Provider error code (e.g. "insufficient_quota", "rate_limit_exceeded"). */
  public readonly code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "OpenAIError";
    this.status = status;
    this.code = code;
  }
}

/** Returned when the account is out of credits / over quota. */
export class OpenAIQuotaError extends OpenAIError {
  constructor(message: string, status: number, code?: string) {
    super(message, status, code);
    this.name = "OpenAIQuotaError";
  }
}

/** Returned when the API key is missing/invalid/disabled at the provider. */
export class OpenAIAuthError extends OpenAIError {
  constructor(message: string, status: number, code?: string) {
    super(message, status, code);
    this.name = "OpenAIAuthError";
  }
}

interface OpenAILikeError {
  status?: number;
  code?: string;
  message?: string;
  error?: { code?: string; type?: string; message?: string };
}

function classifyOpenAIError(e: unknown): OpenAIError {
  const err = e as OpenAILikeError;
  const status = typeof err?.status === "number" ? err.status : undefined;
  const code = err?.code || err?.error?.code || err?.error?.type;
  const msg =
    err?.error?.message ||
    err?.message ||
    (e instanceof Error ? e.message : String(e));
  if (status === 401 || status === 403 || code === "invalid_api_key") {
    return new OpenAIAuthError(msg, status ?? 401, code);
  }
  if (
    status === 429 &&
    (code === "insufficient_quota" || /quota/i.test(msg))
  ) {
    return new OpenAIQuotaError(msg, status, code);
  }
  return new OpenAIError(msg, status, code);
}

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIUnavailableError();
  }
  cachedClient = new OpenAI({
    apiKey,
    // The SDK retries 429/5xx/408/409 by default (2 retries with backoff),
    // which adds 10-30 seconds of latency before quota/auth errors surface.
    // For this synchronous user-facing flow we prefer fast failure — the user
    // can always click "Generate" again for true transient blips.
    maxRetries: 0,
    // Hard ceiling per request so the user never waits forever if OpenAI
    // is slow. The route's own try/catch turns this into a clean 502.
    timeout: 30_000,
  });
  return cachedClient;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export interface GenerateEmailOptions {
  /** The full developer/user prompt (already templated upstream). */
  prompt: string;
  /** Optional system message. If omitted, a sensible default is used. */
  systemPrompt?: string;
  /** 0..2, higher = more creative. */
  temperature?: number;
  /** Soft cap on output tokens. */
  maxOutputTokens?: number;
}

export interface GenerateEmailResult {
  subject: string;
  body: string;
}

const DEFAULT_SYSTEM_PROMPT =
  "You are Xuvilo's professional bilingual (English / Modern Standard Arabic) " +
  "business correspondence assistant. You always reply with a single valid " +
  "JSON object containing exactly two string fields: \"subject\" and \"body\". " +
  "You never invent invoice numbers, amounts, dates, names, or company details " +
  "that the user did not supply. You preserve every reference, number, and date " +
  "exactly as written. You write natural, professional business prose — never " +
  "robotic, never overly dramatic, no AI disclaimers, no markdown.";

const EMAIL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject: {
      type: "string",
      description:
        "A single-line subject for the message. No newlines, no markdown, no quotes.",
    },
    body: {
      type: "string",
      description:
        "The full message body, including greeting and sign-off. Use \\n for line breaks. No markdown.",
    },
  },
  required: ["subject", "body"],
} as const;

/**
 * Try the Responses API with Structured Outputs first. If that throws (e.g.
 * the model does not support structured outputs, or the SDK shape changes),
 * fall back to Chat Completions with JSON-object response format. Both paths
 * return the same shape.
 */
export async function generateEmail(
  opts: GenerateEmailOptions,
): Promise<GenerateEmailResult> {
  const client = getClient();
  const model = getOpenAIModel();
  const systemPrompt = opts.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const temperature = opts.temperature ?? 0.5;
  const maxOutputTokens = opts.maxOutputTokens ?? 1400;

  let raw = "";
  try {
    // Preferred: Responses API + Structured Outputs (json_schema).
    const resp = await client.responses.create({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: opts.prompt },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "xuvilo_email",
          schema: EMAIL_JSON_SCHEMA,
          strict: true,
        },
      },
      temperature,
      max_output_tokens: maxOutputTokens,
    });
    raw = (resp.output_text || "").trim();
  } catch (responsesErr) {
    const firstClass = classifyOpenAIError(responsesErr);
    // Don't bother with the fallback for hard auth/quota errors — the chat
    // endpoint will fail in exactly the same way and just delay the response.
    if (
      firstClass instanceof OpenAIAuthError ||
      firstClass instanceof OpenAIQuotaError
    ) {
      throw firstClass;
    }
    // Fallback: Chat Completions with JSON-object response_format.
    // The prompt itself already requires strict JSON output.
    try {
      const chat = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: opts.prompt },
        ],
        response_format: { type: "json_object" },
        temperature,
        max_tokens: maxOutputTokens,
      });
      raw = (chat.choices?.[0]?.message?.content || "").trim();
    } catch (chatErr) {
      throw classifyOpenAIError(chatErr);
    }
  }

  if (!raw) {
    throw new OpenAIError("OpenAI returned an empty response");
  }

  const parsed = parseEmailJson(raw);
  if (!parsed.subject && !parsed.body) {
    throw new OpenAIError("OpenAI did not return a usable subject or body");
  }
  return parsed;
}

/**
 * Parse the model's JSON output, tolerating common malformations
 * (code fences, surrounding prose, trailing commas).
 */
function parseEmailJson(raw: string): GenerateEmailResult {
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Direct JSON
  try {
    const obj = JSON.parse(cleaned);
    if (obj && typeof obj === "object") {
      const subject = typeof obj.subject === "string" ? obj.subject.trim() : "";
      const body = typeof obj.body === "string" ? obj.body.trim() : "";
      if (subject || body) return { subject, body };
    }
  } catch {
    // fall through
  }

  // Try to extract the first JSON object substring.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const candidate = cleaned.slice(start, end + 1);
    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj === "object") {
        const subject =
          typeof obj.subject === "string" ? obj.subject.trim() : "";
        const body = typeof obj.body === "string" ? obj.body.trim() : "";
        if (subject || body) return { subject, body };
      }
    } catch {
      // fall through
    }
  }

  // Plain-text fallback: "Subject: foo\n\nbody..."
  const m = cleaned.match(/^\s*subject\s*[:：]\s*(.+)$/im);
  if (m) {
    const subject = m[1].trim();
    const body = cleaned
      .replace(m[0], "")
      .replace(/^\s*\n+/, "")
      .trim();
    return { subject, body };
  }

  return { subject: "", body: cleaned };
}

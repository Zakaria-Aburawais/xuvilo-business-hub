/**
 * AI provider dispatcher.
 *
 * The active provider is selected at runtime via the `AI_PROVIDER` env var:
 *   - "openai" (default) — uses OpenAI via `./openai-writer`.
 *   - "gemini"           — uses Google Gemini via the Replit AI Integrations proxy.
 *
 * Callers always import the same `generateJson` / error classes from this
 * module so the rest of the codebase does not need to know which provider
 * is in use. Provider-specific errors are normalized to
 * `AIProviderUnavailableError` / `AIProviderError`.
 */

import {
  generateEmail as generateEmailOpenAi,
  isOpenAIConfigured,
  getOpenAIModel,
  OpenAIUnavailableError,
  OpenAIQuotaError,
  OpenAIAuthError,
  OpenAIError,
} from "./openai-writer";

export class AIProviderUnavailableError extends Error {
  /**
   * Identifier of the provider that was unavailable, so the route can build
   * a provider-specific user message (e.g. "Please configure OPENAI_API_KEY").
   */
  public readonly provider: "openai" | "gemini";
  /** Set to true when the cause is the account being out of credits/quota. */
  public quotaExceeded?: boolean;
  constructor(provider: "openai" | "gemini", message?: string) {
    super(message ?? `${provider} provider not configured`);
    this.name = "AIProviderUnavailableError";
    this.provider = provider;
  }
}

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderError";
  }
}

export type ProviderId = "openai" | "gemini";

export function getActiveProvider(): ProviderId {
  const v = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  return v === "gemini" ? "gemini" : "openai";
}

export function isAIConfigured(): boolean {
  return getActiveProvider() === "gemini"
    ? isGeminiConfigured()
    : isOpenAIConfigured();
}

export function getActiveModel(): string {
  return getActiveProvider() === "gemini" ? GEMINI_DEFAULT_MODEL : getOpenAIModel();
}

interface GenerateJsonOptions {
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

/**
 * Generate a JSON-serialised email using the active provider. The returned
 * string is always valid JSON of the form `{"subject": "...", "body": "..."}`
 * — both providers normalize their output before returning here.
 */
export async function generateJson(opts: GenerateJsonOptions): Promise<string> {
  const provider = getActiveProvider();
  if (provider === "gemini") {
    return generateJsonGemini(opts);
  }
  // OpenAI (default)
  try {
    const result = await generateEmailOpenAi({
      prompt: opts.prompt,
      systemPrompt: opts.systemPrompt,
      temperature: opts.temperature,
      maxOutputTokens: opts.maxOutputTokens,
    });
    return JSON.stringify({ subject: result.subject, body: result.body });
  } catch (e) {
    if (e instanceof OpenAIUnavailableError) {
      throw new AIProviderUnavailableError("openai", e.message);
    }
    if (e instanceof OpenAIAuthError) {
      // Treat invalid/disabled keys the same as "not configured" so the user
      // sees the same friendly 503 message.
      throw new AIProviderUnavailableError("openai", e.message);
    }
    if (e instanceof OpenAIQuotaError) {
      // Surface quota issues as "unavailable" with a quota-specific note;
      // the route maps this to a friendly 503 with billing instructions.
      const err = new AIProviderUnavailableError(
        "openai",
        `quota_exceeded: ${e.message}`,
      );
      (err as AIProviderUnavailableError & { quotaExceeded?: boolean }).quotaExceeded = true;
      throw err;
    }
    if (e instanceof OpenAIError) {
      throw new AIProviderError(e.message);
    }
    throw e;
  }
}

/* ─── Gemini (kept for fallback / future use) ────────────────────────────── */

interface GenAiContents {
  role: string;
  parts: { text: string }[];
}

interface GenAiClient {
  models: {
    generateContent: (opts: {
      model: string;
      contents: GenAiContents[];
      config?: {
        maxOutputTokens?: number;
        temperature?: number;
        responseMimeType?: string;
      };
    }) => Promise<{ text?: string }>;
  };
}

let cachedGeminiClient: GenAiClient | null = null;

const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

function isGeminiConfigured(): boolean {
  return Boolean(
    process.env.AI_INTEGRATIONS_GEMINI_API_KEY &&
      process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  );
}

async function getGeminiClient(): Promise<GenAiClient> {
  if (cachedGeminiClient) return cachedGeminiClient;
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new AIProviderUnavailableError("gemini");
  }
  const mod = await import("@google/genai");
  const GoogleGenAI = (mod as unknown as {
    GoogleGenAI: new (opts: unknown) => GenAiClient;
  }).GoogleGenAI;
  cachedGeminiClient = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "", baseUrl },
  });
  return cachedGeminiClient;
}

async function generateJsonGemini(opts: GenerateJsonOptions): Promise<string> {
  const client = await getGeminiClient();
  const result = await client.models.generateContent({
    model: GEMINI_DEFAULT_MODEL,
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    config: {
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      temperature: opts.temperature ?? 0.6,
      responseMimeType: "application/json",
    },
  });
  const text = (result.text || "").toString().trim();
  if (!text) {
    throw new AIProviderError("AI returned an empty response");
  }
  return text;
}

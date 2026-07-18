/**
 * Unified LLM client for the RFQ module. Lets each user pick their
 * preferred AI provider (Anthropic, OpenAI, Google Gemini, OpenRouter)
 * and a specific model. The site owner is never charged — every provider
 * call uses the user's own API key, read from per-user settings.
 *
 * The function signature is provider-agnostic so callers (aiExtractor,
 * aiResearch) don't need to know which backend is in use.
 */
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger";
import { getSetting } from "../settingsService";

export type LlmProvider = "anthropic" | "openai" | "gemini" | "openrouter";

export const LLM_PROVIDERS: readonly LlmProvider[] = [
  "anthropic",
  "openai",
  "gemini",
  "openrouter",
] as const;

/** Default model per provider when the user hasn't picked one. */
export const DEFAULT_MODELS: Record<LlmProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  gemini: "gemini-1.5-pro-latest",
  openrouter: "openai/gpt-4o",
};

/**
 * Curated dropdown options shown in Settings. Power users can still type
 * a custom model ID via the "Custom…" path on the frontend.
 */
export const CURATED_MODELS: Record<LlmProvider, readonly string[]> = {
  anthropic: [
    "claude-sonnet-4-6",
    "claude-opus-4-7",
    "claude-haiku-4-5",
    "claude-3-5-sonnet-latest",
    "claude-3-5-haiku-latest",
  ],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini", "o1-preview"],
  gemini: [
    "gemini-1.5-pro-latest",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash-exp",
  ],
  openrouter: [
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3.5-haiku",
    "google/gemini-pro-1.5",
    "qwen/qwen-2.5-72b-instruct",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
    "mistralai/mistral-large",
  ],
} as const;

/** Settings-key per provider for the API key. */
const KEY_SETTING: Record<LlmProvider, string> = {
  anthropic: "rfq_anthropic_key",
  openai: "rfq_openai_key",
  gemini: "rfq_gemini_key",
  openrouter: "rfq_openrouter_key",
};

/** OpenAI-compatible base URL per provider (Anthropic uses its own SDK). */
const OPENAI_COMPAT_BASE: Record<Exclude<LlmProvider, "anthropic">, string> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  openrouter: "https://openrouter.ai/api/v1",
};

function isProvider(v: string): v is LlmProvider {
  return (LLM_PROVIDERS as readonly string[]).includes(v);
}

export interface LlmConfig {
  provider: LlmProvider;
  model: string;
  apiKey: string;
}

/**
 * Resolve the user's chosen provider, model, and API key. Falls back to
 * the legacy Anthropic-only setup when no provider has been picked, so
 * existing users keep working without touching their settings.
 */
export interface LlmConfigOverrides {
  /** If set, picks this provider instead of the user's saved choice. */
  provider?: string;
  /** If non-empty, used instead of the saved model. */
  model?: string;
  /** If non-empty, used instead of the saved API key for that provider. */
  apiKey?: string;
}

export async function getLlmConfig(userId: string, overrides?: LlmConfigOverrides): Promise<LlmConfig> {
  const rawSavedProvider = (await getSetting(userId, "rfq_provider")).trim().toLowerCase();
  const overrideProvider = (overrides?.provider ?? "").trim().toLowerCase();
  const provider: LlmProvider = isProvider(overrideProvider)
    ? overrideProvider
    : isProvider(rawSavedProvider)
      ? rawSavedProvider
      : "anthropic";
  const overrideKey = (overrides?.apiKey ?? "").trim();
  const apiKey = overrideKey || (await getSetting(userId, KEY_SETTING[provider])).trim();
  const overrideModel = (overrides?.model ?? "").trim();
  const savedModel = (await getSetting(userId, "rfq_model")).trim();
  const model = overrideModel || savedModel || DEFAULT_MODELS[provider];
  return { provider, model, apiKey };
}

export interface CallLlmInput {
  userId: string;
  system?: string;
  prompt: string;
  maxTokens?: number;
  overrides?: LlmConfigOverrides;
}

export interface CallLlmResult {
  ok: boolean;
  text: string;
  /** Filled when ok=false — short human-readable reason. */
  error?: string;
  /** Set to true when the user simply hasn't configured a key. */
  missingKey?: boolean;
  config: LlmConfig;
}

/**
 * Run a single completion against whichever provider the user picked.
 * Returns text on success, never throws — callers branch on `ok`.
 */
export async function callLlm(input: CallLlmInput): Promise<CallLlmResult> {
  const config = await getLlmConfig(input.userId, input.overrides);
  if (!config.apiKey) {
    return { ok: false, text: "", error: "missing_api_key", missingKey: true, config };
  }
  const maxTokens = input.maxTokens ?? 4096;
  try {
    if (config.provider === "anthropic") {
      const text = await callAnthropic(config, input.system, input.prompt, maxTokens);
      return { ok: true, text, config };
    }
    const text = await callOpenAiCompat(config, input.system, input.prompt, maxTokens);
    return { ok: true, text, config };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ err, provider: config.provider, model: config.model }, "rfq llmClient: call failed");
    return { ok: false, text: "", error: message.slice(0, 300), config };
  }
}

async function callAnthropic(
  config: LlmConfig,
  system: string | undefined,
  prompt: string,
  maxTokens: number,
): Promise<string> {
  const client = new Anthropic({ apiKey: config.apiKey });
  const resp = await client.messages.create({
    model: config.model,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: prompt }],
  });
  return resp.content.map((c) => ("text" in c ? c.text : "")).join("");
}

async function callOpenAiCompat(
  config: LlmConfig,
  system: string | undefined,
  prompt: string,
  maxTokens: number,
): Promise<string> {
  const provider = config.provider as Exclude<LlmProvider, "anthropic">;
  const baseURL = OPENAI_COMPAT_BASE[provider];
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };
  // OpenRouter recommends app identification headers for free-tier
  // routing; harmless when omitted, but more polite to include.
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://xuvilo.com";
    headers["X-Title"] = "Xuvilo Business Hub — RFQ Intelligence";
  }

  const body = {
    model: config.model,
    max_tokens: maxTokens,
    messages,
  };

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${errText.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Lightweight "does the key work" probe used by the Settings "Test"
 * button. Cheap (≤32 token reply) and provider-agnostic.
 */
export async function testLlmConnection(
  userId: string,
  overrides?: LlmConfigOverrides,
): Promise<{ ok: boolean; message: string; provider: LlmProvider; model: string }> {
  const config = await getLlmConfig(userId, overrides);
  if (!config.apiKey) {
    return {
      ok: false,
      message: `No ${config.provider} API key set. Paste one in Settings.`,
      provider: config.provider,
      model: config.model,
    };
  }
  const result = await callLlm({
    userId,
    prompt: "Reply with the single word: ok",
    maxTokens: 32,
    overrides,
  });
  if (!result.ok) {
    return {
      ok: false,
      message: result.error ?? "Unknown error",
      provider: config.provider,
      model: config.model,
    };
  }
  const reply = result.text.toLowerCase();
  return {
    ok: reply.includes("ok"),
    message: reply.includes("ok")
      ? `Connection successful (${config.provider} / ${config.model}).`
      : `Unexpected reply: ${reply.slice(0, 80)}`,
    provider: config.provider,
    model: config.model,
  };
}

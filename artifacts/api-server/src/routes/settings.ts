import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";
import { getAllSettings, setSettings } from "../lib/settingsService";

const router: IRouter = Router();

// Secret-bearing settings keys that must never be echoed to the browser. We
// replace them with a sentinel so the UI can show a "key on file" indicator
// without ever holding the real value in client memory.
const SECRET_KEYS = new Set([
  "rfq_anthropic_key",
  "rfq_openai_key",
  "rfq_gemini_key",
  "rfq_openrouter_key",
]);
const SECRET_SENTINEL = "__SET__";

function redactSecrets(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...map };
  for (const k of SECRET_KEYS) {
    if (out[k] && out[k].length > 0) out[k] = SECRET_SENTINEL;
  }
  return out;
}

router.get("/me/settings", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const map = await getAllSettings(user.id);
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ settings: redactSecrets(map) });
  } catch (err) {
    logger.error({ err }, "GET /me/settings failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.put("/me/settings", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates = (body["settings"] ?? {}) as Record<string, unknown>;
    if (typeof updates !== "object" || updates === null) {
      return res.status(400).json({ error: "settings_required" });
    }
    const stringified: Record<string, string> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (typeof k !== "string" || k.length === 0 || k.length > 128) continue;
      const value = typeof v === "string" ? v : String(v ?? "");
      // Reject the redaction sentinel so the UI can no-op a save and never
      // accidentally overwrite the real secret with the placeholder string.
      if (SECRET_KEYS.has(k) && value === SECRET_SENTINEL) continue;
      stringified[k] = value;
    }
    await setSettings(user.id, stringified);
    const map = await getAllSettings(user.id);
    return res.json({ settings: redactSecrets(map) });
  } catch (err) {
    logger.error({ err }, "PUT /me/settings failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;

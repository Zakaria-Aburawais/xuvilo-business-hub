/**
 * AI supplier research orchestration. Uses the user's stored Anthropic API
 * key from settings, queries the supplier KB for context, builds a tailored
 * per-item prompt, and runs a 5-level image waterfall on the result.
 *
 * Calls are spaced 500 ms apart to respect Anthropic rate limits.
 */
import { callLlm, testLlmConnection } from "./llmClient";
import { db, rfqSuppliersTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../logger";
import { getSetting } from "../settingsService";
import type { ClassifiedItem } from "./itemClassifier";

const MAX_TOKENS = 2048;
const RATE_LIMIT_MS = 500;

export interface SupplierLite {
  name: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  website: string;
  isLocal: boolean;
}

export interface MatchedDbSupplier {
  id: string;
  name: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  website: string;
  specialties: string[];
  isLocal: boolean;
  notes: string;
  relevanceScore: number;
  matchedKeywords: string[];
}

const STOPWORDS = new Set([
  "the","and","for","with","per","from","type","unit","each","set","lot","new",
  "original","oem","pcs","kit","model","brand","make","item","part","grade","spec",
  "rev","size","mtr","kgs","pack","box","drum","one","two","ref","nos","tag","spec.",
  "qty","quantity","required","supply","required.","pcs.","ea","each.","item:",
]);

/**
 * Extract a relevance-keyword set for a parsed item: manufacturer, the
 * part number (and its fragments), and meaningful description words
 * minus generic procurement noise. Lower-cased, deduplicated.
 */
export function extractMatchKeywords(item: ClassifiedItem): string[] {
  const set = new Set<string>();
  if (item.manufacturer) set.add(item.manufacturer.toLowerCase());
  if (item.detectedBrand && item.detectedBrand.toLowerCase() !== item.manufacturer.toLowerCase()) {
    set.add(item.detectedBrand.toLowerCase());
  }
  if (item.partNo) {
    set.add(item.partNo.toLowerCase());
    for (const frag of item.partNo.split(/[-_/.]/)) {
      if (frag.length >= 3) set.add(frag.toLowerCase());
    }
  }
  const words = item.description.toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 14);
  for (const w of words) set.add(w);
  return Array.from(set);
}

export interface ResearchResult {
  product_name: string | null;
  product_description: string | null;
  manufacturer: string | null;
  part_number_confirmed: string | null;
  part_number_notes: string | null;
  image_url: string | null;
  image_source: string | null;
  image_confidence: "exact" | "brand_match" | "distributor" | "representative" | null;
  image_search_query: string | null;
  product_page_url: string | null;
  datasheet_url: string | null;
  hs_code: string | null;
  estimated_price_usd: string | null;
  price_source: string | null;
  lead_time: string | null;
  technical_notes: string | null;
  available_locally: boolean | null;
  local_confidence: "high" | "medium" | "low" | null;
  local_suppliers: Array<{ name: string; location?: string; contact?: string; email?: string; phone?: string; website?: string; notes?: string }>;
  international_suppliers: Array<{ name: string; type?: string; country?: string; website?: string; email?: string; phone?: string; notes?: string }>;
  alternatives: Array<{ manufacturer?: string; part_number?: string; name?: string; notes?: string }>;
}

export interface ResearchedItem extends ClassifiedItem {
  research: ResearchResult;
  imageBadge: { url: string | null; confidence: string; badge: string; source: string | null; icon?: string };
  matchedDbSuppliers: MatchedDbSupplier[];
  matchKeywords: string[];
  error?: string;
}

const EMPTY_RESEARCH: ResearchResult = {
  product_name: null,
  product_description: null,
  manufacturer: null,
  part_number_confirmed: null,
  part_number_notes: null,
  image_url: null,
  image_source: null,
  image_confidence: null,
  image_search_query: null,
  product_page_url: null,
  datasheet_url: null,
  hs_code: null,
  estimated_price_usd: null,
  price_source: null,
  lead_time: null,
  technical_notes: null,
  available_locally: null,
  local_confidence: null,
  local_suppliers: [],
  international_suppliers: [],
  alternatives: [],
};

function isDirectImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
}

function imageWaterfall(
  item: ClassifiedItem,
  research: ResearchResult,
): ResearchedItem["imageBadge"] {
  const url = research.image_url;
  const source = research.image_source;
  if (item.manufacturer && item.partNo && url && isDirectImageUrl(url)) {
    return { url, confidence: "exact", badge: "🟢 Exact match", source };
  }
  if (item.manufacturer && url && isDirectImageUrl(url)) {
    return { url, confidence: "brand_match", badge: "🟡 Brand match", source };
  }
  if (url && isDirectImageUrl(url)) {
    return { url, confidence: "distributor", badge: "🟡 Distributor image", source };
  }
  if (url) {
    return { url, confidence: "representative", badge: "🟠 Representative", source: source ?? "web" };
  }
  return { url: null, confidence: "none", badge: "🔴 No image found", source: null, icon: item.categoryIcon };
}

/**
 * Match suppliers from the user's KB to a specific RFQ line item by
 * keyword overlap with the supplier's name, specialties (jsonb), and
 * notes. Each match gets a relevance_score:
 *   +2 per keyword found in specialties (the strongest signal)
 *   +1 per keyword found in name
 *   +0.5 per keyword found in notes
 *   +1 if isLocal (Libya bias — local suppliers preferred at equal score)
 * Returns the top `limit` matches ordered by score, then by isLocal.
 */
export async function matchSuppliersForItem(
  userId: string,
  item: ClassifiedItem,
  limit = 5,
): Promise<MatchedDbSupplier[]> {
  const keywords = extractMatchKeywords(item);
  if (keywords.length === 0) return [];

  const orParts = keywords.map(
    (k) => sql`(
      LOWER(${rfqSuppliersTable.name}) LIKE ${"%" + k + "%"}
      OR LOWER(${rfqSuppliersTable.specialties}::text) LIKE ${"%" + k + "%"}
      OR LOWER(${rfqSuppliersTable.notes}) LIKE ${"%" + k + "%"}
    )`,
  );
  const orExpr =
    orParts.length === 1 ? orParts[0]! : sql.join(orParts, sql` OR `);

  const rows = await db
    .select({
      id: rfqSuppliersTable.id,
      name: rfqSuppliersTable.name,
      country: rfqSuppliersTable.country,
      city: rfqSuppliersTable.city,
      email: rfqSuppliersTable.email,
      phone: rfqSuppliersTable.phone,
      website: rfqSuppliersTable.website,
      specialties: rfqSuppliersTable.specialties,
      isLocal: rfqSuppliersTable.isLocal,
      notes: rfqSuppliersTable.notes,
    })
    .from(rfqSuppliersTable)
    .where(and(
      eq(rfqSuppliersTable.userId, userId),
      eq(rfqSuppliersTable.active, true),
      orExpr,
    ))
    .limit(50);

  const scored: MatchedDbSupplier[] = rows.map((r) => {
    const specs = (Array.isArray(r.specialties) ? (r.specialties as string[]) : []) as string[];
    const specsLc = specs.map((s) => s.toLowerCase());
    const nameLc = r.name.toLowerCase();
    const notesLc = (r.notes || "").toLowerCase();
    const matched = new Set<string>();
    let score = r.isLocal ? 1 : 0;
    // Additive across fields: a keyword that appears in specialties AND
    // notes contributes to both buckets, since each is independent evidence.
    for (const kw of keywords) {
      let hit = false;
      if (specsLc.some((s) => s.includes(kw))) { score += 2;   hit = true; }
      if (nameLc.includes(kw))                 { score += 1;   hit = true; }
      if (notesLc.includes(kw))                { score += 0.5; hit = true; }
      if (hit) matched.add(kw);
    }
    return {
      id: r.id,
      name: r.name,
      country: r.country,
      city: r.city,
      email: r.email,
      phone: r.phone,
      website: r.website,
      specialties: specs,
      isLocal: r.isLocal,
      notes: r.notes,
      relevanceScore: Math.round(score * 10) / 10,
      matchedKeywords: Array.from(matched),
    };
  });

  scored.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return scored.slice(0, limit);
}

/** Compatibility wrapper that flattens MatchedDbSupplier to SupplierLite for the prompt. */
async function findCandidateSuppliers(userId: string, item: ClassifiedItem): Promise<SupplierLite[]> {
  const matched = await matchSuppliersForItem(userId, item, 8);
  return matched.map((m) => ({
    name: m.name,
    country: m.country,
    city: m.city,
    email: m.email,
    phone: m.phone,
    website: m.website,
    isLocal: m.isLocal,
  }));
}

const LIBYA_CONTEXT = `DESTINATION CONTEXT — READ CAREFULLY:
- End destination: Tripoli, Libya
- Oil & gas facilities in Libya commonly operate on 60 Hz electrical
  systems, NOT the national 50 Hz grid. If this item is electrical
  or mechanical equipment this is critical — verify and flag the
  frequency specification clearly in technical_notes
- Preferred international sourcing regions: UAE, Turkey, Italy,
  Malta, Tunisia, Egypt, Tunisia (shortest lead times and freight
  routes to Libya)
- All suppliers must be able to provide Certificate of Origin

LOCAL SUPPLIER REQUIREMENT — MANDATORY:
- You MUST suggest 2 to 4 local_suppliers based in Libya itself
  (Tripoli, Benghazi, Misrata) OR in nearby countries that ship
  reliably to Libya within 1–2 weeks (Tunisia, Egypt, Malta).
- For each local_supplier provide: name, location (city + country),
  email, phone, website (or a Google search URL if no website),
  notes (why they're a good fit for this item).
- If you genuinely don't know specific Libyan suppliers, suggest
  realistic regional distributors (e.g. UAE-based regional offices
  of major brands) with the EXACT contact details from their
  public website / authorized distributor pages.

INTERNATIONAL SUPPLIER REQUIREMENT — MANDATORY:
- Provide 2 to 4 international_suppliers — manufacturers, official
  distributors, or large industrial e-commerce platforms (Grainger,
  RS Components, Farnell, Mouser, DirectIndustry, Alibaba Gold).
- Each must include: name, type (Manufacturer / Distributor /
  Marketplace), country, website, email (sales/info), phone, notes.`;

const IMAGE_INSTRUCTIONS = `IMAGE SEARCH — THIS IS MANDATORY — attempt for every item:
1. If manufacturer AND part number are given:
   → Search "[manufacturer] [part_number]" on the manufacturer's
     official website first, then rs-components.com, farnell.com,
     grainger.com, mouser.com
   → image_url MUST show this exact part only — not a similar one
2. If only brand/model is given:
   → Search the manufacturer's official product catalogue
   → Find the official product image from the manufacturer's site
3. If description only:
   → Search directindustry.com, grainger.com, alibaba.com for
     a representative image of this product type
4. image_url must be a direct image file URL ending in
   .jpg .jpeg .png .webp or .gif — NOT a webpage URL.
5. Also return product_page_url — the page where the image was found.
6. Return datasheet_url if a PDF spec sheet is found.
7. Return image_source — the name of the website.
8. If no image is found after all attempts, return image_url=null
   AND ALWAYS provide image_search_query — a 3-to-6-word Google
   Images query the user can click to find a picture themselves
   (e.g. "Daikin 12000 BTU split air conditioner unit").`;

const JSON_SCHEMA = `Return ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "product_name": string|null,
  "product_description": string|null,
  "manufacturer": string|null,
  "part_number_confirmed": string|null,
  "part_number_notes": string|null,
  "image_url": string|null,
  "image_source": string|null,
  "image_confidence": "exact"|"brand_match"|"distributor"|"representative"|null,
  "image_search_query": string|null,
  "product_page_url": string|null,
  "datasheet_url": string|null,
  "hs_code": string|null,
  "estimated_price_usd": string|null,
  "price_source": string|null,
  "lead_time": string|null,
  "technical_notes": string|null,
  "available_locally": boolean|null,
  "local_confidence": "high"|"medium"|"low"|null,
  "local_suppliers": [{ "name": string, "location": string, "email": string, "phone": string, "website": string, "notes": string }],
  "international_suppliers": [{ "name": string, "type": string, "country": string, "website": string, "email": string, "phone": string, "notes": string }],
  "alternatives": [{ "manufacturer": string, "part_number": string, "name": string, "notes": string }]
}`;

function strategyPrompt(item: ClassifiedItem): string {
  switch (item.type) {
    case "branded_with_part":
      return `Search "${item.manufacturer} ${item.partNo}" on the manufacturer's official website first. Then check authorized distributors. Find the exact product image — not a similar product.`;
    case "branded_no_part":
      return `Search the ${item.manufacturer} official website for this product model. Find the official product image from the manufacturer's site.`;
    case "part_number_only":
      return `Search the part number "${item.partNo}" on partsnap.com, findchips.com, octopart.com, rs-components.com, farnell.com, mouser.com, and via Google with the part number in quotes. Identify the manufacturer from results.`;
    case "description_only":
    default:
      return `Search for this product category from reputable industrial suppliers. Find a representative image from directindustry.com, grainger.com, or alibaba.com.`;
  }
}

function buildPrompt(
  item: ClassifiedItem,
  candidates: SupplierLite[],
  libyaEnabled: boolean,
): string {
  const supplierList =
    candidates.length === 0
      ? "(no pre-known suppliers in the database for this item)"
      : candidates
          .map(
            (s, i) =>
              `${i + 1}. ${s.name} (${s.city}${s.country ? ", " + s.country : ""}) — ${s.email || "no email"} | ${s.phone || "no phone"} | ${s.website || "no website"}${s.isLocal ? " [LOCAL]" : ""}`,
          )
          .join("\n");

  return [
    `You are a procurement research assistant. Research this RFQ line item and return a JSON object only.`,
    ``,
    `ITEM:`,
    `- Description: ${item.description}`,
    item.manufacturer ? `- Manufacturer: ${item.manufacturer}` : "",
    item.partNo ? `- Part / stock number: ${item.partNo}` : "",
    item.unit ? `- Unit: ${item.unit}` : "",
    item.quantity ? `- Quantity: ${item.quantity}` : "",
    ``,
    `RESEARCH STRATEGY: ${strategyPrompt(item)}`,
    ``,
    `These suppliers are already in our database — include them in your results if appropriate:`,
    supplierList,
    ``,
    libyaEnabled ? LIBYA_CONTEXT : "",
    ``,
    IMAGE_INSTRUCTIONS,
    ``,
    JSON_SCHEMA,
  ]
    .filter(Boolean)
    .join("\n");
}

function safeJsonExtract(text: string): ResearchResult {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<ResearchResult>;
    return { ...EMPTY_RESEARCH, ...parsed };
  } catch {
    // Try to extract the first JSON object substring
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]) as Partial<ResearchResult>;
        return { ...EMPTY_RESEARCH, ...parsed };
      } catch {
        /* fall through */
      }
    }
    return { ...EMPTY_RESEARCH };
  }
}

/**
 * Test connection to the user's chosen LLM provider. Provider-agnostic.
 * Accepts optional overrides so the Settings "Test" button can validate
 * unsaved provider/model/key edits without persisting them first.
 */
export async function testAnthropicConnection(
  userId: string,
  overrides?: { provider?: string; model?: string; apiKey?: string },
): Promise<{ ok: boolean; message: string; provider: string; model: string }> {
  const result = await testLlmConnection(userId, overrides);
  return { ok: result.ok, message: result.message, provider: result.provider, model: result.model };
}

/**
 * Research a list of classified items sequentially with rate limiting.
 * Each item gets supplier KB matching + an LLM call (whichever provider
 * the user picked) + image waterfall. Failures per item are captured in
 * `error` and the loop continues.
 */
export async function researchItems(
  userId: string,
  items: ClassifiedItem[],
  onProgress?: (idx: number, total: number, status: string) => void,
): Promise<ResearchedItem[]> {
  const libyaCtx = (await getSetting(userId, "rfq_libya_context")).toLowerCase() !== "false";
  const out: ResearchedItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    onProgress?.(i, items.length, "researching");
    const matchedDb = await matchSuppliersForItem(userId, it, 5);
    const matchKeywords = extractMatchKeywords(it);
    try {
      const candidates = await findCandidateSuppliers(userId, it);
      const prompt = buildPrompt(it, candidates, libyaCtx);
      const result = await callLlm({ userId, prompt, maxTokens: MAX_TOKENS });
      if (!result.ok) {
        // Always run DB supplier matching, even when there is no API key
        // or the LLM call failed, so the user still gets useful results.
        out.push({
          ...it,
          research: { ...EMPTY_RESEARCH },
          imageBadge: imageWaterfall(it, EMPTY_RESEARCH),
          matchedDbSuppliers: matchedDb,
          matchKeywords,
          error: result.missingKey ? "no_api_key" : (result.error ?? "research_failed"),
        });
        onProgress?.(i + 1, items.length, result.missingKey ? "skipped" : "failed");
        continue;
      }
      const research = safeJsonExtract(result.text);
      out.push({
        ...it,
        research,
        imageBadge: imageWaterfall(it, research),
        matchedDbSuppliers: matchedDb,
        matchKeywords,
      });
    } catch (err) {
      logger.warn({ err, item: it.itemNumber }, "rfq aiResearch item failed");
      out.push({
        ...it,
        research: { ...EMPTY_RESEARCH },
        imageBadge: imageWaterfall(it, EMPTY_RESEARCH),
        matchedDbSuppliers: matchedDb,
        matchKeywords,
        error: err instanceof Error ? err.message.slice(0, 200) : "research_failed",
      });
    }
    onProgress?.(i + 1, items.length, "done");
    if (i < items.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }
  return out;
}

import { Router, type IRouter } from "express";
import { db, companyProfilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Field length budgets — kept in sync with the schema definitions in
// lib/db/src/schema/companyProfiles.ts. We clamp aggressively on the way
// in so a malicious client can't blow past the column length and crash
// the insert with an unhelpful 500.
function clampStr(v: unknown, max: number, dflt = ""): string {
  if (typeof v !== "string") return dflt;
  return v.slice(0, max);
}

// Logo is stored as a data URL (image/* base64) so logos travel with the
// profile without us needing object storage. We cap at 1 MB worth of
// base64 (~750 KB raw) to keep DB rows reasonable. Anything larger is
// rejected with a friendly message.
const MAX_LOGO_LEN = 1_400_000;

type CompanyProfileRow = typeof companyProfilesTable.$inferSelect;

function serialize(p: CompanyProfileRow) {
  return {
    id: p.id,
    companyName: p.companyName,
    logoData: p.logoData,
    address: p.address,
    city: p.city,
    country: p.country,
    phone: p.phone,
    email: p.email,
    website: p.website,
    taxOrVatNumber: p.taxOrVatNumber,
    registrationNumber: p.registrationNumber,
    defaultCurrency: p.defaultCurrency,
    defaultLanguage: p.defaultLanguage,
    defaultPaymentTerms: p.defaultPaymentTerms,
    defaultNotes: p.defaultNotes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function readBody(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  // Logo handling: accept either `logoData` (data URL) or `logoUrl` (which
  // the existing BusinessInfoForm uses) so the client can post whichever
  // it has. We coerce both into the schema's logoData column.
  const rawLogo =
    typeof b["logoData"] === "string"
      ? (b["logoData"] as string)
      : typeof b["logoUrl"] === "string"
      ? (b["logoUrl"] as string)
      : "";
  return {
    companyName: clampStr(b["companyName"], 255).trim(),
    logoData: rawLogo.slice(0, MAX_LOGO_LEN),
    address: clampStr(b["address"], 1000),
    city: clampStr(b["city"], 128),
    country: clampStr(b["country"], 64),
    phone: clampStr(b["phone"], 64),
    email: clampStr(b["email"], 320),
    website: clampStr(b["website"], 512),
    taxOrVatNumber: clampStr(b["taxOrVatNumber"], 64),
    registrationNumber: clampStr(b["registrationNumber"], 64),
    defaultCurrency: clampStr(b["defaultCurrency"], 8) || "USD",
    defaultLanguage: clampStr(b["defaultLanguage"], 8) || "en",
    defaultPaymentTerms: clampStr(b["defaultPaymentTerms"], 1000),
    defaultNotes: clampStr(b["defaultNotes"], 2000),
    rawLogoLen: rawLogo.length,
  };
}

router.get("/me/company-profile", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Unauthenticated",
        message: "Sign in to continue.",
      });
    }
    const rows = await db
      .select()
      .from(companyProfilesTable)
      .where(eq(companyProfilesTable.userId, user.id))
      .limit(1);
    res.setHeader("Cache-Control", "private, no-store");
    if (rows.length === 0) {
      // Empty state: caller should treat this as "no profile yet" and
      // show a fresh form. Returning success:true with data:null keeps
      // the JSON envelope consistent.
      return res.json({ success: true, data: null });
    }
    return res.json({ success: true, data: serialize(rows[0]!) });
  } catch (err) {
    logger.error({ err }, "GET /me/company-profile failed");
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Something went wrong on our end. Please try again.",
    });
  }
});

// Both POST and PUT behave as upserts because the spec says "one user has
// one main company profile". This avoids the awkwardness of forcing the
// frontend to know whether the row already exists before saving.
async function upsertProfile(req: Parameters<Parameters<typeof router.post>[1]>[0], res: Parameters<Parameters<typeof router.post>[1]>[1]) {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Unauthenticated",
        message: "Sign in to continue.",
      });
    }
    const data = readBody(req.body);
    if (!data.companyName) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        message: "Please provide a company name.",
      });
    }
    if (data.rawLogoLen > MAX_LOGO_LEN) {
      return res.status(413).json({
        success: false,
        error: "Logo too large",
        message: "Logo image must be under 1 MB. Please choose a smaller file.",
      });
    }
    // Atomic upsert keyed on the (unique) userId. Doing this as a single
    // statement removes the read-then-write race that bit us when two
    // first-time saves arrived concurrently for the same user (the second
    // would explode against the unique constraint and return 500).
    const values = {
      userId: user.id,
      companyName: data.companyName,
      logoData: data.logoData,
      address: data.address,
      city: data.city,
      country: data.country,
      phone: data.phone,
      email: data.email,
      website: data.website,
      taxOrVatNumber: data.taxOrVatNumber,
      registrationNumber: data.registrationNumber,
      defaultCurrency: data.defaultCurrency,
      defaultLanguage: data.defaultLanguage,
      defaultPaymentTerms: data.defaultPaymentTerms,
      defaultNotes: data.defaultNotes,
    };
    const [saved] = await db
      .insert(companyProfilesTable)
      .values(values)
      .onConflictDoUpdate({
        target: companyProfilesTable.userId,
        set: {
          companyName: values.companyName,
          logoData: values.logoData,
          address: values.address,
          city: values.city,
          country: values.country,
          phone: values.phone,
          email: values.email,
          website: values.website,
          taxOrVatNumber: values.taxOrVatNumber,
          registrationNumber: values.registrationNumber,
          defaultCurrency: values.defaultCurrency,
          defaultLanguage: values.defaultLanguage,
          defaultPaymentTerms: values.defaultPaymentTerms,
          defaultNotes: values.defaultNotes,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Could not save your company profile. Please try again.",
      });
    }
    // 201 on the very first save (createdAt === updatedAt within ~1ms),
    // 200 on every subsequent update. Frontend doesn't depend on the
    // distinction but it's nice to keep semantics tidy for any future
    // CLI/curl users.
    const isFresh = saved.createdAt.getTime() === saved.updatedAt.getTime();
    return res.status(isFresh ? 201 : 200).json({ success: true, data: serialize(saved) });
  } catch (err) {
    logger.error({ err }, "POST/PUT /me/company-profile failed");
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Something went wrong on our end. Please try again.",
    });
  }
}

router.post("/me/company-profile", requireAuth, upsertProfile);
router.put("/me/company-profile", requireAuth, upsertProfile);

export default router;

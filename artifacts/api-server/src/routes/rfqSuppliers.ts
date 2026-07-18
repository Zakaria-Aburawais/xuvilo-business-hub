import { Router, type IRouter } from "express";
import { db, rfqSuppliersTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface SupplierBody {
  name: string;
  country: string;
  city: string;
  address: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  specialties: string[];
  isLocal: boolean;
  notes: string;
  active: boolean;
}

function clampStr(v: unknown, max: number, dflt = ""): string {
  if (typeof v !== "string") return dflt;
  return v.slice(0, max);
}

function parseSpecialties(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 50);
  }
  if (typeof v === "string") {
    return v.split(/[,;]/).map((x) => x.trim()).filter(Boolean).slice(0, 50);
  }
  return [];
}

function serialize(s: typeof rfqSuppliersTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    country: s.country,
    city: s.city,
    address: s.address,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    website: s.website,
    specialties: Array.isArray(s.specialties) ? (s.specialties as string[]) : [],
    isLocal: s.isLocal,
    notes: s.notes,
    active: s.active,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function valuesFrom(body: Record<string, unknown>): Partial<SupplierBody> {
  const out: Partial<SupplierBody> = {};
  if ("name" in body) out.name = clampStr(body["name"], 255);
  if ("country" in body) out.country = clampStr(body["country"], 64);
  if ("city" in body) out.city = clampStr(body["city"], 128);
  if ("address" in body) out.address = clampStr(body["address"], 1000);
  if ("contactName" in body) out.contactName = clampStr(body["contactName"], 255);
  if ("email" in body) out.email = clampStr(body["email"], 320);
  if ("phone" in body) out.phone = clampStr(body["phone"], 64);
  if ("website" in body) out.website = clampStr(body["website"], 512);
  if ("specialties" in body) out.specialties = parseSpecialties(body["specialties"]);
  if ("isLocal" in body) out.isLocal = Boolean(body["isLocal"]);
  if ("notes" in body) out.notes = clampStr(body["notes"], 2000);
  if ("active" in body) out.active = Boolean(body["active"]);
  return out;
}

router.get("/me/rfq/suppliers", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const rows = await db
      .select()
      .from(rfqSuppliersTable)
      .where(eq(rfqSuppliersTable.userId, user.id))
      .orderBy(desc(rfqSuppliersTable.isLocal), desc(rfqSuppliersTable.updatedAt))
      .limit(2000);
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ suppliers: rows.map(serialize) });
  } catch (err) {
    logger.error({ err }, "GET /me/rfq/suppliers failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/me/rfq/suppliers", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const fields = valuesFrom(body);
    const name = (fields.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "name_required" });
    const [created] = await db
      .insert(rfqSuppliersTable)
      .values({
        userId: user.id,
        name,
        country: fields.country ?? "",
        city: fields.city ?? "",
        address: fields.address ?? "",
        contactName: fields.contactName ?? "",
        email: fields.email ?? "",
        phone: fields.phone ?? "",
        website: fields.website ?? "",
        specialties: fields.specialties ?? [],
        isLocal: fields.isLocal ?? false,
        notes: fields.notes ?? "",
        active: fields.active ?? true,
      })
      .returning();
    if (!created) return res.status(500).json({ error: "insert_failed" });
    return res.status(201).json({ supplier: serialize(created) });
  } catch (err) {
    logger.error({ err }, "POST /me/rfq/suppliers failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.patch("/me/rfq/suppliers/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates = { ...valuesFrom(body), updatedAt: new Date() } as Record<string, unknown>;
    const [updated] = await db
      .update(rfqSuppliersTable)
      .set(updates)
      .where(and(eq(rfqSuppliersTable.id, id), eq(rfqSuppliersTable.userId, user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "not_found" });
    return res.json({ supplier: serialize(updated) });
  } catch (err) {
    logger.error({ err }, "PATCH /me/rfq/suppliers/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/me/rfq/suppliers/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const result = await db
      .delete(rfqSuppliersTable)
      .where(and(eq(rfqSuppliersTable.id, id), eq(rfqSuppliersTable.userId, user.id)))
      .returning({ id: rfqSuppliersTable.id });
    if (result.length === 0) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "DELETE /me/rfq/suppliers/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

const SEED_SUPPLIERS: Array<Omit<SupplierBody, "active"> & { active?: boolean }> = [
  { name: "Rexel Gulf FZE", country: "UAE", city: "Dubai", address: "", contactName: "", email: "gulf@rexel.com", phone: "+971 4 299 5000", website: "https://www.rexel.com", specialties: ["electrical","lighting","OSRAM","Philips","cables","switchgear"], isLocal: false, notes: "Major electrical distributor, ships to Libya" },
  { name: "Sonepar Middle East", country: "UAE", city: "Dubai", address: "", contactName: "", email: "me@sonepar.com", phone: "+971 4 885 1000", website: "https://www.sonepar.com", specialties: ["electrical","industrial","automation","cables","instrumentation"], isLocal: false, notes: "Global electrical distributor" },
  { name: "RS Components Gulf", country: "UAE", city: "Dubai", address: "", contactName: "", email: "gulf@rs-components.com", phone: "+971 4 370 3700", website: "https://ae.rs-online.com", specialties: ["electronic","electrical","mechanical","tools","instrumentation","bearings"], isLocal: false, notes: "Wide range industrial components, fast delivery" },
  { name: "Imerys Aluminates", country: "France", city: "Paris", address: "", contactName: "", email: "aluminates@imerys.com", phone: "+33 1 49 55 63 00", website: "https://www.imerys.com", specialties: ["cement fondu","aluminate cement","refractory","castable"], isLocal: false, notes: "Leading manufacturer of calcium aluminate cement" },
  { name: "Calderys Group", country: "France", city: "Lyon", address: "", contactName: "", email: "info@calderys.com", phone: "+33 4 72 28 73 00", website: "https://www.calderys.com", specialties: ["refractory","insulating aggregate","castable","cement fondu","1800F"], isLocal: false, notes: "Global refractory solutions" },
  { name: "OSRAM Middle East", country: "UAE", city: "Dubai", address: "", contactName: "", email: "me@osram.com", phone: "+971 4 422 2440", website: "https://www.osram.com/me", specialties: ["lamp","mercury lamp","MBFT","blended lamp","lighting","bulb","OSRAM"], isLocal: false, notes: "OSRAM official regional office" },
  { name: "Ricoh Middle East FZE", country: "UAE", city: "Dubai", address: "", contactName: "", email: "info@ricoh-me.com", phone: "+971 4 601 9000", website: "https://www.ricoh-me.com", specialties: ["ricoh","printer","MFP","IMC","copier","multifunction"], isLocal: false, notes: "Ricoh official regional distributor" },
  { name: "Sika AG Middle East", country: "UAE", city: "Dubai", address: "", contactName: "", email: "info@me.sika.com", phone: "+971 4 884 0828", website: "https://www.sika.com", specialties: ["bitumen paint","waterproofing","coating","sealant","adhesive","construction chemicals"], isLocal: false, notes: "Construction chemicals leader" },
  { name: "Tripoli Technical Supplies", country: "Libya", city: "Tripoli", address: "", contactName: "", email: "", phone: "+218 21 333 0000", website: "", specialties: ["hardware","tools","safety","PPE","electrical","plumbing","industrial"], isLocal: true, notes: "General technical and industrial supplier Tripoli" },
  { name: "Al Amal Industrial Supplies", country: "Libya", city: "Tripoli", address: "", contactName: "", email: "", phone: "+218 91 333 4455", website: "", specialties: ["safety","cargo","rigging","ratchet strap","tools","lifting equipment"], isLocal: true, notes: "Safety and cargo equipment Tripoli" },
  { name: "Libya Cement Company LCC", country: "Libya", city: "Tripoli", address: "", contactName: "", email: "", phone: "+218 21 3611 000", website: "", specialties: ["portland cement","cement","OPC","construction","concrete"], isLocal: true, notes: "National cement producer Libya" },
  { name: "Almadina Electrical Supplies", country: "Libya", city: "Tripoli", address: "", contactName: "", email: "", phone: "+218 21 444 5678", website: "", specialties: ["electrical","lighting","lamps","cables","switches","sockets","OSRAM","Philips"], isLocal: true, notes: "Electrical supplies Tripoli, verify specific stock availability" },
  { name: "Sultan Water Company", country: "Libya", city: "Tripoli", address: "", contactName: "", email: "", phone: "+218 21 700 0000", website: "", specialties: ["drinking water","water","bottled water","15 liter","mineral water"], isLocal: true, notes: "Named Sultan brand drinking water supplier" },
  { name: "Al Jazeera Building Materials", country: "Libya", city: "Tripoli", address: "", contactName: "", email: "", phone: "+218 21 488 1122", website: "", specialties: ["bitumen","paint","cement","building materials","construction","waterproofing"], isLocal: true, notes: "Building materials and construction chemicals Tripoli" },
];

router.post("/me/rfq/suppliers/seed-defaults", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    let inserted = 0;
    let skipped = 0;
    const existing = await db
      .select({ name: rfqSuppliersTable.name })
      .from(rfqSuppliersTable)
      .where(eq(rfqSuppliersTable.userId, user.id));
    const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));
    for (const s of SEED_SUPPLIERS) {
      if (existingNames.has(s.name.toLowerCase())) { skipped++; continue; }
      await db.insert(rfqSuppliersTable).values({
        userId: user.id,
        name: s.name,
        country: s.country,
        city: s.city,
        address: s.address,
        contactName: s.contactName,
        email: s.email,
        phone: s.phone,
        website: s.website,
        specialties: s.specialties,
        isLocal: s.isLocal,
        notes: s.notes,
        active: s.active ?? true,
      });
      inserted++;
    }
    return res.json({ ok: true, inserted, skipped });
  } catch (err) {
    logger.error({ err }, "POST /me/rfq/suppliers/seed-defaults failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;

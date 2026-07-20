import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { db, testimonialsTable } from "@workspace/db";
import { requireRole } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const testimonialInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  quoteEn: z.string().trim().min(1).max(2000),
  quoteAr: z.string().trim().min(1).max(2000),
  roleEn: z.string().trim().min(1).max(255),
  roleAr: z.string().trim().min(1).max(255),
  stars: z.number().int().min(1).max(5),
  active: z.boolean().optional(),
});

const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  expectedIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(500)
    .optional(),
});

function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

router.get("/admin/testimonials", requireRole("admin"), async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(testimonialsTable)
      .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.id));
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ success: true, items: rows });
  } catch (err) {
    logger.error({ err }, "admin/testimonials list failed");
    return res.status(503).json({
      success: false,
      error: "Database not available",
      message: "Could not load testimonials.",
    });
  }
});

router.post("/admin/testimonials", requireRole("admin"), async (req, res) => {
  const parsed = testimonialInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Invalid testimonial data.",
    });
  }
  try {
    const existing = await db
      .select({ sortOrder: testimonialsTable.sortOrder })
      .from(testimonialsTable);
    const maxOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder), 0);
    const inserted = await db
      .insert(testimonialsTable)
      .values({
        ...parsed.data,
        active: parsed.data.active ?? true,
        sortOrder: maxOrder + 1,
      })
      .returning();
    return res.status(201).json({ success: true, item: inserted[0] });
  } catch (err) {
    logger.error({ err }, "admin/testimonials create failed");
    return res.status(503).json({
      success: false,
      error: "Database not available",
      message: "Could not create testimonial.",
    });
  }
});

router.put(
  "/admin/testimonials/reorder",
  requireRole("admin"),
  async (req, res) => {
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "invalid_input",
        message: "Invalid reorder payload.",
      });
    }
    try {
      let conflict = false;
      await db.transaction(async (tx) => {
        const expected = parsed.data.expectedIds;
        if (expected) {
          // Lock all rows so concurrent reorder transactions serialize here:
          // the second transaction blocks until the first commits, then sees
          // the updated order and fails the comparison instead of silently
          // overwriting it.
          const current = await tx
            .select({ id: testimonialsTable.id })
            .from(testimonialsTable)
            .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.id))
            .for("update");
          const currentIds = current.map((r) => r.id);
          const matches =
            currentIds.length === expected.length &&
            currentIds.every((id, i) => id === expected[i]);
          if (!matches) {
            conflict = true;
            return;
          }
        }
        for (let i = 0; i < parsed.data.ids.length; i++) {
          const id = parsed.data.ids[i]!;
          await tx
            .update(testimonialsTable)
            .set({ sortOrder: i + 1 })
            .where(eq(testimonialsTable.id, id));
        }
      });
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: "conflict",
          message:
            "The testimonial order changed since you loaded the page. Refresh and try again.",
        });
      }
      return res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "admin/testimonials reorder failed");
      return res.status(503).json({
        success: false,
        error: "Database not available",
        message: "Could not reorder testimonials.",
      });
    }
  },
);

router.put(
  "/admin/testimonials/:id",
  requireRole("admin"),
  async (req, res) => {
    const rawId = req.params["id"];
    const id = parseId(typeof rawId === "string" ? rawId : undefined);
    if (id === null) {
      return res.status(400).json({
        success: false,
        error: "invalid_id",
        message: "Invalid testimonial id.",
      });
    }
    const bodySchema = testimonialInputSchema.partial().extend({
      // Optimistic-concurrency guard: the values the ADMIN'S EDIT FORM was
      // loaded with. When present, the update only applies if the row still
      // matches — otherwise 409, so one admin's edit can't silently
      // overwrite another's. (The table has no updatedAt column, so this is
      // a content compare-and-swap rather than a version check.)
      expected: testimonialInputSchema.partial().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (
      !parsed.success ||
      Object.keys(parsed.data).filter((k) => k !== "expected").length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "invalid_input",
        message: "Invalid testimonial data.",
      });
    }
    const { expected, ...changes } = parsed.data;
    try {
      let conflict = false;
      let notFound = false;
      let item: typeof testimonialsTable.$inferSelect | undefined;
      await db.transaction(async (tx) => {
        // Lock the row so two concurrent edits serialize; the loser then
        // sees the winner's values and gets a clean 409 instead of a
        // last-write-wins overwrite.
        const [current] = await tx
          .select()
          .from(testimonialsTable)
          .where(eq(testimonialsTable.id, id))
          .for("update");
        if (!current) {
          notFound = true;
          return;
        }
        if (expected) {
          const dirty = (Object.keys(expected) as Array<keyof typeof expected>)
            .some((k) => current[k] !== expected[k]);
          if (dirty) {
            conflict = true;
            return;
          }
        }
        const updated = await tx
          .update(testimonialsTable)
          .set(changes)
          .where(eq(testimonialsTable.id, id))
          .returning();
        item = updated[0];
      });
      if (notFound) {
        return res.status(404).json({
          success: false,
          error: "not_found",
          message: "Testimonial not found.",
        });
      }
      if (conflict) {
        return res.status(409).json({
          success: false,
          error: "conflict",
          message:
            "This testimonial was changed by another admin since you opened it. Refresh and re-apply your edit.",
        });
      }
      return res.json({ success: true, item });
    } catch (err) {
      logger.error({ err }, "admin/testimonials update failed");
      return res.status(503).json({
        success: false,
        error: "Database not available",
        message: "Could not update testimonial.",
      });
    }
  },
);

router.delete(
  "/admin/testimonials/:id",
  requireRole("admin"),
  async (req, res) => {
    const rawId = req.params["id"];
    const id = parseId(typeof rawId === "string" ? rawId : undefined);
    if (id === null) {
      return res.status(400).json({
        success: false,
        error: "invalid_id",
        message: "Invalid testimonial id.",
      });
    }
    try {
      const deleted = await db
        .delete(testimonialsTable)
        .where(eq(testimonialsTable.id, id))
        .returning({ id: testimonialsTable.id });
      if (!deleted[0]) {
        return res.status(404).json({
          success: false,
          error: "not_found",
          message: "Testimonial not found.",
        });
      }
      return res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "admin/testimonials delete failed");
      return res.status(503).json({
        success: false,
        error: "Database not available",
        message: "Could not delete testimonial.",
      });
    }
  },
);

export default router;

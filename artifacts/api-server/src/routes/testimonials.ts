import { Router } from "express";

const router = Router();

router.get("/testimonials", async (_req, res) => {
  try {
    const [dbMod, ormMod] = await Promise.all([
      import("@workspace/db"),
      import("drizzle-orm"),
    ]);
    const { db, testimonialsTable } = dbMod;
    const { eq, asc } = ormMod;

    const rows = await db
      .select()
      .from(testimonialsTable)
      .where(eq(testimonialsTable.active, true))
      .orderBy(asc(testimonialsTable.sortOrder));

    res.setHeader("Cache-Control", "no-cache");
    res.json(rows);
  } catch {
    res.status(503).json({ error: "Database not available" });
  }
});

export default router;

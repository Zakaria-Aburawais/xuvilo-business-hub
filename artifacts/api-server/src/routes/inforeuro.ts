import { Router } from "express";

const router = Router();

const INFOREURO_BASE = "https://ec.europa.eu/budg/inforeuro/api/public/monthly-rates";

router.get("/inforeuro/rates", async (req, res) => {
  try {
    const period = req.query.period as string | undefined;
    const url = period ? `${INFOREURO_BASE}?period=${period}` : INFOREURO_BASE;

    const upstream = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "BusinessesHub/1.0",
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `InfoEuro returned ${upstream.status}` });
      return;
    }

    const data = await upstream.json();

    res.setHeader("Cache-Control", "public, max-age=86400");
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch InfoEuro rates" });
  }
});

export default router;

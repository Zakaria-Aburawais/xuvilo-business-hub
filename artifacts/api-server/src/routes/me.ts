import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../lib/auth";
import { getUserByEmail } from "../lib/userStore";
import { deriveEntitlements } from "../lib/entitlements";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Tiny endpoint guarded by requireRole("admin") so we can verify the 401/403
// envelope from tests without shipping any real admin functionality.
router.get("/me/admin-ping", requireRole("admin"), (_req, res) => {
  res.json({ success: true, message: "admin ok" });
});

router.get("/me/entitlements", requireAuth, async (req, res) => {
  try {
    const email = req.userEmail!;
    const user = await getUserByEmail(email);
    const entitlements = deriveEntitlements(user);
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    return res.json(entitlements);
  } catch (err) {
    logger.error({ err }, "me/entitlements failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;

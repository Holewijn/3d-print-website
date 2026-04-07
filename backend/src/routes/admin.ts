import { Router } from "express";
import { exec } from "child_process";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const adminRouter = Router();

adminRouter.post("/update", requireAuth, requireAdmin, (_req, res) => {
  const appDir = process.env.APP_DIR || "/opt/print3d";
  exec(`bash ${appDir}/scripts/update.sh`, { timeout: 10 * 60 * 1000 }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ ok: false, stderr, stdout, error: err.message });
    res.json({ ok: true, stdout });
  });
});

adminRouter.get("/version", (_req, res) => {
  exec("git rev-parse HEAD", { cwd: process.env.APP_DIR || "/opt/print3d" }, (_e, stdout) => {
    res.json({ commit: stdout.trim() });
  });
});

import { Router, Request, Response } from "express";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const adminRouter = Router();

const execAsync = promisify(exec);
const APP_DIR = process.env.APP_DIR || "/opt/print3d";

// ─── Helpers ──────────────────────────────────────────────

async function git(args: string): Promise<string> {
  const { stdout } = await execAsync(`git ${args}`, { cwd: APP_DIR, timeout: 30_000 });
  return stdout.trim();
}

/** Stream a command as SSE over an existing response. */
function sseStream(cmd: string, args: string[], cwd: string, req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  function send(type: string, text: string) {
    res.write(`data: ${JSON.stringify({ type, text })}\n\n`);
  }

  const child = spawn(cmd, args, { cwd, stdio: "pipe" });

  child.stdout?.on("data", (d: Buffer) => send("out", d.toString()));
  child.stderr?.on("data", (d: Buffer) => send("err", d.toString()));
  child.on("close", (code) => { send("exit", String(code ?? -1)); res.end(); });
  child.on("error", (e) => { send("err", `spawn error: ${e.message}\n`); send("exit", "-1"); res.end(); });

  req.on("close", () => { try { child.kill("SIGTERM"); } catch {} });
}

// ─── Routes ───────────────────────────────────────────────

/** GET /admin/status — current & remote version + meta */
adminRouter.get("/status", requireAuth, requireAdmin, async (_req, res) => {
  try {
    // Fetch remote quietly (best-effort, don't fail if offline)
    await execAsync("git fetch origin --quiet", { cwd: APP_DIR, timeout: 15_000 }).catch(() => {});

    const branch       = await git("rev-parse --abbrev-ref HEAD").catch(() => "unknown");
    const localHash    = await git("rev-parse HEAD").catch(() => "unknown");
    const remoteHash   = await git(`rev-parse origin/${branch}`).catch(() => localHash);
    const behind       = parseInt(await git(`rev-list HEAD..origin/${branch} --count`).catch(() => "0"), 10) || 0;
    const ahead        = parseInt(await git(`rev-list origin/${branch}..HEAD --count`).catch(() => "0"), 10) || 0;
    const lastMessage  = await git("log -1 --pretty=format:%s").catch(() => "");
    const lastAuthor   = await git("log -1 --pretty=format:%an").catch(() => "");
    const lastDate     = await git("log -1 --pretty=format:%cI").catch(() => "");
    const nodeVersion  = await execAsync("node --version").then((r) => r.stdout.trim()).catch(() => "unknown");
    const uptime       = process.uptime();

    res.json({ localHash, remoteHash, branch, behind, ahead, upToDate: behind === 0, lastCommit: { message: lastMessage, author: lastAuthor, date: lastDate }, nodeVersion, uptime });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /admin/git-log — recent commits for rollback picker */
adminRouter.get("/git-log", requireAuth, requireAdmin, (_req, res) => {
  // Use unit separator (0x1f) to safely split fields that may contain spaces
  exec(
    "git log --pretty=format:%H%x1f%h%x1f%s%x1f%an%x1f%cI -20",
    { cwd: APP_DIR },
    (_e, stdout) => {
      const commits = stdout.trim().split("\n").filter(Boolean).map((line) => {
        const [hash, short, message, author, date] = line.split("\x1f");
        return { hash, short, message, author, date };
      });
      res.json(commits);
    }
  );
});

/** POST /admin/update/stream — pull & rebuild with live output */
adminRouter.post("/update/stream", requireAuth, requireAdmin, (req, res) => {
  sseStream("bash", [`${APP_DIR}/scripts/update.sh`], APP_DIR, req, res);
});

/** POST /admin/rollback/stream — hard-reset to commit + rebuild */
adminRouter.post("/rollback/stream", requireAuth, requireAdmin, (req, res) => {
  const { commit } = req.body as { commit?: string };
  if (!commit || !/^[0-9a-f]{7,40}$/i.test(commit)) {
    return res.status(400).json({ error: "Invalid commit hash" });
  }

  const script = [
    "set -e",
    `cd "${APP_DIR}"`,
    `echo "▸ Resetting to ${commit}..."`,
    `git reset --hard ${commit}`,
    `echo "▸ Installing dependencies..."`,
    "pnpm install --recursive 2>&1",
    `echo "▸ Building all packages..."`,
    "pnpm run build 2>&1",
    `echo "▸ Restarting application..."`,
    "pm2 restart all 2>&1 || true",
    `echo "✓ Rollback complete"`,
  ].join("\n");

  sseStream("bash", ["-c", script], APP_DIR, req, res);
});

/** POST /admin/restart — restart via PM2 or self-SIGTERM */
adminRouter.post("/restart", requireAuth, requireAdmin, (_req, res) => {
  res.json({ ok: true });
  setTimeout(() => {
    exec("pm2 restart all", (err) => {
      if (err) process.kill(process.pid, "SIGTERM");
    });
  }, 300);
});

/** GET /admin/version — kept for backward compatibility */
adminRouter.get("/version", (_req, res) => {
  exec("git rev-parse HEAD", { cwd: APP_DIR }, (_e, stdout) => {
    res.json({ commit: stdout.trim() });
  });
});

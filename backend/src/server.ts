import "dotenv/config";
import express from "express";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";

import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/users";
import { pagesRouter } from "./routes/pages";
import { productsRouter } from "./routes/products";
import { ordersRouter } from "./routes/orders";
import { quotesRouter } from "./routes/quotes";
import { stlRouter } from "./routes/stl";
import { inventoryRouter } from "./routes/inventory";
import { printersRouter } from "./routes/printers";
import { paymentsRouter } from "./routes/payments";
import { settingsRouter } from "./routes/settings";
import { contactRouter } from "./routes/contact";
import { statsRouter } from "./routes/stats";
import { adminRouter } from "./routes/admin";
import { shippingRouter } from "./routes/shipping";
import { startMoonrakerWorker } from "./workers/moonraker";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const FRONTEND_PORT = 3001;
const APP_DIR = process.env.APP_DIR || path.resolve(__dirname, "../..");

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));

app.use("/api", express.json({ limit: "10mb" }));
app.use("/api", express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("combined"));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/quotes", quotesRouter);
app.use("/api/stl", stlRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/printers", printersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/contact", contactRouter);
app.use("/api/stats", statsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/shipping", shippingRouter);
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Admin SPA
const ADMIN_DIST = path.resolve(APP_DIR, "admin/out");
app.use("/admin", express.static(ADMIN_DIST));
app.get("/admin/*", (_req, res) => res.sendFile(path.join(ADMIN_DIST, "index.html")));

// Spawn Next.js child
let nextChild: ChildProcess | null = null;
function startNext() {
  const frontendDir = path.resolve(APP_DIR, "frontend");
  console.log(`[next] starting Next.js on 127.0.0.1:${FRONTEND_PORT}`);
  nextChild = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(FRONTEND_PORT), "-H", "127.0.0.1"], {
    cwd: frontendDir,
    env: { ...process.env, PORT: String(FRONTEND_PORT) },
    stdio: "inherit",
  });
  nextChild.on("exit", (code) => {
    console.error(`[next] exited with code ${code} — restarting in 5s`);
    nextChild = null;
    setTimeout(startNext, 5000);
  });
}
process.on("exit", () => { if (nextChild) nextChild.kill(); });
process.on("SIGTERM", () => { if (nextChild) nextChild.kill(); process.exit(0); });
process.on("SIGINT", () => { if (nextChild) nextChild.kill(); process.exit(0); });

app.use("/", createProxyMiddleware({
  target: `http://127.0.0.1:${FRONTEND_PORT}`,
  changeOrigin: false,
  ws: true,
  logger: undefined,
}));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

app.listen(PORT, HOST, () => {
  console.log(`[print3d] backend listening on http://${HOST}:${PORT}`);
  startMoonrakerWorker();
  setTimeout(startNext, 1000);
});

import "dotenv/config";
import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

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
import { startMoonrakerWorker } from "./workers/moonraker";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("combined"));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use("/api", apiLimiter);

// API routes
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

app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Static: admin SPA at /admin, frontend SPA at /
const ADMIN_DIST = path.resolve(__dirname, "../../admin/out");
const FRONT_DIST = path.resolve(__dirname, "../../frontend/out");

app.use("/admin", express.static(ADMIN_DIST));
app.get("/admin/*", (_req, res) => res.sendFile(path.join(ADMIN_DIST, "index.html")));

app.use("/", express.static(FRONT_DIST));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(FRONT_DIST, "index.html"));
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

app.listen(PORT, HOST, () => {
  console.log(`[print3d] listening on http://${HOST}:${PORT}`);
  startMoonrakerWorker();
});

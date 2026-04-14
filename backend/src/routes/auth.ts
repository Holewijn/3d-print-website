import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

export const authRouter = Router();
const COOKIE = process.env.SESSION_COOKIE_NAME || "p3d_session";

// Backfill helper — links any guest orders/quotes with this email to the user.
async function linkPastForUser(userId: string, email: string) {
  const lower = email.toLowerCase().trim();
  try {
    await prisma.order.updateMany({
      where: { userId: null, email: { equals: lower, mode: "insensitive" } },
      data: { userId },
    });
    await prisma.quote.updateMany({
      where: { userId: null, email: { equals: lower, mode: "insensitive" } },
      data: { userId },
    });
  } catch (e) {
    console.error("[auth] backfill failed", e);
  }
}

authRouter.post("/register", async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
  const data = schema.parse(req.body);
  const email = data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email already used" });
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  await linkPastForUser(user.id, email);
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 86400000 });
  res.json({ id: user.id, email: user.email, role: user.role });
});

authRouter.post("/login", async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string() });
  const data = schema.parse(req.body);
  const email = data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  await linkPastForUser(user.id, email);
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 86400000 });
  res.json({ id: user.id, email: user.email, role: user.role });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "Not found" });
  const { passwordHash, ...safe } = user as any;
  res.json(safe);
});

authRouter.put("/profile", requireAuth, async (req: AuthedRequest, res) => {
  const schema = z.object({
    firstName:   z.string().optional(),
    lastName:    z.string().optional(),
    phone:       z.string().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city:        z.string().optional(),
    postalCode:  z.string().optional(),
    country:     z.string().optional(),
  });
  const data = schema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data });
  const { passwordHash, ...safe } = user as any;
  res.json(safe);
});

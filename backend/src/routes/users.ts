import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";

export const userRouter = Router();

userRouter.get("/me/profile", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const { passwordHash, ...safe } = user as any;
  res.json(safe);
});

userRouter.put("/me/profile", requireAuth, async (req: AuthedRequest, res) => {
  const { firstName, lastName, phone, addressLine1, addressLine2, city, postalCode, country } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { firstName, lastName, phone, addressLine1, addressLine2, city, postalCode, country }
  });
  const { passwordHash, ...safe } = user as any;
  res.json(safe);
});

userRouter.get("/me/orders", requireAuth, async (req: AuthedRequest, res) => {
  res.json(await prisma.order.findMany({ where: { userId: req.user!.id }, include: { items: true }, orderBy: { createdAt: "desc" } }));
});

userRouter.get("/me/quotes", requireAuth, async (req: AuthedRequest, res) => {
  res.json(await prisma.quote.findMany({ where: { userId: req.user!.id }, include: { stlUpload: true }, orderBy: { createdAt: "desc" } }));
});

userRouter.get("/me/uploads", requireAuth, async (req: AuthedRequest, res) => {
  res.json(await prisma.stlUpload.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } }));
});

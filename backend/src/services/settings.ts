import { prisma } from "../db";

export async function getSetting<T = any>(key: string, fallback?: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return (row?.value as T) ?? (fallback as T);
}

export async function setSetting(key: string, value: any) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

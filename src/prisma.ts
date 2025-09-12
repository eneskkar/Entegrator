import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function connectPrisma() {
  await prisma.$connect();
  console.log("✅ Prisma connected");
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
  console.log("🛑 Prisma disconnected");
}

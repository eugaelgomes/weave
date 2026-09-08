import { PrismaClient } from "@prisma/client";

function buildDatabaseUrlFromParts() {
  const {
    DATABASE_HOST_URL,
    DATABASE_SERVICE_PORT = "5432",
    DATABASE_USERNAME,
    DATABASE_PASSWORD,
    DATABASE_NAME,
  } = process.env;

  const missing = [
    !DATABASE_HOST_URL && "DATABASE_HOST_URL",
    !DATABASE_USERNAME && "DATABASE_USERNAME",
    !DATABASE_PASSWORD && "DATABASE_PASSWORD",
    !DATABASE_NAME && "DATABASE_NAME",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `DATABASE_URL is not set and cannot be built from environment variables. Missing: ${missing.join(", ")}`
    );
  }

  const username = encodeURIComponent(DATABASE_USERNAME as string);
  const password = encodeURIComponent(DATABASE_PASSWORD as string);
  const host = DATABASE_HOST_URL as string;
  const port = DATABASE_SERVICE_PORT;
  const database = encodeURIComponent(DATABASE_NAME as string);

  return `postgresql://${username}:${password}@${host}:${port}/${database}?schema=public`;
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = buildDatabaseUrlFromParts();
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

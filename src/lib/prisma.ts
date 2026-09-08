import { Pool, PoolConfig } from "pg";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const config: PoolConfig = { connectionString };
  if (process.env.VERCEL === "1") {
    config.max = 1;
    config.idleTimeoutMillis = 5_000;
  }

  return new Pool(config);
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(createPool());
  return new PrismaClient({ adapter });
}

function isStaleClient(client: PrismaClient): boolean {
  const required = ["contractClause", "contractTemplateClause", "shareToken"] as const;
  return required.some((key) => {
    const delegate = (client as unknown as Record<string, unknown>)[key];
    return !delegate || typeof delegate !== "object";
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  let client = globalForPrisma.prisma;
  if (!client || isStaleClient(client)) {
    if (client) {
      console.warn("[prisma] Stale PrismaClient detected — recreating client");
    }
    client = createPrismaClient();
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();

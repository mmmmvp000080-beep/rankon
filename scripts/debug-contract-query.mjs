import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("=== Schema columns query ===");
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'Contract'
    ORDER BY ordinal_position
  `);
  console.table(cols.rows);

  console.log("\n=== CustomerType enum check ===");
  const enums = await pool.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'CustomerType'
    ORDER BY e.enumsortorder
  `);
  console.table(enums.rows);

  console.log("\n=== Prisma contract.findMany ===");
  try {
    const contracts = await prisma.contract.findMany({
      take: 1,
      include: { _count: { select: { uploadedFiles: true } } },
    });
    console.log("OK rows:", contracts.length);
  } catch (err) {
    console.error("PrismaClientKnownRequestError details:");
    console.error("  code:", err.code);
    console.error("  message:", err.message);
    console.error("  meta:", JSON.stringify(err.meta, null, 2));
    console.error("  clientVersion:", err.clientVersion);
    console.error("  name:", err.name);
    console.error("  stack:", err.stack);
  }
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

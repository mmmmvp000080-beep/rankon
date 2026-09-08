import { Pool } from "pg";

const urls = {
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
};

function mask(url) {
  if (!url) return null;
  return url.replace(/:([^:@/]+)@/, ":***@");
}

function parse(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    database: u.pathname.replace(/^\//, ""),
    schema: u.searchParams.get("schema") || "public",
    user: u.username,
  };
}

async function run(label, connectionString) {
  console.log(`\n${"=".repeat(60)}\n${label}\n${mask(connectionString)}`);
  const pool = new Pool({ connectionString });
  try {
    const all = await pool.query(`SELECT migration_name, finished_at, applied_steps_count, rolled_back_at FROM "_prisma_migrations" ORDER BY finished_at`);
    console.log(`\nAll _prisma_migrations (${all.rows.length} rows):`);
    console.table(all.rows);

    const enums = await pool.query(`SELECT typname FROM pg_type WHERE typname = 'CustomerType'`);
    console.log("CustomerType enum:", enums.rows.length ? "EXISTS" : "MISSING");

    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='Contract'
      AND column_name IN ('customerType','corporateRegistrationNumber')
    `);
    console.log("Contract columns:", cols.rows.map((r) => r.column_name).join(", ") || "(none)");
  } finally {
    await pool.end();
  }
}

async function main() {
  for (const [name, url] of Object.entries(urls)) {
    if (url) await run(name, url);
  }
  const db = parse(process.env.DATABASE_URL);
  const direct = process.env.DIRECT_URL ? parse(process.env.DIRECT_URL) : null;
  if (direct) {
    console.log("\n--- POOLER vs DIRECT ---");
    console.log("same host base:", db.host.replace("-pooler", "") === direct.host.replace("-pooler", ""));
    console.log("same database:", db.database === direct.database);
  }
}

main();

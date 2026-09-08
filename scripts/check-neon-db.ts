import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const client = new pg.Client({ connectionString: process.env.DIRECT_URL });

async function main() {
  await client.connect();
  const tables = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );
  console.log("TABLE_COUNT", tables.rows.length);
  console.log("TABLES", tables.rows.map((r) => r.tablename).join(", ") || "(none)");

  const migrations = await client.query(
    "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at"
  ).catch((err: Error) => {
    console.log("MIGRATIONS_ERR", err.message);
    return null;
  });
  if (migrations) {
    console.log("MIGRATIONS", JSON.stringify(migrations.rows));
  }

  const locks = await client.query(
    "SELECT pid, granted FROM pg_locks WHERE locktype = 'advisory'"
  );
  console.log("ADVISORY_LOCKS", JSON.stringify(locks.rows));
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

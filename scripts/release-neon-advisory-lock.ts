import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

async function main() {
  const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  const locks = await client.query(
    "SELECT pid, granted FROM pg_locks WHERE locktype = 'advisory' AND granted = true"
  );

  for (const row of locks.rows) {
    const pid = Number(row.pid);
    const result = await client.query("SELECT pg_terminate_backend($1) AS terminated", [pid]);
    console.log(`Terminated pid ${pid}:`, result.rows[0]?.terminated);
  }

  const remaining = await client.query(
    "SELECT pid, granted FROM pg_locks WHERE locktype = 'advisory'"
  );
  console.log("Remaining advisory locks:", remaining.rows);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

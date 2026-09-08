import { Pool } from "pg";

function parseDbUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || "5432",
      database: u.pathname.replace(/^\//, ""),
      user: u.username,
      schema: u.searchParams.get("schema") || "public",
      // Never print password
      masked: `${u.protocol}//${u.username}:***@${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}${u.search}`,
    };
  } catch {
    return { error: "invalid URL" };
  }
}

async function inspect(label, connectionString) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`DB TARGET: ${label}`);
  const info = parseDbUrl(connectionString);
  if (!info || info.error) {
    console.log("Invalid DATABASE_URL");
    return;
  }
  console.log("Connection (masked):", info.masked);
  console.log("Host:", info.host);
  console.log("Database:", info.database);
  console.log("Schema:", info.schema);
  console.log("User:", info.user);

  const pool = new Pool({ connectionString });

  try {
    const [{ rows: dbInfo }] = await Promise.all([
      pool.query(`
        SELECT
          current_database() AS database,
          current_schema() AS schema,
          inet_server_addr()::text AS server_addr,
          version() AS pg_version
      `),
    ]);
    console.log("\n--- PostgreSQL session ---");
    console.table(dbInfo);

    const migrations = await pool.query(`
      SELECT migration_name, finished_at, applied_steps_count, logs, rolled_back_at
      FROM "_prisma_migrations"
      WHERE migration_name LIKE '%customer_type%' OR migration_name LIKE '%20260731%'
      ORDER BY finished_at DESC
    `);
    console.log("\n--- _prisma_migrations (customer_type related) ---");
    if (migrations.rows.length === 0) {
      console.log("(no matching rows)");
    } else {
      console.table(migrations.rows);
    }

    const allMigrations = await pool.query(`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC
      LIMIT 10
    `);
    console.log("\n--- _prisma_migrations (latest 10) ---");
    console.table(allMigrations.rows);

    const enumCheck = await pool.query(`
      SELECT t.typname, e.enumlabel, e.enumsortorder
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'CustomerType'
      ORDER BY e.enumsortorder
    `);
    console.log("\n--- CustomerType enum ---");
    if (enumCheck.rows.length === 0) {
      console.log("MISSING: CustomerType enum does not exist");
    } else {
      console.table(enumCheck.rows);
    }

    const columns = await pool.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Contract'
        AND column_name IN ('customerType', 'corporateRegistrationNumber', 'businessNumber')
      ORDER BY column_name
    `);
    console.log("\n--- Contract columns (target fields) ---");
    const found = new Set(columns.rows.map((r) => r.column_name));
    for (const col of ["customerType", "corporateRegistrationNumber", "businessNumber"]) {
      console.log(`  ${col}: ${found.has(col) ? "EXISTS" : "MISSING"}`);
    }
    if (columns.rows.length > 0) console.table(columns.rows);

    const contractCount = await pool.query(`SELECT COUNT(*)::int AS count FROM "Contract"`);
    console.log("\n--- Contract row count ---");
    console.log(contractCount.rows[0].count, "rows (no data will be deleted by repair SQL)");
  } catch (err) {
    console.error("Query failed:", err.message);
    if (err.code) console.error("PG code:", err.code);
  } finally {
    await pool.end();
  }
}

async function main() {
  const localUrl = process.env.DATABASE_URL;
  const vercelUrl = process.env.VERCEL_DATABASE_URL || process.env.PRODUCTION_DATABASE_URL;

  console.log("=== Schema Drift Diagnostic ===");
  console.log("Timestamp:", new Date().toISOString());

  if (localUrl) {
    await inspect("DATABASE_URL (.env.local / env)", localUrl);
  } else {
    console.log("\nDATABASE_URL not set in environment");
  }

  if (vercelUrl && vercelUrl !== localUrl) {
    await inspect("VERCEL/PRODUCTION DATABASE_URL (env override)", vercelUrl);
  } else if (vercelUrl && vercelUrl === localUrl) {
    console.log("\n>>> VERCEL_DATABASE_URL/PRODUCTION_DATABASE_URL equals DATABASE_URL (same target)");
  } else {
    console.log("\n>>> VERCEL production DATABASE_URL not available in local env.");
    console.log(">>> Compare host/database above with Vercel Dashboard → Project → Storage/Env → DATABASE_URL");
  }

  const local = parseDbUrl(localUrl);
  const vercel = parseDbUrl(vercelUrl);
  if (local && vercel) {
    console.log("\n--- URL comparison ---");
    console.log("Same host:", local.host === vercel.host);
    console.log("Same database:", local.database === vercel.database);
    console.log("Same user:", local.user === vercel.user);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

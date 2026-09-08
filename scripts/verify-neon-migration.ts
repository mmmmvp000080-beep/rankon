import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const EXPECTED_TABLES = [
  "AdminUser",
  "Contract",
  "ContractItem",
  "ContractClause",
  "ShareToken",
  "UploadedFile",
  "GeneratedPdf",
  "CompanySettings",
  "ContractHistory",
  "ContractTemplateClause",
];

const EXPECTED_ENUMS = [
  "ContractType",
  "ContractStatus",
  "ShareTokenType",
  "FileCategory",
  "PdfType",
  "HistoryActorType",
];

const INIT_MIGRATION = "20260731000000_init_postgresql";

async function main() {
  const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  const tablesRes = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );
  const tables = tablesRes.rows.map((r) => r.tablename as string);

  const enumsRes = await client.query(
    "SELECT t.typname AS enum_name FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e' ORDER BY t.typname"
  );
  const enums = enumsRes.rows.map((r) => r.enum_name as string);

  const migrationsRes = await client.query(
    `SELECT id, migration_name, started_at, finished_at, applied_steps_count, rolled_back_at, logs
     FROM "_prisma_migrations"
     ORDER BY started_at`
  ).catch((err: Error) => ({ rows: null as null, error: err.message }));

  const locksRes = await client.query(
    "SELECT pid, granted FROM pg_locks WHERE locktype = 'advisory'"
  );

  console.log("=== CONNECTION ===");
  console.log("DIRECT_URL configured:", Boolean(process.env.DIRECT_URL));
  console.log("Host:", process.env.DIRECT_URL?.match(/@([^/]+)/)?.[1] ?? "unknown");

  console.log("\n=== _prisma_migrations ===");
  if (migrationsRes.rows === null) {
    console.log("TABLE_EXISTS: false");
    console.log("ERROR:", (migrationsRes as { error: string }).error);
  } else {
    console.log("TABLE_EXISTS: true");
    console.log("RECORD_COUNT:", migrationsRes.rows.length);
    console.log("RECORDS:", JSON.stringify(migrationsRes.rows, null, 2));
  }

  console.log("\n=== TABLES (public) ===");
  console.log("TOTAL_COUNT:", tables.length);
  console.log("ALL:", tables.join(", ") || "(none)");

  for (const name of EXPECTED_TABLES) {
    console.log(`CHECK ${name}:`, tables.includes(name) ? "EXISTS" : "MISSING");
  }

  console.log("\n=== ENUMS (public) ===");
  console.log("TOTAL_COUNT:", enums.length);
  console.log("ALL:", enums.join(", ") || "(none)");

  for (const name of EXPECTED_ENUMS) {
    console.log(`CHECK ${name}:`, enums.includes(name) ? "EXISTS" : "MISSING");
  }

  if (enums.length > 0) {
    for (const enumName of EXPECTED_ENUMS.filter((e) => enums.includes(e))) {
      const labels = await client.query(
        "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = $1 ORDER BY e.enumsortorder",
        [enumName]
      );
      console.log(`ENUM_VALUES ${enumName}:`, labels.rows.map((r) => r.enumlabel).join(", "));
    }
  }

  console.log("\n=== ADVISORY LOCKS ===");
  console.log(JSON.stringify(locksRes.rows));

  console.log("\n=== SUMMARY ===");
  const requiredTablesOk = [
    "AdminUser",
    "Contract",
    "ContractItem",
    "ContractClause",
    "ShareToken",
    "UploadedFile",
    "GeneratedPdf",
    "CompanySettings",
    "ContractHistory",
  ].every((t) => tables.includes(t));
  const enumsOk = EXPECTED_ENUMS.every((e) => enums.includes(e));
  const migrationRecord = migrationsRes.rows?.find((r) => r.migration_name === INIT_MIGRATION);
  const sqlApplied = requiredTablesOk && enumsOk;
  const migrationRecorded = Boolean(migrationRecord?.finished_at);

  console.log("INIT_SQL_APPLIED:", sqlApplied ? "YES" : "NO");
  console.log("INIT_MIGRATION_RECORDED:", migrationRecorded ? "YES" : "NO");
  console.log("RECOMMENDED_NEXT_STEP:", !sqlApplied
    ? "Apply init migration SQL (db execute or migrate deploy) — do NOT use migrate resolve yet"
    : migrationRecorded
      ? "Schema ready — no migrate resolve needed"
      : "SQL applied but migration history missing — migrate resolve --applied may be needed AFTER user approval");

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

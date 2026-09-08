import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const r = await pool.query(`
  SELECT "contractType", COUNT(*)::int AS count
  FROM "Contract"
  GROUP BY "contractType"
  ORDER BY count DESC
`);
console.log("Contract type distribution:");
console.table(r.rows);

const t = await pool.query(`SELECT COUNT(*)::int AS count FROM "ContractTemplateClause"`);
console.log("Template clause count:", t.rows[0].count);

await pool.end();

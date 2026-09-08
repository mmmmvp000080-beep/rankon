import { config } from "dotenv";
import bcrypt from "bcryptjs";
import pg from "pg";

config({ path: ".env.local" });

const DEFAULT_CONTRACT_PURPOSE =
  "본 계약은 광고주와 랭크온이 네이버 플레이스 마케팅 서비스를 진행하기 위한 계약으로, 서비스 범위와 계약 기간, 비용, 양측의 권리와 의무를 정하는 것을 목적으로 합니다.";

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const passwordHash = await bcrypt.hash("qwer1234", 10);
  const admin = await client.query(
    'SELECT id, username FROM "AdminUser" WHERE username = $1',
    ["vip080"]
  );

  let adminCreated = false;
  if (admin.rows.length === 0) {
    const legacy = await client.query(
      'SELECT id, username FROM "AdminUser" WHERE username = $1',
      ["rankon"]
    );
    if (legacy.rows.length > 0) {
      await client.query(
        'UPDATE "AdminUser" SET username = $1, "passwordHash" = $2, "updatedAt" = NOW() WHERE id = $3',
        ["vip080", passwordHash, legacy.rows[0].id]
      );
    } else {
      const anyAdmin = await client.query('SELECT id FROM "AdminUser" LIMIT 1');
      if (anyAdmin.rows.length > 0) {
        await client.query(
          'UPDATE "AdminUser" SET username = $1, "passwordHash" = $2, "updatedAt" = NOW() WHERE id = $3',
          ["vip080", passwordHash, anyAdmin.rows[0].id]
        );
      } else {
        await client.query(
          'INSERT INTO "AdminUser" (id, username, "passwordHash", "createdAt", "updatedAt") VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW())',
          ["vip080", passwordHash]
        );
        adminCreated = true;
      }
    }
  } else {
    await client.query(
      'UPDATE "AdminUser" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE username = $2',
      [passwordHash, "vip080"]
    );
  }

  const settings = await client.query('SELECT id FROM "CompanySettings" LIMIT 1');
  let settingsCreated = false;
  if (settings.rows.length === 0) {
    await client.query(
      `INSERT INTO "CompanySettings" (
        id, "companyName", "representativeName", "representativeTitle",
        "businessNumber", address, phone, email, "defaultContractPurpose", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      )`,
      [
        "랭크온",
        "관리자",
        "대표",
        "123-45-67890",
        "서울특별시",
        "02-1234-5678",
        "admin@rankon.local",
        DEFAULT_CONTRACT_PURPOSE,
      ]
    );
    settingsCreated = true;
  }

  const adminAfter = await client.query(
    'SELECT id, username FROM "AdminUser" WHERE username = $1',
    ["vip080"]
  );
  const settingsAfter = await client.query(
    'SELECT id, "companyName" FROM "CompanySettings" LIMIT 1'
  );

  console.log("ADMIN_CREATED", adminCreated);
  console.log("ADMIN_EXISTS", adminAfter.rows.length > 0);
  console.log("ADMIN", JSON.stringify(adminAfter.rows[0] ?? null));
  console.log("COMPANY_SETTINGS_CREATED", settingsCreated);
  console.log("COMPANY_SETTINGS_EXISTS", settingsAfter.rows.length > 0);
  console.log("COMPANY_SETTINGS", JSON.stringify(settingsAfter.rows[0] ?? null));

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

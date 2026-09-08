import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const ADMIN_USERNAME = "vip080";
const ADMIN_PASSWORD = "qwer1234";
const LEGACY_ADMIN_USERNAME = "rankon";
const COMPANY_NAME = "랭크온";

type ClauseInput = {
  title: string;
  content: string;
  sortOrder: number;
};

function createSeedPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function getDefaultContractPurposeText(clauses: ClauseInput[]): string {
  return clauses.find((clause) => clause.title === "계약 목적")?.content ?? clauses[0].content;
}

async function ensureAdminUser(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const existing = await prisma.adminUser.findUnique({
    where: { username: ADMIN_USERNAME },
  });
  if (existing) {
    const user = await prisma.adminUser.update({
      where: { id: existing.id },
      data: { passwordHash },
    });
    console.log(`AdminUser updated: ${ADMIN_USERNAME}`);
    return { created: false, user };
  }

  const legacy = await prisma.adminUser.findUnique({
    where: { username: LEGACY_ADMIN_USERNAME },
  });
  if (legacy) {
    const user = await prisma.adminUser.update({
      where: { id: legacy.id },
      data: { username: ADMIN_USERNAME, passwordHash },
    });
    console.log(`AdminUser renamed to ${ADMIN_USERNAME}`);
    return { created: false, user };
  }

  const anyAdmin = await prisma.adminUser.findFirst();
  if (anyAdmin) {
    const user = await prisma.adminUser.update({
      where: { id: anyAdmin.id },
      data: { username: ADMIN_USERNAME, passwordHash },
    });
    console.log(`AdminUser updated to ${ADMIN_USERNAME}`);
    return { created: false, user };
  }

  const user = await prisma.adminUser.create({
    data: { username: ADMIN_USERNAME, passwordHash },
  });
  console.log(`AdminUser created: ${ADMIN_USERNAME}`);
  return { created: true, user };
}

async function ensureCompanySettings(prisma: PrismaClient, clauses: ClauseInput[]) {
  const existing = await prisma.companySettings.findFirst();

  if (existing) {
    console.log("CompanySettings already exists");
    return { created: false, settings: existing };
  }

  const defaultPurpose = getDefaultContractPurposeText(clauses);
  const settings = await prisma.companySettings.create({
    data: {
      companyName: COMPANY_NAME,
      representativeName: "",
      representativeTitle: null,
      businessNumber: "",
      address: "",
      phone: "",
      email: "",
      defaultContractPurpose: defaultPurpose,
      defaultContractPurposeGuarantee: defaultPurpose,
      defaultSignaturePath: null,
    },
  });

  console.log(`CompanySettings created: ${COMPANY_NAME}`);
  return { created: true, settings };
}

async function ensureTemplateClauses(
  prisma: PrismaClient,
  contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT" | "NAVER_PLACE_MONTHLY_GUARANTEE",
  clauses: ClauseInput[]
) {
  const count = await prisma.contractTemplateClause.count({
    where: { contractType, isActive: true },
  });

  if (count > 0) {
    console.log(`ContractTemplateClause already exists for ${contractType}: ${count}`);
    return { created: false, count };
  }

  await prisma.contractTemplateClause.createMany({
    data: clauses.map((clause) => ({
      ...clause,
      contractType,
      isActive: true,
    })),
  });

  console.log(`ContractTemplateClause created for ${contractType}: ${clauses.length}`);
  return { created: true, count: clauses.length };
}

async function main() {
  const { COMMON_TEMPLATE_CLAUSES } = await import("../src/lib/contract-template");
  const prisma = createSeedPrismaClient();

  try {
    await ensureAdminUser(prisma);
    await ensureCompanySettings(prisma, COMMON_TEMPLATE_CLAUSES);
    await ensureTemplateClauses(prisma, "NAVER_PLACE_MONTHLY_MANAGEMENT", COMMON_TEMPLATE_CLAUSES);
    await ensureTemplateClauses(prisma, "NAVER_PLACE_MONTHLY_GUARANTEE", COMMON_TEMPLATE_CLAUSES);

    const [
      adminCount,
      settingsCount,
      contractCount,
      managementTemplateCount,
      guaranteeTemplateCount,
      uploadedFileCount,
      shareTokenCount,
      generatedPdfCount,
    ] = await Promise.all([
      prisma.adminUser.count(),
      prisma.companySettings.count(),
      prisma.contract.count(),
      prisma.contractTemplateClause.count({
        where: { contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT", isActive: true },
      }),
      prisma.contractTemplateClause.count({
        where: { contractType: "NAVER_PLACE_MONTHLY_GUARANTEE", isActive: true },
      }),
      prisma.uploadedFile.count(),
      prisma.shareToken.count(),
      prisma.generatedPdf.count(),
    ]);

    console.log("Seed production summary:");
    console.log(`- AdminUser: ${adminCount}`);
    console.log(`- CompanySettings: ${settingsCount}`);
    console.log(`- Contract: ${contractCount}`);
    console.log(`- ContractTemplateClause (management): ${managementTemplateCount}`);
    console.log(`- ContractTemplateClause (guarantee): ${guaranteeTemplateCount}`);
    console.log(`- UploadedFile: ${uploadedFileCount}`);
    console.log(`- ShareToken: ${shareTokenCount}`);
    console.log(`- GeneratedPdf: ${generatedPdfCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

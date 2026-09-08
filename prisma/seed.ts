import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import { buildContractSnapshot, stableStringify, hashContent, generateToken } from "../src/lib/contract-snapshot";
import { copyTemplateClausesToContract, getDefaultContractPurpose, COMMON_TEMPLATE_CLAUSES } from "../src/lib/contract-template";

function createSeedPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createSeedPrismaClient();

async function createPngSignature(label: string): Promise<string> {
  const dir = path.join(process.cwd(), "storage", "signatures");
  await fs.mkdir(dir, { recursive: true });
  const filename = `seed-${label}-${Date.now()}.png`;
  const filepath = path.join(dir, filename);

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  await fs.writeFile(filepath, png);
  return `signatures/${filename}`;
}

async function createSampleFile(name: string): Promise<{ storedName: string; storagePath: string; mimeType: string; fileSize: number }> {
  const dir = path.join(process.cwd(), "storage", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const storedName = `seed-${name}-${Date.now()}.pdf`;
  const filepath = path.join(dir, storedName);
  const content = Buffer.from("%PDF-1.4 seed sample file");
  await fs.writeFile(filepath, content);
  return {
    storedName,
    storagePath: `uploads/${storedName}`,
    mimeType: "application/pdf",
    fileSize: content.length,
  };
}

async function copyClausesToContract(
  contractId: string,
  contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT" | "NAVER_PLACE_MONTHLY_GUARANTEE" = "NAVER_PLACE_MONTHLY_MANAGEMENT"
) {
  return copyTemplateClausesToContract(contractId, contractType);
}

async function main() {
  await fs.mkdir(path.join(process.cwd(), "storage", "uploads"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "storage", "signatures"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "storage", "pdfs"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "storage", "settings"), { recursive: true });

  await prisma.contractHistory.deleteMany();
  await prisma.generatedPdf.deleteMany();
  await prisma.uploadedFile.deleteMany();
  await prisma.shareToken.deleteMany();
  await prisma.contractClause.deleteMany();
  await prisma.contractItem.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.contractTemplateClause.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.companySettings.deleteMany();

  const passwordHash = await bcrypt.hash("qwer1234", 10);
  await prisma.adminUser.create({
    data: { username: "vip080", passwordHash },
  });

  const defaultPurpose = await getDefaultContractPurpose("NAVER_PLACE_MONTHLY_MANAGEMENT");

  await prisma.companySettings.create({
    data: {
      companyName: "랭크온",
      representativeName: "관리자",
      representativeTitle: "대표",
      businessNumber: "123-45-67890",
      address: "서울특별시",
      phone: "02-1234-5678",
      email: "admin@rankon.local",
      defaultContractPurpose: defaultPurpose,
      defaultContractPurposeGuarantee: defaultPurpose,
    },
  });

  await prisma.contractTemplateClause.createMany({
    data: COMMON_TEMPLATE_CLAUSES.map((c) => ({
      ...c,
      contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT" as const,
      isActive: true,
    })),
  });

  await prisma.contractTemplateClause.createMany({
    data: COMMON_TEMPLATE_CLAUSES.map((c) => ({
      ...c,
      contractType: "NAVER_PLACE_MONTHLY_GUARANTEE" as const,
      isActive: true,
    })),
  });

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const datePart = `${y}${m}${d}`;

  const baseContract = {
    startDate: new Date(today.getFullYear(), today.getMonth(), 1),
    endDate: new Date(today.getFullYear(), today.getMonth() + 6, 0),
    vatIncluded: true,
    contractPurpose: defaultPurpose,
    paymentTerms: "월말 정산, 익월 15일 지급",
    specialTerms: "본 계약은 상호 협의하에 변경될 수 있습니다.",
  };

  const items = [
    { name: "네이버 플레이스 월관리", description: "플레이스 운영 및 최적화", quantity: 1, unitPrice: 500000, amount: 500000, sortOrder: 0 },
  ];

  const guaranteeItems = [
    { name: "월 순위보장", description: "키워드: 강남 맛집", quantity: 1, unitPrice: 800000, amount: 800000, sortOrder: 0 },
  ];

  const draft = await prisma.contract.create({
    data: {
      contractNumber: `RANKON-${datePart}-0001`,
      companyName: "샘플기업 A",
      contactName: "김대표",
      contactTitle: "김담당",
      phone: "010-1111-2222",
      email: "a@sample.com",
      ...baseContract,
      contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT",
      totalAmount: 500000,
      status: "DRAFT",
      items: { create: items },
    },
  });
  await copyClausesToContract(draft.id, "NAVER_PLACE_MONTHLY_MANAGEMENT");
  await prisma.contractHistory.create({ data: { contractId: draft.id, action: "CONTRACT_CREATED", description: "샘플 계약 생성 (작성 중)", actorType: "SYSTEM" } });

  const providerSig = await createPngSignature("provider");
  const providerSigned = await prisma.contract.create({
    data: {
      contractNumber: `RANKON-${datePart}-0002`,
      companyName: "샘플기업 B",
      contactName: "이대표",
      contactTitle: "이담당",
      phone: "010-3333-4444",
      ...baseContract,
      contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT",
      totalAmount: 500000,
      status: "PROVIDER_SIGNED",
      providerSignerName: "관리자",
      providerSignerTitle: "대표",
      providerSignaturePath: providerSig,
      providerSignedAt: new Date(),
      items: { create: items },
    },
  });
  await copyClausesToContract(providerSigned.id, "NAVER_PLACE_MONTHLY_MANAGEMENT");
  await prisma.contractHistory.create({ data: { contractId: providerSigned.id, action: "PROVIDER_SIGNED", description: "공급자 서명 완료", actorType: "ADMIN" } });

  const providerSig2 = await createPngSignature("provider2");
  const pending = await prisma.contract.create({
    data: {
      contractNumber: `RANKON-${datePart}-0003`,
      companyName: "샘플기업 C",
      contactName: "박대표",
      contactTitle: "박담당",
      phone: "010-5555-6666",
      ...baseContract,
      contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT",
      totalAmount: 500000,
      status: "CUSTOMER_PENDING",
      providerSignerName: "관리자",
      providerSignerTitle: "대표",
      providerSignaturePath: providerSig2,
      providerSignedAt: new Date(),
      items: { create: items },
    },
  });
  await copyClausesToContract(pending.id, "NAVER_PLACE_MONTHLY_MANAGEMENT");
  const contractToken = generateToken();
  await prisma.shareToken.create({
    data: { contractId: pending.id, token: contractToken, type: "CONTRACT_SIGN", isActive: true },
  });
  await prisma.contractHistory.create({ data: { contractId: pending.id, action: "CONTRACT_LINK_CREATED", description: "고객 계약 링크 생성", actorType: "ADMIN" } });

  const providerSig3 = await createPngSignature("provider3");
  const customerSig = await createPngSignature("customer");
  const completed = await prisma.contract.create({
    data: {
      contractNumber: `RANKON-${datePart}-0004`,
      companyName: "샘플기업 D",
      contactName: "최대표",
      contactTitle: "최담당",
      phone: "010-7777-8888",
      ...baseContract,
      contractType: "NAVER_PLACE_MONTHLY_GUARANTEE",
      totalAmount: 800000,
      status: "COMPLETED",
      providerSignerName: "관리자",
      providerSignerTitle: "대표",
      providerSignaturePath: providerSig3,
      providerSignedAt: new Date(Date.now() - 86400000),
      customerSignerName: "최담당",
      customerSignerTitle: "대표",
      customerSignaturePath: customerSig,
      customerSignedAt: new Date(),
      lockedAt: new Date(),
      items: { create: guaranteeItems },
    },
    include: { items: true },
  });
  const completedClauses = await copyClausesToContract(completed.id, "NAVER_PLACE_MONTHLY_GUARANTEE");

  const snapshot = buildContractSnapshot(completed, completed.items, completedClauses);
  const snapshotStr = stableStringify(snapshot);
  const contentHash = hashContent(snapshotStr);

  await prisma.contract.update({
    where: { id: completed.id },
    data: { signedSnapshot: snapshotStr, signedContentHash: contentHash },
  });

  await prisma.shareToken.create({
    data: { contractId: completed.id, token: generateToken(), type: "CONTRACT_SIGN", isActive: true },
  });

  const sampleFile = await createSampleFile("business-license");
  await prisma.uploadedFile.create({
    data: {
      contractId: completed.id,
      category: "BUSINESS_LICENSE",
      originalName: "사업자등록증.pdf",
      storedName: sampleFile.storedName,
      storagePath: sampleFile.storagePath,
      mimeType: sampleFile.mimeType,
      fileSize: sampleFile.fileSize,
      uploadedBy: "CUSTOMER",
    },
  });

  await prisma.contractHistory.createMany({
    data: [
      { contractId: completed.id, action: "PROVIDER_SIGNED", description: "공급자 서명", actorType: "ADMIN" },
      { contractId: completed.id, action: "CUSTOMER_SIGNED", description: "고객 서명 완료", actorType: "CUSTOMER" },
      { contractId: completed.id, action: "FILE_UPLOADED", description: "사업자등록증 제출", actorType: "CUSTOMER" },
    ],
  });

  console.log("Seed completed:");
  console.log("- Admin: vip080 / qwer1234");
  console.log("- Template clauses:", COMMON_TEMPLATE_CLAUSES.length);
  console.log("- Sample contracts: 4");
  console.log(`- Customer pending token: /contract/${contractToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

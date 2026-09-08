/**
 * Directly invokes API logic (no HTTP) to surface real exceptions.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { storeSignatureDataUrl } = await import("../src/lib/signature-storage");
  const { saveUploadedFile } = await import("../src/lib/uploaded-file-storage");
  const { generateContractPdf } = await import("../src/lib/pdf/generator");
  const { contractToPdfInput } = await import("../src/lib/pdf/contract-input");
  const { generateSignedPdfFromSnapshot } = await import("../src/lib/pdf/pdf-service");
  const { loadContractWithItemsAndClauses } = await import("../src/lib/contract-load");
  const { storage } = await import("../src/lib/storage");

  function logErr(label: string, err: unknown) {
    console.error(`\n=== ${label} EXCEPTION ===`);
    console.error(err);
    if (err instanceof Error) {
      console.error(err.stack);
      console.error(err.message);
      console.error(err.cause);
    }
  }

  function testImageBuffer(): Buffer {
    return Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
  }

  function signatureDataUrl(): string {
    const png = testImageBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  }

  async function getCompanySettings() {
    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          companyName: "랭크온",
          representativeName: "관리자",
          representativeTitle: "대표",
          businessNumber: "",
          address: "",
          phone: "",
          email: "",
        },
      });
    }
    return settings;
  }

  async function getOrCreateContractId(): Promise<string> {
    const existing = await prisma.contract.findFirst({ orderBy: { createdAt: "desc" } });
    if (existing) return existing.id;

    const today = new Date();
    const contract = await prisma.contract.create({
      data: {
        contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT",
        companyName: "진단테스트",
        representativeName: "홍길동",
        phone: "010-1234-5678",
        startDate: new Date(today.getFullYear(), today.getMonth(), 1),
        endDate: new Date(today.getFullYear(), today.getMonth() + 6, 0),
        totalAmount: 1000000,
        vatIncluded: true,
        status: "DRAFT",
        contractNumber: `TEST-${Date.now()}`,
      },
    });
    return contract.id;
  }

  async function testProviderSignature(contractId: string) {
    console.log("\n=== provider-signature logic ===");
    try {
      console.log("[provider-signature] storeSignatureDataUrl START");
      const signaturePath = storeSignatureDataUrl(signatureDataUrl());
      console.log("[provider-signature] storeSignatureDataUrl SUCCESS", { length: signaturePath.length });

      console.log("[provider-signature] prisma.contract.update START");
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.contract.update({
          where: { id: contractId },
          data: {
            providerSignerName: "테스트",
            providerSignerTitle: "대표",
            providerSignaturePath: signaturePath,
            providerSignedAt: new Date(),
            status: "PROVIDER_SIGNED",
          },
        });
        await tx.contractHistory.create({
          data: {
            contractId,
            action: "PROVIDER_SIGNED",
            description: "진단 테스트 서명",
            actorType: "ADMIN",
          },
        });
        return result;
      });
      console.log("[provider-signature] prisma.contract.update SUCCESS", { id: updated.id, status: updated.status });
    } catch (err) {
      logErr("provider-signature", err);
    }
  }

  async function testFileUpload(contractId: string) {
    console.log("\n=== submit/file upload logic ===");
    try {
      let token = await prisma.shareToken.findFirst({
        where: { contractId, type: "FILE_UPLOAD", isActive: true },
      });
      if (!token) {
        token = await prisma.shareToken.create({
          data: { contractId, token: `diag-${Date.now()}`, type: "FILE_UPLOAD", isActive: true },
        });
      }

      const png = testImageBuffer();
      const file = new File([png], "test.png", { type: "image/png" });
      const buffer = Buffer.from(await file.arrayBuffer());

      console.log("[submit] blob put START", { hasToken: !!process.env.BLOB_READ_WRITE_TOKEN });
      const stored = await saveUploadedFile(contractId, file, buffer);
      console.log("[submit] blob put SUCCESS", stored);

      console.log("[submit] prisma.uploadedFile.create START");
      const record = await prisma.uploadedFile.create({
        data: {
          contractId,
          category: "OTHER",
          originalName: file.name,
          storedName: stored.storedName,
          storagePath: stored.storagePath,
          mimeType: file.type,
          fileSize: file.size,
          uploadedBy: "CUSTOMER",
        },
      });
      console.log("[submit] prisma.uploadedFile.create SUCCESS", { id: record.id });
    } catch (err) {
      logErr("submit/file upload", err);
    }
  }

  async function testDraftPdf(contractId: string) {
    console.log("\n=== draft PDF logic ===");
    try {
      console.log("[draft-pdf] loadContract START");
      const contract = await loadContractWithItemsAndClauses(contractId);
      if (!contract) throw new Error("contract not found");
      console.log("[draft-pdf] loadContract SUCCESS");

      console.log("[draft-pdf] generateContractPdf START");
      const company = await getCompanySettings();
      const pdfBuffer = await generateContractPdf("DRAFT", company, contractToPdfInput(contract));
      console.log("[draft-pdf] generateContractPdf SUCCESS", { bytes: pdfBuffer.length });

      console.log("[draft-pdf] storage.save START");
      const saved = await storage.save("pdfs", pdfBuffer, ".pdf");
      console.log("[draft-pdf] storage.save SUCCESS", saved);
    } catch (err) {
      logErr("draft-pdf", err);
    }
  }

  async function testSignedPdf(contractId: string) {
    console.log("\n=== shared signed PDF logic ===");
    try {
      const contract = await prisma.contract.findUnique({ where: { id: contractId } });
      console.log("[signed-pdf] contract", {
        id: contract?.id,
        status: contract?.status,
        hasSnapshot: !!contract?.signedSnapshot,
        providerSigned: !!contract?.providerSignedAt,
        customerSigned: !!contract?.customerSignedAt,
      });

      console.log("[signed-pdf] generateSignedPdfFromSnapshot START");
      const { buffer } = await generateSignedPdfFromSnapshot(contractId);
      console.log("[signed-pdf] generateSignedPdfFromSnapshot SUCCESS", { bytes: buffer.length });
    } catch (err) {
      logErr("signed-pdf", err);
    }
  }

  console.log("ENV", {
    VERCEL: process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV,
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  });

  const contractId = await getOrCreateContractId();
  console.log("CONTRACT_ID", contractId);

  await testProviderSignature(contractId);
  await testFileUpload(contractId);
  await testDraftPdf(contractId);
  await testSignedPdf(contractId);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("\n=== SCRIPT_FATAL EXCEPTION ===");
  console.error(err);
  if (err instanceof Error) {
    console.error(err.stack);
    console.error(err.message);
    console.error(err.cause);
  }
  process.exit(1);
});

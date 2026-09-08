import { prisma } from "@/lib/prisma";
import { ContractSnapshot } from "@/lib/contract-snapshot";
import { generateContractPdf, snapshotToPdfInput } from "@/lib/pdf/generator";
import { contractToPdfInput } from "@/lib/pdf/contract-input";
import { loadContractWithItemsAndClauses } from "@/lib/contract-load";
import { PdfCompanyInfo } from "@/lib/pdf/types";
import type { PdfTiming } from "@/lib/pdf/pdf-timing";
import { PROVIDER_COMPANY_DISPLAY_NAME } from "@/lib/provider-company-display";

async function getCompanySettings(): Promise<PdfCompanyInfo> {
  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({
      data: {
        companyName: PROVIDER_COMPANY_DISPLAY_NAME,
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

export async function generateDraftPdfForContractId(contractId: string, timing?: PdfTiming) {
  const contract = await loadContractWithItemsAndClauses(contractId);
  if (!contract) throw new Error("계약을 찾을 수 없습니다");
  const company = await getCompanySettings();
  const buffer = await generateContractPdf("DRAFT", company, contractToPdfInput(contract), timing);
  return { buffer, contract };
}

export async function generateSignedPdfFromSnapshot(contractId: string, timing?: PdfTiming) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new Error("계약을 찾을 수 없습니다");
  if (contract.status !== "COMPLETED" || !contract.signedSnapshot) {
    throw new Error("양측 서명이 완료된 계약만 최종 PDF를 생성할 수 있습니다");
  }
  if (!contract.providerSignedAt || !contract.customerSignedAt) {
    throw new Error("회사 및 고객 서명이 모두 완료되어야 합니다");
  }

  let snapshot: ContractSnapshot;
  try {
    snapshot = JSON.parse(contract.signedSnapshot) as ContractSnapshot;
  } catch (err) {
    console.error("[Signed PDF Snapshot Parse Failed]", { contractId, error: err });
    throw new Error("서명 스냅샷을 해석할 수 없습니다");
  }
  const company = await getCompanySettings();
  const snapshotCompany: PdfCompanyInfo = {
    ...company,
    phone: snapshot.providerPhone ?? company.phone,
    businessNumber: snapshot.providerBusinessNumber ?? company.businessNumber,
    address: snapshot.providerAddress ?? company.address,
  };
  const pdfData = snapshotToPdfInput(snapshot, {
    providerSignaturePath: contract.providerSignaturePath,
    customerSignaturePath: contract.customerSignaturePath,
    customerSignerName: contract.customerSignerName,
    customerSignerTitle: contract.customerSignerTitle,
    customerSignedAt: contract.customerSignedAt?.toISOString(),
    signedContentHash: contract.signedContentHash,
    status: "COMPLETED",
  });

  const buffer = await generateContractPdf("SIGNED", snapshotCompany, pdfData, timing);
  return { buffer, contract, snapshot };
}

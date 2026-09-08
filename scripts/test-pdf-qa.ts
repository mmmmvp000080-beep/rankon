import fs from "fs/promises";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { generateContractPdf } from "../src/lib/pdf/generator";
import { createPngSignature } from "./pdf-test-utils";

const OUT_DIR = path.join(process.cwd(), "storage", "pdf-qa");

const company = {
  companyName: "랭크온",
  representativeName: "홍길동",
  representativeTitle: "대표",
  businessNumber: "123-45-67890",
  address: "서울특별시 강남구",
  phone: "010-1234-5678",
  email: "contact@rankon.kr",
};

const baseClauses = [
  {
    title: "계약 목적",
    content:
      "본 계약은 랭크온과 고객 간의 네이버 플레이스 마케팅 서비스 제공 및 운영에 관한 권리·의무를 명확히 하기 위하여 체결합니다.",
    sortOrder: 0,
  },
  {
    title: "서비스 내용",
    content:
      "계약서에 선택된 상품에 따라 서비스를 제공합니다.\n\n■ 월관리\n- 네이버 플레이스 관리\n\n■ 월 순위보장\n- 키워드 기준",
    sortOrder: 1,
  },
  {
    title: "서비스 내용",
    content:
      "랭크온은 네이버 플레이스 계정 운영, 리뷰·게시글·이미지 관리 등 계약서에 명시된 서비스를 성실히 제공합니다.",
    sortOrder: 1,
  },
  {
    title: "계약기간",
    content: "계약기간은 계약서에 명시된 시작일부터 종료일까지이며, 연장은 양 당사자 합의로 합니다.",
    sortOrder: 2,
  },
  {
    title: "비용 및 결제",
    content: "고객은 계약 금액을 약정된 결제 조건에 따라 지급하며, 세금계산서는 관련 법령에 따라 발행합니다.",
    sortOrder: 3,
  },
  {
    title: "기타",
    content: "본 계약에 명시되지 않은 사항은 상호 협의하며, 분쟁 발생 시 관련 법령 및 관할 법원에 따릅니다.",
    sortOrder: 4,
  },
];

async function writePdf(name: string, type: "DRAFT" | "SIGNED", contract: Parameters<typeof generateContractPdf>[2]) {
  const buffer = await generateContractPdf(type, company, contract);
  const filePath = path.join(OUT_DIR, name);
  await fs.writeFile(filePath, buffer);
  const doc = await PDFDocument.load(buffer);
  return { path: filePath, pages: doc.getPageCount(), bytes: buffer.length };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const results: Array<{ name: string; pages: number; bytes: number; path: string }> = [];

  results.push({
    name: "1-management-draft.pdf",
    ...(await writePdf("1-management-draft.pdf", "DRAFT", {
      contractNumber: "RANKON-20260731-0015",
      companyName: "강남카페",
      representativeName: "김대표",
      phone: "010-1234-5678",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      totalAmount: 550000,
      vatIncluded: true,
      contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT",
      status: "CUSTOMER_PENDING",
      items: [{ name: "네이버 플레이스 월관리", description: null, quantity: 1, unitPrice: 550000, amount: 550000 }],
      clauses: baseClauses,
      specialTerms: null,
      providerSignerName: "홍길동",
      providerSignedAt: new Date().toISOString(),
    })),
  });

  results.push({
    name: "2-guarantee-draft.pdf",
    ...(await writePdf("2-guarantee-draft.pdf", "DRAFT", {
      contractNumber: "RANKON-20260731-0016",
      companyName: "맛집연구소",
      representativeName: "이대표",
      phone: "010-2222-3333",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 60).toISOString(),
      totalAmount: 1100000,
      vatIncluded: true,
      contractType: "NAVER_PLACE_MONTHLY_GUARANTEE",
      status: "CUSTOMER_PENDING",
      paymentTerms: "상위 5위 진입 확인 후 입금",
      items: [{ name: "월 순위보장", description: null, quantity: 1, unitPrice: 1100000, amount: 1100000 }],
      clauses: baseClauses,
      specialTerms: "강남 맛집",
      providerSignerName: "홍길동",
      providerSignedAt: new Date().toISOString(),
    })),
  });

  results.push({
    name: "3-no-special-terms.pdf",
    ...(await writePdf("3-no-special-terms.pdf", "DRAFT", {
      contractNumber: "RANKON-20260731-0017",
      companyName: "테스트업체A",
      representativeName: "박대표",
      phone: "010-4444-5555",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      totalAmount: 330000,
      vatIncluded: false,
      contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT",
      status: "DRAFT",
      items: [{ name: "월관리", description: null, quantity: 1, unitPrice: 330000, amount: 330000 }],
      clauses: baseClauses.slice(0, 3),
      specialTerms: null,
    })),
  });

  results.push({
    name: "4-long-special-terms.pdf",
    ...(await writePdf("4-long-special-terms.pdf", "DRAFT", {
      contractNumber: "RANKON-20260731-0018",
      companyName: "테스트업체B",
      representativeName: "최대표",
      phone: "010-6666-7777",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 90).toISOString(),
      totalAmount: 880000,
      vatIncluded: true,
      contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT",
      status: "PROVIDER_SIGNED",
      items: [{ name: "월관리", description: null, quantity: 1, unitPrice: 880000, amount: 880000 }],
      clauses: baseClauses,
      specialTerms:
        "1. 본 계약은 3개월 단위로 자동 연장되며, 어느 일방이 30일 전 서면 통지 시 해지할 수 있습니다.\n2. 마케팅 성과 보고서는 매월 5영업일 이내 이메일로 제공합니다.\n3. 추가 키워드 운영은 별도 협의 후 진행하며, 비용은 별도 청구합니다.\n4. 고객은 랭크온의 운영을 위해 필요한 계정 권한을 계약 기간 동안 유지해야 합니다.",
      providerSignerName: "홍길동",
      providerSignedAt: new Date().toISOString(),
    })),
  });

  const providerSig = await createPngSignature("랭크온");
  const customerSig = await createPngSignature("고객");
  const signedAt = new Date().toISOString();
  const hash = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";

  results.push({
    name: "5-signed-complete.pdf",
    ...(await writePdf("5-signed-complete.pdf", "SIGNED", {
      contractNumber: "RANKON-20260731-0019",
      companyName: "완료테스트",
      representativeName: "정대표",
      phone: "010-8888-9999",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      totalAmount: 660000,
      vatIncluded: true,
      contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT",
      status: "COMPLETED",
      items: [{ name: "월관리", description: null, quantity: 1, unitPrice: 660000, amount: 660000 }],
      clauses: baseClauses,
      specialTerms: null,
      providerSignerName: "홍길동",
      providerSignedAt: signedAt,
      providerSignaturePath: providerSig,
      customerSignerName: "정대표",
      customerSignedAt: signedAt,
      customerSignaturePath: customerSig,
      signedContentHash: hash,
    })),
  });

  console.log("PDF QA Results:");
  for (const r of results) {
    console.log(`  ${r.name}: ${r.pages} pages, ${r.bytes} bytes`);
    console.log(`    ${r.path}`);
  }
}

main().catch((err) => {
  console.error("FAIL", err);
  process.exit(1);
});

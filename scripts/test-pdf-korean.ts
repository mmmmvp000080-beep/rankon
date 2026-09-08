import fs from "fs/promises";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { generateContractPdf } from "../src/lib/pdf/generator";

async function main() {
  const company = {
    companyName: "랭크온",
    representativeName: "홍길동",
    representativeTitle: "대표",
    businessNumber: "123-45-67890",
    address: "서울특별시 강남구",
    phone: "010-1234-5678",
    email: "contact@rankon.kr",
  };

  const contract = {
    contractNumber: "RANKON-TEST-0001",
    companyName: "테스트 고객 업체",
    representativeName: "김대표",
    contactName: "이담당",
    phone: "010-9999-8888",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    totalAmount: 1100000,
    vatIncluded: true,
    contractType: "NAVER_PLACE_MONTHLY_GUARANTEE",
    status: "DRAFT",
    items: [
      {
        name: "월 순위보장",
        description: null,
        quantity: 1,
        unitPrice: 1100000,
        amount: 1100000,
      },
    ],
    clauses: [
      { title: "계약 목적", content: "본 계약은 랭크온과 고객 간의 네이버 플레이스 마케팅 서비스 계약을 목적으로 합니다.", sortOrder: 0 },
      { title: "특약사항", content: "관리자가 입력한 특약사항 본문입니다.", sortOrder: 9 },
    ],
    specialTerms: "보장키워드: 강남 맛집",
  };

  const buffer = await generateContractPdf("DRAFT", company, contract);
  const out = path.join(process.cwd(), "storage", "test-korean-draft.pdf");
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, buffer);

  const doc = await PDFDocument.load(buffer);
  console.log("OK", out, buffer.length, "bytes", "pages=", doc.getPageCount());
}

main().catch((err) => {
  console.error("FAIL", err);
  process.exit(1);
});

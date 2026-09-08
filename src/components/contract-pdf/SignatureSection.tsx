import type { ReactNode } from "react";
import type { ContractPdfViewModel, PdfSignatureParty } from "@/lib/pdf-html/types";
import { buildCustomerSignatureRows, buildProviderSignatureRows } from "@/lib/signature-details";
import { esc } from "./utils";

interface Props {
  data: ContractPdfViewModel;
}

function DetailRows({ rows }: { rows: ReturnType<typeof buildProviderSignatureRows> }) {
  return (
    <>
      {rows.map((row, index) => (
        <div key={index} className={`sig-detail${row.hidden ? " is-empty" : ""}`}>
          <span className="sig-detail-label">{esc(row.label)}</span>
          <span className="sig-detail-value">{esc(row.value)}</span>
        </div>
      ))}
    </>
  );
}

function SignatureCol({
  role,
  party,
  details,
}: {
  role: string;
  party: PdfSignatureParty;
  details: ReactNode;
}) {
  return (
    <div className="signature-col">
      <div className="sig-role">{esc(role)}</div>
      <div className="sig-name">{esc(party.name)}</div>
      <div className="sig-details">{details}</div>
      <div className="sig-label">전자서명</div>
      <div className="sig-box">
        {party.showImage && party.imageDataUrl ? (
          <img src={party.imageDataUrl} alt="서명" />
        ) : (
          <span className="sig-pending">{party.signedAt ? "서명 완료" : "서명 대기"}</span>
        )}
      </div>
      <div className="sig-date">{party.signedAt ? `서명일시 ${esc(party.signedAt)}` : "서명일시 —"}</div>
    </div>
  );
}

export function SignatureSection({ data }: Props) {
  const signed = data.type === "SIGNED";
  return (
    <section className="signature-section">
      <h2 className="signature-title">{signed ? "전자서명 완료" : "전자서명"}</h2>
      <p className="signature-subtitle">
        {signed
          ? "양 당사자는 계약 내용을 확인하고 아래와 같이 전자서명을 완료했습니다."
          : "계약 내용 확인 후 아래 영역에 전자서명이 진행됩니다."}
      </p>
      <div className="signature-grid">
        <SignatureCol
          role="회사"
          party={data.signatures.provider}
          details={<DetailRows rows={buildProviderSignatureRows(data.signatures.provider)} />}
        />
        <SignatureCol
          role="고객"
          party={data.signatures.customer}
          details={<DetailRows rows={buildCustomerSignatureRows(data.signatures.customer)} />}
        />
      </div>
    </section>
  );
}

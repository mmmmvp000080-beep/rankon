import type { ContractPdfViewModel } from "@/lib/pdf-html/types";
import { esc } from "./utils";

interface Props {
  data: ContractPdfViewModel;
}

export function ContractVerification({ data }: Props) {
  if (!data.verification) return null;
  const v = data.verification;
  return (
    <section className="verification">
      <h2 className="section-title">전자계약 기록</h2>
      <div className="verification-grid">
        {v.completedAt && (
          <>
            <span className="verification-label">계약 체결일시</span>
            <span className="verification-value">{esc(v.completedAt)}</span>
          </>
        )}
        <span className="verification-label">문서 식별번호</span>
        <span className="verification-value">{esc(v.contractNumber)}</span>
        {v.sha256 && (
          <>
            <span className="verification-label">문서 SHA-256</span>
            <span className="verification-value verification-hash">{esc(v.sha256)}</span>
          </>
        )}
        <span className="verification-label">계약 상태</span>
        <span className="verification-value">{esc(v.statusLabel)}</span>
      </div>
    </section>
  );
}

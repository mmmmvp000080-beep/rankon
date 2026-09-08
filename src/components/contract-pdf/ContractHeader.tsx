import type { ContractPdfViewModel } from "@/lib/pdf-html/types";
import {
  PROVIDER_COMPANY_DISPLAY_NAME,
  PROVIDER_COMPANY_PDF_HEADER_TAG,
} from "@/lib/provider-company-display";
import { esc } from "./utils";

interface Props {
  data: ContractPdfViewModel;
}

export function ContractHeader({ data }: Props) {
  return (
    <>
      {data.type === "DRAFT" && <div className="draft-badge">DRAFT · 서명 전 초안</div>}
      <header className="hero-header">
        <div className="hero-brand">
          {data.logoDataUrl ? (
            <img src={data.logoDataUrl} alt={PROVIDER_COMPANY_DISPLAY_NAME} />
          ) : (
            <strong>{PROVIDER_COMPANY_DISPLAY_NAME}</strong>
          )}
          <div className="hero-brand-tag">{PROVIDER_COMPANY_PDF_HEADER_TAG}</div>
        </div>
        <div className="hero-meta">
          <div className="hero-meta-row">
            <span className="hero-meta-label">계약번호</span>
            <span className="hero-meta-value">{esc(data.contractNumber)}</span>
          </div>
          <div className="hero-meta-row">
            <span className="hero-meta-label">작성일</span>
            <span className="hero-meta-value">{esc(new Date(data.generatedAt).toLocaleDateString("ko-KR"))}</span>
          </div>
          <div className="hero-meta-row">
            <span className="hero-meta-label">계약상태</span>
            <span className="hero-meta-value">{esc(data.statusLabel)}</span>
          </div>
        </div>
      </header>
      <div className="hero-title">
        <h1>
          {esc(data.titleLine1)}
          <br />
          {esc(data.titleLine2)}
        </h1>
      </div>
      <p className="hero-intro">{esc(data.introLine)}</p>
    </>
  );
}

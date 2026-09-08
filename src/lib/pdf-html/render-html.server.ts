import "server-only";
import type { ContractPdfViewModel } from "./types";
import { getContractPdfStyles } from "./styles";
import {
  buildCustomerSignatureRows,
  buildProviderSignatureRows,
} from "@/lib/signature-details";
import {
  PROVIDER_COMPANY_DISPLAY_NAME,
  PROVIDER_COMPANY_PDF_HEADER_TAG,
} from "@/lib/provider-company-display";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderHeader(data: ContractPdfViewModel): string {
  const draftBadge =
    data.type === "DRAFT" ? `<div class="draft-badge">DRAFT · 서명 전 초안</div>` : "";
  const logo = data.logoDataUrl
    ? `<img src="${data.logoDataUrl}" alt="${PROVIDER_COMPANY_DISPLAY_NAME}" />`
    : `<strong>${PROVIDER_COMPANY_DISPLAY_NAME}</strong>`;
  const writtenAt = escapeHtml(new Date(data.generatedAt).toLocaleDateString("ko-KR"));

  return `${draftBadge}
<header class="hero-header">
  <div class="hero-brand">
    ${logo}
    <div class="hero-brand-tag">${PROVIDER_COMPANY_PDF_HEADER_TAG}</div>
  </div>
  <div class="hero-meta">
    <div class="hero-meta-row">
      <span class="hero-meta-label">계약번호</span>
      <span class="hero-meta-value">${escapeHtml(data.contractNumber)}</span>
    </div>
    <div class="hero-meta-row">
      <span class="hero-meta-label">작성일</span>
      <span class="hero-meta-value">${writtenAt}</span>
    </div>
    <div class="hero-meta-row">
      <span class="hero-meta-label">계약상태</span>
      <span class="hero-meta-value">${escapeHtml(data.statusLabel)}</span>
    </div>
  </div>
</header>
<div class="hero-title">
  <h1>${escapeHtml(data.titleLine1)}<br />${escapeHtml(data.titleLine2)}</h1>
</div>
<p class="hero-intro">${escapeHtml(data.introLine)}</p>`;
}

function renderSummary(data: ContractPdfViewModel): string {
  return `<section>
  <h2 class="section-title">계약 요약</h2>
  <div class="panel">
    <div class="summary-grid">
      <div>
        <span class="field-label">고객사</span>
        <span class="field-value">${escapeHtml(data.customerCompany)}</span>
      </div>
      <div>
        <span class="field-label">계약 상품</span>
        <span class="field-value">${escapeHtml(data.productName)}</span>
      </div>
      <div>
        <span class="field-label">대표자</span>
        <span class="field-value">${escapeHtml(data.representativeName)}</span>
      </div>
      <div>
        <span class="field-label">계약기간</span>
        <span class="field-value">${escapeHtml(data.contractPeriod)}</span>
      </div>
      <div>
        <span class="field-label">계약금액</span>
        <span class="field-value field-value-accent">${escapeHtml(data.totalAmount)} (${escapeHtml(data.vatLabel)})</span>
      </div>
    </div>
  </div>
</section>`;
}

function renderServiceConditions(data: ContractPdfViewModel): string {
  const listClass = data.isGuarantee ? "service-list single-col" : "service-list";
  const items = data.serviceItems
    .map((item) => `<li class="service-item">${escapeHtml(item)}</li>`)
    .join("\n");

  return `<section>
  <h2 class="section-title">서비스 조건</h2>
  <div class="panel">
    <div class="service-type-label">서비스 유형</div>
    <div class="service-type-value">${escapeHtml(data.serviceTypeLabel)}</div>
    <div class="service-scope-label">${escapeHtml(data.serviceScopeTitle)}</div>
    <ul class="${listClass}">
      ${items}
    </ul>
  </div>
</section>`;
}

function renderClauses(data: ContractPdfViewModel): string {
  if (data.clauses.length === 0) return "";
  const clauses = data.clauses
    .map(
      (clause) => `<div class="clause">
  <div class="clause-number">${escapeHtml(clause.num)}</div>
  <div class="clause-content">
    <h3>${escapeHtml(clause.title)}</h3>
    <p>${escapeHtml(clause.content)}</p>
  </div>
</div>`
    )
    .join("\n");

  return `<section>
  <h2 class="section-title">계약 조항</h2>
  ${clauses}
</section>`;
}

function renderSpecialTerms(data: ContractPdfViewModel): string {
  const body = data.specialTerms
    ? `<div class="special-content">${escapeHtml(data.specialTerms)}</div>`
    : `<div class="special-empty">별도 특약사항 없음</div>`;

  return `<section>
  <h2 class="section-title">특약사항</h2>
  <div class="panel">
    ${body}
  </div>
</section>`;
}

function renderDetailRows(rows: ReturnType<typeof buildProviderSignatureRows>): string {
  return rows
    .map((row) => {
      const hiddenClass = row.hidden ? " is-empty" : "";
      return `<div class="sig-detail${hiddenClass}"><span class="sig-detail-label">${escapeHtml(row.label)}</span><span class="sig-detail-value">${escapeHtml(row.value)}</span></div>`;
    })
    .join("\n");
}

function renderSignatureCol(
  role: string,
  party: ContractPdfViewModel["signatures"]["provider"],
  detailsHtml: string
): string {
  const sigContent =
    party.showImage && party.imageDataUrl
      ? `<img src="${party.imageDataUrl}" alt="서명" />`
      : `<span class="sig-pending">${party.signedAt ? "서명 완료" : "서명 대기"}</span>`;
  const sigDate = party.signedAt
    ? `서명일시 ${escapeHtml(party.signedAt)}`
    : "서명일시 —";

  return `<div class="signature-col">
  <div class="sig-role">${escapeHtml(role)}</div>
  <div class="sig-name">${escapeHtml(party.name)}</div>
  <div class="sig-details">${detailsHtml}</div>
  <div class="sig-label">전자서명</div>
  <div class="sig-box">${sigContent}</div>
  <div class="sig-date">${sigDate}</div>
</div>`;
}

function renderSignatureSection(data: ContractPdfViewModel): string {
  const signed = data.type === "SIGNED";
  const title = signed ? "전자서명 완료" : "전자서명";
  const subtitle = signed
    ? "양 당사자는 계약 내용을 확인하고 아래와 같이 전자서명을 완료했습니다."
    : "계약 내용 확인 후 아래 영역에 전자서명이 진행됩니다.";

  return `<section class="signature-section">
  <h2 class="signature-title">${title}</h2>
  <p class="signature-subtitle">${subtitle}</p>
  <div class="signature-grid">
    ${renderSignatureCol("회사", data.signatures.provider, renderDetailRows(buildProviderSignatureRows(data.signatures.provider)))}
    ${renderSignatureCol("고객", data.signatures.customer, renderDetailRows(buildCustomerSignatureRows(data.signatures.customer)))}
  </div>
</section>`;
}

function renderVerification(data: ContractPdfViewModel): string {
  if (!data.verification) return "";
  const v = data.verification;
  const completedAt = v.completedAt
    ? `<span class="verification-label">계약 체결일시</span>
    <span class="verification-value">${escapeHtml(v.completedAt)}</span>`
    : "";
  const sha256 = v.sha256
    ? `<span class="verification-label">문서 SHA-256</span>
    <span class="verification-value verification-hash">${escapeHtml(v.sha256)}</span>`
    : "";

  return `<section class="verification">
  <h2 class="section-title">전자계약 기록</h2>
  <div class="verification-grid">
    ${completedAt}
    <span class="verification-label">문서 식별번호</span>
    <span class="verification-value">${escapeHtml(v.contractNumber)}</span>
    ${sha256}
    <span class="verification-label">계약 상태</span>
    <span class="verification-value">${escapeHtml(v.statusLabel)}</span>
  </div>
</section>`;
}

export function renderContractHtml(data: ContractPdfViewModel): string {
  const styles = getContractPdfStyles(
    data.fontRegularUrl,
    data.fontMediumUrl,
    data.fontSemiBoldUrl,
    data.fontBoldUrl
  );

  const body = `<div class="document">
${renderHeader(data)}
${renderSummary(data)}
${renderServiceConditions(data)}
${renderClauses(data)}
${renderSpecialTerms(data)}
${renderSignatureSection(data)}
${renderVerification(data)}
</div>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.contractNumber)}</title>
  <style>${styles}</style>
</head>
<body>${body}</body>
</html>`;
}

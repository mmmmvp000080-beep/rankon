"use client";

import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { ELECTRONIC_CONTRACT_NOTICE } from "@/lib/constants";
import { displayProviderCompanyInText } from "@/lib/provider-company-display";
import {
  buildCustomerSignatureRows,
  buildProviderSignatureRows,
  SignatureDetailRow,
} from "@/lib/signature-details";

interface ContractItem {
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface ContractClause {
  id?: string;
  title: string;
  content: string;
}

interface PartySignature {
  role: string;
  companyName: string;
  representativeName: string;
  phone?: string | null;
  businessNumber?: string | null;
  corporateRegistrationNumber?: string | null;
  address?: string | null;
  customerType?: string | null;
  signerName?: string | null;
  signerTitle?: string | null;
  signedAt?: string | null;
  signed: boolean;
}

interface ContractDocumentProps {
  items: ContractItem[];
  clauses: ContractClause[];
  paymentTerms?: string | null;
  specialTerms?: string | null;
  totalAmount: number;
  vatIncluded: boolean;
  provider: PartySignature;
  customer: PartySignature;
}

function SignatureDetailList({ rows }: { rows: SignatureDetailRow[] }) {
  return (
    <div className="contract-signature-details">
      {rows.map((row, index) => (
        <span
          key={index}
          className={`contract-signature-meta${row.hidden ? " is-empty" : ""}`}
        >
          {row.hidden ? "\u00a0" : `${row.label} ${row.value}`}
        </span>
      ))}
    </div>
  );
}

function SignatureColumn({ party, rows }: { party: PartySignature; rows: SignatureDetailRow[] }) {
  return (
    <div className="contract-signature-col">
      <span className="contract-signature-role">{party.role}</span>
      <span className="contract-signature-company">{party.companyName}</span>
      <SignatureDetailList rows={rows} />
      <div className="contract-signature-pad">
        {party.signed ? (
          <span className="contract-signature-done">서명 완료</span>
        ) : (
          <span className="contract-signature-pending">서명 대기</span>
        )}
      </div>
      <span className="contract-signature-date">
        {party.signedAt ? formatDateTime(party.signedAt) : "서명일시 —"}
      </span>
    </div>
  );
}

export function ContractDocument({
  items,
  clauses,
  paymentTerms,
  specialTerms,
  totalAmount,
  vatIncluded,
  provider,
  customer,
}: ContractDocumentProps) {
  const visibleClauses = clauses.filter((c) => !c.title.includes("특약"));
  const providerRows = buildProviderSignatureRows({
    representative: provider.representativeName,
    businessNumber: provider.businessNumber,
    address: provider.address,
    phone: provider.phone,
  });
  const customerRows = buildCustomerSignatureRows({
    customerType: customer.customerType,
    representative: customer.signerName || customer.representativeName,
    businessNumber: customer.businessNumber,
    corporateRegistrationNumber: customer.corporateRegistrationNumber,
    phone: customer.phone,
  });

  return (
    <article className="contract-document portal-reveal">
      <div className="contract-document-inner">
        <p className="contract-document-notice">{ELECTRONIC_CONTRACT_NOTICE}</p>

        {items.length > 0 && (
          <section className="contract-doc-section">
            <h3 className="contract-doc-heading">서비스 내역</h3>
            <ul className="contract-service-list">
              {items.map((item, i) => (
                <li key={i} className="contract-service-item">
                  <div className="contract-service-main">
                    <span className="contract-service-name">{item.name}</span>
                    {item.description && (
                      <span className="contract-service-desc">{item.description}</span>
                    )}
                  </div>
                  <div className="contract-service-meta">
                    <span>{item.quantity}건</span>
                    <span>{formatCurrency(item.unitPrice)}</span>
                    <span className="contract-service-amount">{formatCurrency(item.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="contract-total-row">
              <span>총 계약 금액</span>
              <strong>
                {formatCurrency(totalAmount)}
                <em>{vatIncluded ? "VAT 포함" : "VAT 별도"}</em>
              </strong>
            </div>
          </section>
        )}

        {paymentTerms && (
          <section className="contract-doc-section">
            <h3 className="contract-doc-heading">결제 조건</h3>
            <p className="contract-doc-body">{paymentTerms}</p>
          </section>
        )}

        {visibleClauses.length > 0 && (
          <section className="contract-doc-section">
            <h3 className="contract-doc-heading">계약 조항</h3>
            <div className="contract-clauses">
              {visibleClauses.map((clause, index) => (
                <div key={clause.id || index} className="contract-clause">
                  <div className="contract-clause-num">{String(index + 1).padStart(2, "0")}</div>
                  <div className="contract-clause-body">
                    <h4>{clause.title}</h4>
                    <p>{displayProviderCompanyInText(clause.content)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="contract-doc-section">
          <h3 className="contract-doc-heading">특약사항</h3>
          <div className="contract-special-box">
            {specialTerms?.trim() || "별도 특약사항 없음"}
          </div>
        </section>

        <section className="contract-doc-section contract-signature-section">
          <h3 className="contract-doc-heading">전자서명</h3>
          <div className="contract-signature-grid">
            <SignatureColumn party={provider} rows={providerRows} />
            <SignatureColumn party={customer} rows={customerRows} />
          </div>
        </section>
      </div>
    </article>
  );
}

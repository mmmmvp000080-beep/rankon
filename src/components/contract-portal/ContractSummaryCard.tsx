"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/constants";

interface SummaryField {
  label: string;
  value: string;
}

interface ContractSummaryCardProps {
  companyName: string;
  representativeName: string;
  productName: string;
  totalAmount: number;
  vatIncluded: boolean;
  startDate: string;
  endDate: string;
  status: string;
}

export function ContractSummaryCard({
  companyName,
  representativeName,
  productName,
  totalAmount,
  vatIncluded,
  startDate,
  endDate,
  status,
}: ContractSummaryCardProps) {
  const fields: SummaryField[] = [
    { label: "고객사", value: companyName },
    { label: "대표자", value: representativeName || "-" },
    { label: "상품", value: productName },
    {
      label: "계약금액",
      value: `${formatCurrency(totalAmount)} (${vatIncluded ? "VAT 포함" : "VAT 별도"})`,
    },
    {
      label: "계약기간",
      value: `${formatDate(startDate)} — ${formatDate(endDate)}`,
    },
    { label: "계약상태", value: STATUS_LABELS[status] || status },
  ];

  return (
    <section className="contract-summary-card portal-animate-in" style={{ animationDelay: "80ms" }}>
      <h2 className="contract-section-title">계약 요약</h2>
      <div className="contract-summary-grid">
        {fields.map((field) => (
          <div key={field.label} className="contract-summary-item">
            <span className="contract-summary-label">{field.label}</span>
            <span className="contract-summary-value">{field.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

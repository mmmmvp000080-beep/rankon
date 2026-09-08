"use client";

import { CheckCircle2, Download, FileText } from "lucide-react";
import { formatDateTime } from "@/lib/format";

interface ContractCompleteViewProps {
  signedAt: string;
  finalPdfUrl: string;
  finalPdfDownloadUrl: string;
  showActions?: boolean;
  title?: string;
  subtitle?: string;
}

export function ContractCompleteView({
  signedAt,
  finalPdfUrl,
  finalPdfDownloadUrl,
  showActions = true,
  title = "전자서명이 완료되었습니다.",
  subtitle,
}: ContractCompleteViewProps) {
  const openFinalPdf = () => {
    window.open(finalPdfUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="contract-complete portal-scale-in">
      <div className="contract-complete-icon">
        <CheckCircle2 size={48} strokeWidth={1.5} />
      </div>
      <h2 className="contract-complete-title">{title}</h2>
      {subtitle && <p className="contract-complete-subtitle">{subtitle}</p>}
      <p className="contract-complete-date">{formatDateTime(signedAt)}</p>
      {showActions && (
        <div className="contract-complete-actions">
          <button type="button" onClick={openFinalPdf} className="contract-cta-secondary">
            <FileText size={18} />
            최종 계약서 보기
          </button>
          <a href={finalPdfDownloadUrl} className="contract-cta-primary">
            <Download size={18} />
            PDF 다운로드
          </a>
        </div>
      )}
    </section>
  );
}

interface ContractPendingViewProps {
  title: string;
  subtitle: string;
  signedAt?: string;
}

export function ContractPendingView({ title, subtitle, signedAt }: ContractPendingViewProps) {
  return (
    <section className="contract-complete contract-complete-pending portal-scale-in">
      <div className="contract-complete-icon contract-complete-icon-pending">
        <CheckCircle2 size={48} strokeWidth={1.5} />
      </div>
      <h2 className="contract-complete-title">{title}</h2>
      <p className="contract-complete-subtitle">{subtitle}</p>
      {signedAt && <p className="contract-complete-date">{formatDateTime(signedAt)}</p>}
    </section>
  );
}

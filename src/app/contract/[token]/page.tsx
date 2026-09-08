"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ContractHero } from "@/components/contract-portal/ContractHero";
import { ContractProgress, resolveContractStep } from "@/components/contract-portal/ContractProgress";
import { ContractSummaryCard } from "@/components/contract-portal/ContractSummaryCard";
import { ContractDocument } from "@/components/contract-portal/ContractDocument";
import { ContractSignPanel } from "@/components/contract-portal/ContractSignPanel";
import { ContractCompleteView, ContractPendingView } from "@/components/contract-portal/ContractCompleteView";
import { SignatureCanvasRef } from "@/components/SignatureCanvas";
import { LoadingSpinner } from "@/components/ui/Loading";
import { BRAND } from "@/lib/brand";
import { CONTRACT_TYPE_LABELS } from "@/lib/constants";
import {
  PROVIDER_COMPANY_DISPLAY_NAME,
  displayProviderCompanyInText,
} from "@/lib/provider-company-display";

function useRevealOnScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const nodes = document.querySelectorAll(".portal-reveal:not(.is-visible)");
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [active]);
}

export default function CustomerContractPage() {
  const { token } = useParams<{ token: string }>();
  const sigRef = useRef<SignatureCanvasRef>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checks, setChecks] = useState({ content: false, privacy: false, electronic: false });
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [completed, setCompleted] = useState(false);
  const [signedAt, setSignedAt] = useState("");
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/contract/${token}`, { cache: "no-store", signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (ac.signal.aborted) return;
        if (d.success) {
          setData(d.data);
          setCompleted(d.data.completed);
        } else setError(d.message);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("계약 정보를 불러올 수 없습니다");
        setLoading(false);
      });
    return () => ac.abort();
  }, [token]);

  useEffect(() => {
    if (!loading && !error) {
      const t = requestAnimationFrame(() => setContentReady(true));
      return () => cancelAnimationFrame(t);
    }
  }, [loading, error]);

  useRevealOnScroll(contentReady);

  const handleCheckChange = (key: keyof typeof checks, value: boolean) => {
    setChecks((prev) => ({ ...prev, [key]: value }));
  };

  const scrollToDocument = () => {
    documentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSign = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return alert("서명을 입력하세요");
    setSubmitting(true);
    const res = await fetch(`/api/contract/${token}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agreed: true,
        signerName,
        signerTitle,
        signatureDataUrl: sigRef.current.toDataURL(),
      }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (d.success) {
      setCompleted(true);
      setSignedAt(d.data.signedAt);
      const refresh = await fetch(`/api/contract/${token}`, { cache: "no-store" });
      const refreshed = await refresh.json();
      if (refreshed.success) setData(refreshed.data);
    } else alert(d.message);
  };

  if (loading) {
    return (
      <div className="contract-portal contract-portal-loading">
        <LoadingSpinner />
        <p className="contract-portal-loading-text">계약서를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="contract-portal contract-portal-loading">
        <div className="contract-error-card">
          <h1>{error}</h1>
          <p>유효하지 않은 계약입니다. 링크를 확인해 주세요.</p>
        </div>
      </div>
    );
  }

  const contract = data!.contract as Record<string, unknown>;
  const company = (data!.company as Record<string, unknown>) || {};
  const items = (contract.items as Array<Record<string, unknown>>) || [];
  const clauses = (contract.clauses as Array<Record<string, unknown>>) || [];
  const contractType = String(contract.contractType || "NAVER_PLACE_MONTHLY_MANAGEMENT");

  const providerSigned = Boolean(contract.providerSignedAt);
  const customerSigned = Boolean(contract.customerSignedAt);
  const fullySigned =
    String(contract.status) === "COMPLETED" &&
    providerSigned &&
    customerSigned &&
    Boolean(contract.providerSignaturePath) &&
    Boolean(contract.customerSignaturePath);
  const customerSignedOnly = customerSigned && !providerSigned;

  const draftPdfUrl = `/api/shared-contracts/${token}/pdf/draft`;
  const finalPdfUrl = `/api/shared-contracts/${token}/pdf`;
  const finalPdfDownloadUrl = `/api/shared-contracts/${token}/pdf?download=1`;

  const productName =
    (items[0]?.name as string) ||
    CONTRACT_TYPE_LABELS[contractType] ||
    "네이버 플레이스 서비스";

  const currentStep = resolveContractStep({
    status: String(contract.status),
    providerSignedAt: contract.providerSignedAt as string | null,
    customerSignedAt: contract.customerSignedAt as string | null,
  });

  const completionDate =
    signedAt ||
    String(contract.customerSignedAt || contract.providerSignedAt || "");

  const showSignPanel = !fullySigned && !customerSignedOnly && !completed && providerSigned;

  return (
    <div className={`contract-portal${contentReady ? " is-ready" : ""}`}>
      <div className="contract-portal-shell">
        <ContractHero
          contractType={contractType}
          contractNumber={String(contract.contractNumber)}
        />

        <ContractProgress currentStep={currentStep} />

        <ContractSummaryCard
          companyName={String(contract.companyName)}
          representativeName={String(contract.representativeName || "-")}
          productName={productName}
          totalAmount={Number(contract.totalAmount)}
          vatIncluded={Boolean(contract.vatIncluded)}
          startDate={String(contract.startDate)}
          endDate={String(contract.endDate)}
          status={String(contract.status)}
        />

        {!fullySigned && !customerSigned && (
          <div className="contract-scroll-cta-wrap portal-animate-in" style={{ animationDelay: "120ms" }}>
            <button type="button" onClick={scrollToDocument} className="contract-cta-primary contract-cta-scroll">
              계약 내용 확인하기
              <ChevronDown size={18} className="contract-cta-scroll-icon" />
            </button>
            {!customerSigned && (
              <a
                href={draftPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="contract-cta-link"
              >
                초안 PDF로 보기
              </a>
            )}
          </div>
        )}

        <div ref={documentRef} className="contract-document-wrap">
          <ContractDocument
            items={items.map((item) => ({
              name: String(item.name),
              description: item.description as string | null,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              amount: Number(item.amount),
            }))}
            clauses={clauses.map((c) => ({
              id: c.id as string | undefined,
              title: String(c.title),
              content: displayProviderCompanyInText(String(c.content)),
            }))}
            paymentTerms={contract.paymentTerms as string | null}
            specialTerms={contract.specialTerms as string | null}
            totalAmount={Number(contract.totalAmount)}
            vatIncluded={Boolean(contract.vatIncluded)}
            provider={{
              role: "회사",
              companyName: PROVIDER_COMPANY_DISPLAY_NAME,
              representativeName: String(company.representativeName || "-"),
              businessNumber: company.businessNumber as string | null,
              address: company.address as string | null,
              phone: company.phone as string | null,
              signerName: contract.providerSignerName as string | null,
              signerTitle: contract.providerSignerTitle as string | null,
              signedAt: contract.providerSignedAt as string | null,
              signed: providerSigned,
            }}
            customer={{
              role: "고객",
              companyName: String(contract.companyName),
              representativeName: String(contract.representativeName || "-"),
              phone: contract.phone as string | null,
              businessNumber: contract.businessNumber as string | null,
              corporateRegistrationNumber: contract.corporateRegistrationNumber as string | null,
              customerType: String(contract.customerType || "INDIVIDUAL"),
              signerName: contract.customerSignerName as string | null,
              signerTitle: contract.customerSignerTitle as string | null,
              signedAt: contract.customerSignedAt as string | null,
              signed: customerSigned,
            }}
          />
        </div>

        {fullySigned ? (
          <ContractCompleteView
            signedAt={completionDate}
            finalPdfUrl={finalPdfUrl}
            finalPdfDownloadUrl={finalPdfDownloadUrl}
          />
        ) : customerSignedOnly ? (
          <ContractPendingView
            title="고객 서명이 완료되었습니다"
            subtitle="회사 서명 완료 후 최종 계약서를 다운로드할 수 있습니다"
            signedAt={completionDate || undefined}
          />
        ) : completed ? (
          <ContractCompleteView
            signedAt={completionDate}
            finalPdfUrl={finalPdfUrl}
            finalPdfDownloadUrl={finalPdfDownloadUrl}
          />
        ) : showSignPanel ? (
          <ContractSignPanel
            checks={checks}
            onCheckChange={handleCheckChange}
            signerName={signerName}
            onSignerNameChange={setSignerName}
            signerTitle={signerTitle}
            onSignerTitleChange={setSignerTitle}
            submitting={submitting}
            onSubmit={handleSign}
            sigRef={sigRef}
          />
        ) : !providerSigned ? (
          <ContractPendingView
            title="회사 서명을 기다리는 중입니다"
            subtitle="공급자 서명이 완료되면 전자서명을 진행할 수 있습니다"
          />
        ) : null}

        <footer className="contract-portal-footer">
          <span>Powered by {BRAND.fullName}</span>
        </footer>
      </div>
    </div>
  );
}

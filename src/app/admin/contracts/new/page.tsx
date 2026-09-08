"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { useToast } from "@/components/ui/Toast";
import {
  CustomerContractFields,
  CustomerContractFormValues,
} from "@/components/admin/CustomerContractFields";
import { formatAmountInput, parseAmountInput } from "@/lib/format";
import { CONTRACT_TYPE_BADGE, CONTRACT_TYPE_TITLES } from "@/lib/constants";
import { CONTRACT_TYPES, DEFAULT_CONTRACT_TYPE } from "@/lib/contract-type";
import { DEFAULT_CUSTOMER_TYPE } from "@/lib/customer-type";
import type { ContractType } from "@/generated/prisma/client";

export default function NewContractPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerContractFormValues>({
    customerType: DEFAULT_CUSTOMER_TYPE,
    companyName: "",
    representativeName: "",
    contactName: "",
    phone: "",
    businessNumber: "",
    corporateRegistrationNumber: "",
  });
  const [form, setForm] = useState({
    contractType: DEFAULT_CONTRACT_TYPE as ContractType,
    startDate: "",
    endDate: "",
    vatIncluded: true,
    specialTerms: "",
  });
  const [amountInput, setAmountInput] = useState("0");
  const [previewTitle, setPreviewTitle] = useState(CONTRACT_TYPE_TITLES[DEFAULT_CONTRACT_TYPE]);

  const totalAmount = parseAmountInput(amountInput);

  useEffect(() => {
    let cancelled = false;
    const loadTemplateDefaults = async () => {
      setTemplateLoading(true);
      setTemplateError(null);
      try {
        const res = await fetch(`/api/admin/contract-template?contractType=${form.contractType}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setPreviewTitle(data.data.contractTitle || CONTRACT_TYPE_TITLES[form.contractType]);
          setForm((prev) => ({
            ...prev,
            specialTerms: prev.specialTerms || data.data.defaultSpecialTerms || "",
          }));
        } else {
          setTemplateError(data.message || "템플릿을 불러올 수 없습니다");
        }
      } catch {
        if (!cancelled) setTemplateError("템플릿을 불러올 수 없습니다");
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }
    };
    void loadTemplateDefaults();
    return () => {
      cancelled = true;
    };
  }, [form.contractType]);

  const setContractType = (contractType: ContractType) => {
    setForm((prev) => ({
      ...prev,
      contractType,
      specialTerms: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...customer,
          contactName: customer.contactName || null,
          businessNumber: customer.businessNumber || null,
          corporateRegistrationNumber: customer.corporateRegistrationNumber || null,
          specialTerms: form.specialTerms || null,
          totalAmount,
        }),
      });
      const data = await res.json();
      const created = data.contract ?? data.data?.contract;
      if (data.success && created?.id) {
        showToast("계약이 생성되었습니다");
        router.push(`/admin/contracts/${created.id}`);
      } else {
        console.error("[Contract Create Failed]", data);
        showToast(data.message || "계약 생성 실패", "error");
      }
    } catch (err) {
      console.error("[Contract Create Failed]", err);
      showToast("계약 생성 중 오류", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "ui-input";

  return (
    <AdminLayoutClient title="계약 등록">
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <section className="ui-card p-5">
          <h2 className="mb-1 font-medium text-brand-text">계약 유형</h2>
          <p className="mb-4 text-sm text-brand-muted">선택한 유형에 따라 계약서 제목과 조항이 적용됩니다.</p>
          <div className="flex flex-wrap gap-2">
            {CONTRACT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setContractType(type)}
                className={`ui-btn ui-btn-sm ${form.contractType === type ? "ui-btn-primary" : "ui-btn-secondary"}`}
              >
                {CONTRACT_TYPE_BADGE[type]} 계약서
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-brand-border bg-brand-bg-secondary/40 px-4 py-3">
            <p className="text-xs text-brand-muted">계약서 제목</p>
            <p className="mt-1 font-semibold text-brand-secondary">
              {templateLoading ? "불러오는 중..." : previewTitle}
            </p>
            {templateError ? (
              <p className="mt-2 text-sm text-red-600">{templateError}</p>
            ) : null}
          </div>
        </section>

        <section className="ui-card p-5">
          <h2 className="mb-4 font-medium text-brand-text">계약서 작성</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <CustomerContractFields
              values={customer}
              onChange={(patch) => setCustomer({ ...customer, ...patch })}
              inputClass={inputClass}
            />

            <div>
              <label className="mb-1 block text-sm text-brand-muted">계약 시작일 *</label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-brand-muted">계약 종료일 *</label>
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-brand-muted">계약금액 *</label>
              <input
                required
                value={amountInput}
                onChange={(e) => setAmountInput(formatAmountInput(parseAmountInput(e.target.value)))}
                className={inputClass}
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.vatIncluded}
                onChange={(e) => setForm({ ...form, vatIncluded: e.target.checked })}
                className="accent-brand-primary"
              />
              부가세 포함
            </label>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-brand-muted">특약사항</label>
              <textarea
                value={form.specialTerms}
                onChange={(e) => setForm({ ...form, specialTerms: e.target.value })}
                className="ui-textarea"
                rows={3}
              />
            </div>
          </div>

          <p className="mt-4 text-right text-sm text-brand-muted">
            총 계약금액: <span className="font-semibold text-brand-primary">{formatAmountInput(totalAmount)}원</span>
            {form.vatIncluded ? " (부가세 포함)" : " (부가세 별도)"}
          </p>
        </section>

        <div className="flex gap-2">
          <button type="submit" disabled={loading || templateLoading} className="ui-btn ui-btn-primary">
            {loading ? "저장 중..." : "계약 생성"}
          </button>
          <Link href="/admin/contracts" className="ui-btn ui-btn-secondary">
            취소
          </Link>
        </div>
      </form>
    </AdminLayoutClient>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { SignatureCanvas, SignatureCanvasRef } from "@/components/SignatureCanvas";
import { LoadingSpinner } from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";

const ContractTemplateEditor = dynamic(
  () =>
    import("@/components/admin/ContractTemplateEditor").then((mod) => ({
      default: mod.ContractTemplateEditor,
    })),
  { ssr: false, loading: () => <LoadingSpinner /> }
);

type SettingsTab = "company" | "contract" | "signature";

export default function SettingsPage() {
  const { showToast } = useToast();
  const sigRef = useRef<SignatureCanvasRef>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");
  const [form, setForm] = useState({
    companyName: "랭크온",
    representativeName: "",
    representativeTitle: "",
    businessNumber: "",
    address: "",
    phone: "",
    email: "",
    defaultContractPurpose: "",
    defaultContractPurposeGuarantee: "",
    defaultSignaturePath: null as string | null,
  });

  const loadData = useCallback(async () => {
    const settingsRes = await fetch("/api/admin/settings");
    const settingsData = await settingsRes.json();
    if (settingsData.success) setForm(settingsData.data.settings);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) showToast("저장되었습니다");
    else showToast(data.message, "error");
  };

  const saveDefaultSig = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      showToast("서명을 입력하세요", "error");
      return;
    }
    const res = await fetch("/api/admin/settings/default-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signerName: form.representativeName,
        signerTitle: form.representativeTitle,
        signatureDataUrl: sigRef.current.toDataURL(),
      }),
    });
    const data = await res.json();
    if (data.success) {
      setForm({ ...form, defaultSignaturePath: data.data.settings.defaultSignaturePath });
      showToast("저장되었습니다");
    } else showToast(data.message, "error");
  };

  if (loading) return <AdminLayoutClient title="환경설정"><LoadingSpinner /></AdminLayoutClient>;

  const companyFields = {
    left: [
      { key: "companyName" as const, label: "회사명", placeholder: "회사명을 입력하세요" },
      { key: "representativeName" as const, label: "대표자명", placeholder: "대표자명을 입력하세요" },
      { key: "businessNumber" as const, label: "사업자등록번호", placeholder: "000-00-00000" },
      { key: "phone" as const, label: "대표번호", placeholder: "02-0000-0000" },
    ],
    right: [
      { key: "representativeTitle" as const, label: "담당자명", placeholder: "담당자명을 입력하세요" },
      { key: "email" as const, label: "이메일", placeholder: "contact@example.com" },
      { key: "address" as const, label: "주소", placeholder: "주소를 입력하세요" },
    ],
  };

  return (
    <AdminLayoutClient title="환경설정">
      <div className="space-y-5">
        <div className="ui-tabs">
          <button
            type="button"
            onClick={() => setActiveTab("company")}
            className={`ui-tab ${activeTab === "company" ? "ui-tab-active" : ""}`}
          >
            회사 정보
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contract")}
            className={`ui-tab ${activeTab === "contract" ? "ui-tab-active" : ""}`}
          >
            계약서 수정
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("signature")}
            className={`ui-tab ${activeTab === "signature" ? "ui-tab-active" : ""}`}
          >
            기본 서명
          </button>
        </div>

        {activeTab === "company" && (
          <div className="settings-company-card">
            <h3 className="settings-company-title">회사 정보</h3>
            <p className="settings-company-desc">계약서와 PDF에 표시되는 회사 기본 정보입니다.</p>
            <div className="settings-company-grid">
              <div className="space-y-5">
                {companyFields.left.map(({ key, label, placeholder }) => (
                  <label key={key} className="settings-field">
                    <span className="settings-field-label">{label}</span>
                    <input
                      className="settings-field-input"
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={placeholder}
                    />
                  </label>
                ))}
              </div>
              <div className="space-y-5">
                {companyFields.right.map(({ key, label, placeholder }) => (
                  <label key={key} className="settings-field">
                    <span className="settings-field-label">{label}</span>
                    <input
                      className="settings-field-input"
                      value={form[key] || ""}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={placeholder}
                    />
                  </label>
                ))}
                <label className="settings-field">
                  <span className="settings-field-label">홈페이지</span>
                  <input className="settings-field-input" disabled value="" placeholder="추가 예정" />
                </label>
              </div>
            </div>
            <div className="settings-company-actions">
              <button type="button" onClick={handleSave} disabled={saving} className="ui-btn ui-btn-primary">
                {saving ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "contract" && (
          <ContractTemplateEditor
            purposeValue={form.defaultContractPurpose || ""}
            purposeGuaranteeValue={form.defaultContractPurposeGuarantee || ""}
            onPurposeChange={(value) => setForm({ ...form, defaultContractPurpose: value })}
            onPurposeGuaranteeChange={(value) =>
              setForm({ ...form, defaultContractPurposeGuarantee: value })
            }
            onSavePurpose={handleSave}
            savingPurpose={saving}
          />
        )}

        {activeTab === "signature" && (
          <div className="max-w-2xl ui-card p-5">
            <h3 className="mb-3 font-semibold text-brand-secondary">기본 공급자 서명</h3>
            {form.defaultSignaturePath && (
              <p className="mb-2 text-sm text-brand-primary">기본 서명이 등록되어 있습니다</p>
            )}
            <SignatureCanvas ref={sigRef} className="max-w-md" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => sigRef.current?.clear()} className="ui-btn ui-btn-secondary ui-btn-sm">
                지우기
              </button>
              <button onClick={saveDefaultSig} className="ui-btn ui-btn-primary ui-btn-sm">
                전자서명
              </button>
              {form.defaultSignaturePath && (
                <button
                  onClick={async () => {
                    await fetch("/api/admin/settings/default-signature", { method: "DELETE" });
                    setForm({ ...form, defaultSignaturePath: null });
                    showToast("삭제되었습니다");
                  }}
                  className="ui-btn ui-btn-danger ui-btn-sm"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayoutClient>
  );
}

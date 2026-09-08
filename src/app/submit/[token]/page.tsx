"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Upload } from "lucide-react";
import { PortalBrandHeader } from "@/components/brand/PortalBrandHeader";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LoadingSpinner } from "@/components/ui/Loading";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { FILE_CATEGORY_LABELS } from "@/lib/constants";
import { BRAND } from "@/lib/brand";
import { LOGO_HEIGHT } from "@/lib/logo-assets";

export default function SubmitPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("BUSINESS_LICENSE");
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<Array<Record<string, unknown>>>([]);

  const fetchData = useCallback(() => {
    fetch(`/api/submit/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        else setError(d.message);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) return alert("파일을 선택하세요");
    if (files.length > 10) return alert("한 번에 최대 10개까지 업로드할 수 있습니다");

    setUploading(true);
    const formData = new FormData();
    formData.set("category", category);
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    const res = await fetch(`/api/submit/${token}`, { method: "POST", body: formData });
    const d = await res.json();
    setUploading(false);

    if (d.success) {
      setUploaded(d.data.files);
      setFiles(null);
      fetchData();
    } else alert(d.message || "파일 업로드에 실패했습니다");
  };

  if (loading) {
    return (
      <div className="ui-portal flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-portal flex min-h-screen items-center justify-center px-4">
        <div className="ui-portal-card mx-auto max-w-md p-10 text-center">
          <h1 className="text-lg font-bold text-brand-error">{error}</h1>
          <p className="mt-2 text-sm text-brand-muted">제출 링크가 올바른지 확인해 주세요.</p>
        </div>
      </div>
    );
  }

  const contract = data!.contract as Record<string, unknown>;
  const existingFiles = (data!.files as Array<Record<string, unknown>>) || [];

  return (
    <div className="ui-portal min-h-screen">
      <PortalBrandHeader
        contractNumber={String(contract.contractNumber)}
        documentTitle="랭크온 파일 제출"
        subtitle="요청받은 파일을 안전하게 제출해 주세요."
      />

      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-10">
        <div className="ui-portal-card p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-3 border-b border-brand-border-light pb-6 sm:flex-row sm:items-center sm:justify-between">
            <BrandLogo layout="full" color="original" height={LOGO_HEIGHT.portalMobile} priority maxWidth={220} />
            <div className="text-sm text-brand-muted">
              <p className="font-semibold text-brand-text">{BRAND.nameKo}</p>
              <p className="mt-1">{String(contract.companyName)} · 서류 업로드</p>
            </div>
          </div>
          <div className="mb-6 flex items-start gap-3 rounded-[12px] bg-brand-bg-secondary/60 p-4 text-sm text-brand-muted">
            <Upload size={18} className="mt-0.5 shrink-0 text-brand-primary" />
            <p>사업자등록증, 통장사본 등 필요 서류를 업로드해 주세요.<br />PDF, PNG, JPG, WEBP · 파일당 10MB · 최대 10개</p>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="ui-input">
              {Object.entries(FILE_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <div className="rounded-[12px] border-2 border-dashed border-brand-border p-6 text-center transition-colors hover:border-brand-primary/40 hover:bg-brand-primary-soft/30">
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setFiles(e.target.files)}
                className="w-full text-sm file:mr-4 file:rounded-[8px] file:border-0 file:bg-brand-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#0E0F12] hover:file:bg-brand-primary-hover"
              />
            </div>
            <button type="submit" disabled={uploading} className="ui-btn ui-btn-primary ui-btn-lg w-full disabled:opacity-50">
              {uploading ? "업로드 중..." : "파일 제출"}
            </button>
          </form>

          {uploaded.length > 0 && (
            <div className="mt-5 flex items-center gap-2 rounded-[12px] border border-brand-success/20 bg-brand-success-soft p-4 text-sm text-brand-success">
              <CheckCircle2 size={18} />
              파일이 업로드되었습니다 ({uploaded.length}개)
            </div>
          )}

          {existingFiles.length > 0 && (
            <div className="mt-8 border-t border-brand-border-light pt-6">
              <h3 className="mb-4 font-bold text-brand-text">업로드 목록</h3>
              <div className="space-y-2">
                {existingFiles.map((f) => (
                  <div key={String(f.id)} className="flex flex-col gap-1 rounded-[10px] bg-brand-bg-secondary/50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <span className="ui-badge ui-badge-draft">
                        <span className="ui-badge-dot" />
                        {FILE_CATEGORY_LABELS[String(f.category)]}
                      </span>
                      <span className="font-medium text-brand-text">{String(f.originalName)}</span>
                    </div>
                    <span className="text-brand-muted">
                      {formatFileSize(Number(f.fileSize))} · {formatDateTime(String(f.createdAt))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-brand-muted">
          Powered by {BRAND.fullName}
        </p>
      </div>
    </div>
  );
}

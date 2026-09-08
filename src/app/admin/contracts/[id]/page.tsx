"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { LoadingSpinner } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SignatureCanvas, SignatureCanvasRef } from "@/components/SignatureCanvas";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  CustomerContractFields,
  CustomerContractFormValues,
} from "@/components/admin/CustomerContractFields";
import { formatCurrency, formatDate, formatDateTime, formatFileSize, formatAmountInput, parseAmountInput } from "@/lib/format";
import { FILE_CATEGORY_LABELS, CONTRACT_TYPE_BADGE, CONTRACT_TYPE_TITLES } from "@/lib/constants";
import { buildContractShareUrl, buildUploadShareUrl } from "@/lib/public-app-url";
import { CustomerType, normalizeCustomerType } from "@/lib/customer-type";
import { CONTRACT_TYPES } from "@/lib/contract-type";
import { ContractTypeBadge } from "@/components/ui/ContractTypeBadge";

type Tab = "info" | "signature" | "files" | "history";

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [contract, setContract] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("info");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const sigRef = useRef<SignatureCanvasRef>(null);
  const [sigName, setSigName] = useState("");
  const [sigTitle, setSigTitle] = useState("");
  const [creatingContractLink, setCreatingContractLink] = useState(false);
  const [latestContractShareUrl, setLatestContractShareUrl] = useState<string | null>(null);
  const [latestUploadShareUrl, setLatestUploadShareUrl] = useState<string | null>(null);

  const fetchContract = useCallback(async () => {
    const res = await fetch(`/api/admin/contracts/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) {
      setContract(data.data.contract);
      setSigName(data.data.contract.providerSignerName || "");
      setSigTitle(data.data.contract.providerSignerTitle || "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchContract();
  }, [fetchContract]);

  if (loading || !contract) {
    return <AdminLayoutClient title="계약 상세"><LoadingSpinner /></AdminLayoutClient>;
  }

  const locked = contract.status === "COMPLETED" || contract.lockedAt;
  const shareTokens = (contract.shareTokens as Array<Record<string, unknown>>) || [];
  const contractSignToken = shareTokens
    .filter((t) => t.type === "CONTRACT_SIGN" && t.isActive === true)
    .sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime())[0];
  const uploadSignToken = shareTokens.filter((t) => t.type === "FILE_UPLOAD" && t.isActive).sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime())[0];
  const files = (contract.uploadedFiles as Array<Record<string, unknown>>) || [];
  const history = (contract.history as Array<Record<string, unknown>>) || [];
  const contractShareDisplayUrl =
    latestContractShareUrl ||
    (contractSignToken ? buildContractShareUrl(String(contractSignToken.token)) : null);
  const uploadShareDisplayUrl =
    latestUploadShareUrl ||
    (uploadSignToken ? buildUploadShareUrl(String(uploadSignToken.token)) : null);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerType: contract.customerType,
        companyName: contract.companyName,
        representativeName: contract.representativeName,
        contactName: contract.contactName || null,
        phone: contract.phone,
        businessNumber: contract.businessNumber || null,
        corporateRegistrationNumber: contract.corporateRegistrationNumber || null,
        contractType: contract.contractType,
        startDate: String(contract.startDate).slice(0, 10),
        endDate: String(contract.endDate).slice(0, 10),
        vatIncluded: contract.vatIncluded,
        totalAmount: Number(contract.totalAmount),
        specialTerms: contract.specialTerms || null,
        internalMemo: contract.internalMemo,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      showToast("저장되었습니다");
      fetchContract();
    } else showToast(data.message, "error");
  };

  const saveProviderSig = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      showToast("서명을 입력하세요", "error");
      return;
    }
    const res = await fetch(`/api/admin/contracts/${id}/provider-signature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signerName: sigName,
        signerTitle: sigTitle,
        signatureDataUrl: sigRef.current.toDataURL(),
      }),
    });
    const data = await res.json();
    if (data.success) { showToast("전자서명이 완료되었습니다"); fetchContract(); }
    else showToast(data.message, "error");
  };

  const createContractLink = async () => {
    setCreatingContractLink(true);
    setLatestContractShareUrl(null);
    const res = await fetch(`/api/admin/contracts/${id}/contract-share`, {
      method: "POST",
      cache: "no-store",
    });
    const data = await res.json();
    setCreatingContractLink(false);
    if (data.success) {
      const url = data.url || data.data?.url;
      if (url) setLatestContractShareUrl(url);
      showToast("새 계약 링크가 발급되었습니다");
      await fetchContract();
    } else showToast(data.message, "error");
  };

  const createUploadLink = async () => {
    const res = await fetch(`/api/admin/contracts/${id}/upload-share`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      const url = data.url || data.data?.url;
      if (url) setLatestUploadShareUrl(url);
      showToast("링크 생성됨");
      await fetchContract();
    } else showToast(data.message, "error");
  };

  const copyText = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast("링크가 복사되었습니다");
  };

  const copyContractShareUrl = () => {
    if (!contractShareDisplayUrl) {
      showToast("먼저 링크를 생성하세요", "error");
      return;
    }
    copyText(contractShareDisplayUrl);
  };

  const copyUploadShareUrl = () => {
    if (!uploadShareDisplayUrl) {
      showToast("먼저 링크를 생성하세요", "error");
      return;
    }
    copyText(uploadShareDisplayUrl);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/admin/contracts/${id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    setDeleteOpen(false);
    if (data.success) {
      showToast("계약서가 삭제되었습니다");
      router.push("/admin/contracts");
    } else {
      showToast(data.message || "삭제에 실패했습니다", "error");
    }
  };

  const inputClass = "ui-input disabled:bg-brand-bg-secondary disabled:text-brand-muted";
  const customerValues: CustomerContractFormValues = {
    customerType: normalizeCustomerType(String(contract.customerType)) as CustomerType,
    companyName: String(contract.companyName || ""),
    representativeName: String(contract.representativeName || ""),
    contactName: String(contract.contactName || ""),
    phone: String(contract.phone || ""),
    businessNumber: String(contract.businessNumber || ""),
    corporateRegistrationNumber: String(contract.corporateRegistrationNumber || ""),
  };

  return (
    <AdminLayoutClient
      title="계약 상세"
      description={String(contract.companyName)}
      actions={
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSave} disabled={saving} className="ui-btn ui-btn-primary ui-btn-sm">{saving ? "저장 중..." : "저장"}</button>
          <a href={`/api/admin/contracts/${id}/pdf/draft`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-secondary ui-btn-sm">초안 PDF</a>
          {contract.status === "COMPLETED" && (
            <a
              href={`/api/admin/contracts/${id}/pdf/signed`}
              className="ui-btn ui-btn-secondary ui-btn-sm"
            >
              완료 PDF 생성
            </a>
          )}
          <button type="button" onClick={() => setDeleteOpen(true)} className="ui-btn ui-btn-danger ui-btn-sm">계약서 삭제</button>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[12px] bg-brand-bg-secondary/50 px-4 py-3 text-sm">
        <span className="font-semibold text-brand-text">{String(contract.companyName)}</span>
        <ContractTypeBadge contractType={String(contract.contractType)} />
        <StatusBadge status={String(contract.status)} />
        <span className="text-brand-muted">생성 {formatDate(String(contract.createdAt))}</span>
        <span className="text-brand-muted">수정 {formatDate(String(contract.updatedAt))}</span>
      </div>

      <div className="ui-tabs">
        {(["info", "signature", "files", "history"] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`ui-tab ${tab === t ? "ui-tab-active" : ""}`}>
            {t === "info" ? "계약 정보" : t === "signature" ? "서명 및 공유" : t === "files" ? "제출 파일" : "이력"}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="space-y-4 ui-card p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm text-brand-muted">계약 유형</label>
              {locked ? (
                <div className="mt-2 flex items-center gap-2">
                  <ContractTypeBadge contractType={String(contract.contractType)} />
                  <span className="text-sm text-brand-muted">
                    {CONTRACT_TYPE_TITLES[String(contract.contractType)] || ""}
                  </span>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {CONTRACT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setContract({ ...contract, contractType: type })}
                      className={`ui-btn ui-btn-sm ${
                        contract.contractType === type ? "ui-btn-primary" : "ui-btn-secondary"
                      }`}
                    >
                      {CONTRACT_TYPE_BADGE[type]} 계약서
                    </button>
                  ))}
                </div>
              )}
            </div>
            <CustomerContractFields
              values={customerValues}
              onChange={(patch) => setContract({ ...contract, ...patch })}
              disabled={!!locked}
              inputClass={inputClass}
            />
            <div>
              <label className="text-sm text-brand-muted">계약 시작일</label>
              <input disabled={!!locked} type="date" className={inputClass} value={String(contract.startDate).slice(0, 10)} onChange={(e) => setContract({ ...contract, startDate: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-brand-muted">계약 종료일</label>
              <input disabled={!!locked} type="date" className={inputClass} value={String(contract.endDate).slice(0, 10)} onChange={(e) => setContract({ ...contract, endDate: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-brand-muted">계약금액</label>
              <input
                disabled={!!locked}
                className={inputClass}
                value={formatAmountInput(Number(contract.totalAmount))}
                onChange={(e) => setContract({ ...contract, totalAmount: parseAmountInput(e.target.value) })}
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" disabled={!!locked} checked={Boolean(contract.vatIncluded)} onChange={(e) => setContract({ ...contract, vatIncluded: e.target.checked })} />
              부가세 포함
            </label>
            <div className="md:col-span-2">
              <label className="text-sm text-brand-muted">특약사항</label>
              <textarea disabled={!!locked} className="ui-textarea" value={String(contract.specialTerms || "")} onChange={(e) => setContract({ ...contract, specialTerms: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-brand-muted">내부 메모 (관리자 전용)</label>
              <textarea className="ui-textarea" value={String(contract.internalMemo || "")} onChange={(e) => setContract({ ...contract, internalMemo: e.target.value })} />
            </div>
          </div>
          <p className="text-right text-lg font-bold text-brand-primary">
            총액: {formatCurrency(Number(contract.totalAmount))}
            <span className="ml-2 text-sm font-normal text-brand-muted">
              ({contract.vatIncluded ? "부가세 포함" : "부가세 별도"})
            </span>
          </p>
        </div>
      )}

      {tab === "signature" && (
        <div className="space-y-4">
          <div className="ui-card p-5">
            <h3 className="mb-3 font-semibold text-brand-secondary">공급자 전자서명</h3>
            {contract.providerSignaturePath ? (
              <p className="mb-2 text-sm text-green-600">서명 완료 ({formatDateTime(String(contract.providerSignedAt))})</p>
            ) : null}
            <input className={`${inputClass} mb-2 max-w-xs`} value={sigName} onChange={(e) => setSigName(e.target.value)} placeholder="서명자 이름" />
            <input className={`${inputClass} mb-2 max-w-xs`} value={sigTitle} onChange={(e) => setSigTitle(e.target.value)} placeholder="직책" />
            <SignatureCanvas ref={sigRef} className="max-w-md" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => sigRef.current?.clear()} className="ui-btn ui-btn-secondary ui-btn-sm">지우기</button>
              <button type="button" onClick={saveProviderSig} className="ui-btn ui-btn-primary ui-btn-sm">전자서명</button>
              {Boolean(contract.providerSignaturePath) && (
                <button type="button" onClick={async () => { if (confirm("서명을 삭제하시겠습니까?")) { await fetch(`/api/admin/contracts/${id}/provider-signature`, { method: "DELETE" }); fetchContract(); showToast("삭제되었습니다"); } }} className="ui-btn ui-btn-danger ui-btn-sm">서명 삭제</button>
              )}
            </div>
          </div>

          <div className="ui-card p-5">
            <h3 className="mb-3 font-semibold text-brand-secondary">고객 계약 링크</h3>
            {contractSignToken || latestContractShareUrl ? (
              <div className="space-y-2 text-sm">
                {contractSignToken && (
                  <>
                    <p>상태: {contractSignToken.isActive ? "활성" : "비활성"}</p>
                    {Boolean(contractSignToken.lastAccessedAt) && (
                      <p>마지막 접근: {formatDateTime(String(contractSignToken.lastAccessedAt))}</p>
                    )}
                  </>
                )}
                {contractShareDisplayUrl && (
                  <p className="break-all text-brand-primary">{contractShareDisplayUrl}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyContractShareUrl}
                    disabled={creatingContractLink}
                    className="ui-btn ui-btn-primary ui-btn-sm disabled:opacity-50"
                  >
                    계약 링크 복사
                  </button>
                  <button
                    type="button"
                    onClick={createContractLink}
                    disabled={creatingContractLink}
                    className="ui-btn ui-btn-secondary ui-btn-sm disabled:opacity-50"
                  >
                    {creatingContractLink ? "링크 생성 중..." : "링크 새로 발급"}
                  </button>
                  {contractSignToken?.isActive === true && (
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/contracts/${id}/contract-share`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isActive: false }),
                        });
                        setLatestContractShareUrl(null);
                        fetchContract();
                        showToast("링크가 비활성화되었습니다");
                      }}
                      className="ui-btn ui-btn-secondary ui-btn-sm"
                    >
                      비활성화
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={createContractLink}
                disabled={!contract.providerSignedAt || creatingContractLink}
                className="ui-btn ui-btn-primary ui-btn-sm disabled:opacity-50"
              >
                {creatingContractLink ? "링크 생성 중..." : "링크 생성"}
              </button>
            )}
          </div>

          <div className="ui-card p-5">
            <h3 className="mb-3 font-semibold text-brand-secondary">파일 제출 링크</h3>
            {uploadSignToken ? (
              <div className="space-y-2 text-sm">
                <p>상태: {uploadSignToken.isActive ? "활성" : "비활성"} | 파일 {files.length}개</p>
                {uploadShareDisplayUrl && (
                  <p className="break-all text-brand-primary">{uploadShareDisplayUrl}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={copyUploadShareUrl} className="ui-btn ui-btn-primary ui-btn-sm">파일 링크 복사</button>
                  <button onClick={createUploadLink} className="ui-btn ui-btn-secondary ui-btn-sm">링크 새로 발급</button>
                </div>
              </div>
            ) : (
              <button onClick={createUploadLink} className="ui-btn ui-btn-primary ui-btn-sm">링크 생성</button>
            )}
          </div>
        </div>
      )}

      {tab === "files" && (
        <div className="ui-card">
          <table className="ui-table">
            <thead><tr><th>카테고리</th><th>파일명</th><th>크기</th><th>업로드</th><th></th></tr></thead>
            <tbody>
              {files.map((f) => (
                <tr key={String(f.id)}>
                  <td>{FILE_CATEGORY_LABELS[String(f.category)]}</td>
                  <td>{String(f.originalName)}</td>
                  <td>{formatFileSize(Number(f.fileSize))}</td>
                  <td>{formatDateTime(String(f.createdAt))}</td>
                  <td className="whitespace-nowrap">
                    <a href={`/api/admin/files/${f.id}/preview`} target="_blank" className="ui-link mr-3">미리보기</a>
                    <a href={`/api/admin/files/${f.id}/download`} className="ui-link mr-3">다운로드</a>
                    <button onClick={async () => { if (confirm("파일을 삭제하시겠습니까?")) { await fetch(`/api/admin/files/${f.id}`, { method: "DELETE" }); fetchContract(); showToast("삭제되었습니다"); } }} className="text-sm text-red-600 hover:underline">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {files.length === 0 && (
            <div className="ui-empty-state py-12">
              <p className="ui-empty-desc">제출된 파일이 없습니다</p>
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="ui-card">
          {history.map((h) => (
            <div key={String(h.id)} className="border-b border-gray-100 px-4 py-3 text-sm">
              <p className="font-medium">{String(h.action)}</p>
              <p className="text-gray-600">{String(h.description)}</p>
              <p className="text-xs text-gray-400">{formatDateTime(String(h.createdAt))} · {String(h.actorType)}</p>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={deleteOpen}
        title="계약서 삭제"
        message={"계약서를 삭제하시겠습니까?\n삭제된 계약서는 복구할 수 없습니다."}
        cancelLabel="취소"
        confirmLabel="삭제"
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </AdminLayoutClient>
  );
}

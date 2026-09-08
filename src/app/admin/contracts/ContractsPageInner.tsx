"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { LoadingSpinner, EmptyState } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { formatCurrency, formatDate } from "@/lib/format";
import { STATUS_LABELS, CONTRACT_TYPE_BADGE } from "@/lib/constants";
import { ContractTypeBadge } from "@/components/ui/ContractTypeBadge";

interface ContractRow {
  id: string;
  contractNumber: string;
  companyName: string;
  representativeName: string;
  contactName: string | null;
  phone: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  contractType: string;
  status: string;
  providerSignedAt: string | null;
  customerSignedAt: string | null;
  createdAt: string;
  _count: { uploadedFiles: number };
}

export default function ContractsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorDetail, setLoadErrorDetail] = useState<unknown>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContractRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    companyName: searchParams.get("companyName") || "",
    contactName: searchParams.get("contactName") || "",
    phone: searchParams.get("phone") || "",
    contractNumber: searchParams.get("contractNumber") || "",
    status: searchParams.get("status") || "",
    contractType: searchParams.get("contractType") || "",
  });
  const [query, setQuery] = useState(filters);
  const initialLoad = useRef(true);

  useEffect(() => {
    if (filters === query) return;
    const timer = window.setTimeout(() => setQuery(filters), 280);
    return () => window.clearTimeout(timer);
  }, [filters, query]);

  const fetchContracts = useCallback(async (signal?: AbortSignal) => {
    if (initialLoad.current) setLoading(true);
    setLoadError(null);
    setLoadErrorDetail(null);
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => v && params.set(k, v));
    router.replace(`/admin/contracts?${params.toString()}`, { scroll: false });
    try {
      const res = await fetch(`/api/admin/contracts?${params.toString()}`, { signal });
      const data = await res.json();
      if (signal?.aborted) return;
      if (data.success) {
        setContracts(data.data.contracts);
      } else {
        setLoadError(data.message || "계약 목록을 불러올 수 없습니다");
        setLoadErrorDetail(data.error ?? null);
        setContracts([]);
      }
    } catch (fetchErr) {
      if (signal?.aborted || (fetchErr instanceof DOMException && fetchErr.name === "AbortError")) {
        return;
      }
      setLoadError(fetchErr instanceof Error ? fetchErr.message : "계약 목록을 불러올 수 없습니다");
      setContracts([]);
    } finally {
      initialLoad.current = false;
      if (!signal?.aborted) setLoading(false);
    }
  }, [query, router]);

  useEffect(() => {
    const ac = new AbortController();
    void fetchContracts(ac.signal);
    return () => ac.abort();
  }, [fetchContracts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/contracts/${deleteTarget.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    setDeleteTarget(null);
    if (data.success) {
      showToast("계약서가 삭제되었습니다");
      fetchContracts();
    } else {
      showToast(data.message || "삭제에 실패했습니다", "error");
    }
  };

  return (
    <AdminLayoutClient
      title="계약관리"
      description="계약 목록을 검색하고 관리합니다"
      actions={
        <Link href="/admin/contracts/new" className="ui-btn ui-btn-primary ui-btn-sm">
          <Plus size={16} />
          새 계약 만들기
        </Link>
      }
    >
      <div className="ui-filter-bar grid-cols-2 md:grid-cols-6">
        {[
          { key: "companyName", placeholder: "업체명 검색" },
          { key: "contactName", placeholder: "대표자 검색" },
          { key: "phone", placeholder: "연락처 검색" },
          { key: "contractNumber", placeholder: "계약번호 검색" },
        ].map(({ key, placeholder }) => (
          <input
            key={key}
            placeholder={placeholder}
            value={filters[key as keyof typeof filters]}
            onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
            className="ui-input"
          />
        ))}
        <select
          value={filters.contractType}
          onChange={(e) => setFilters({ ...filters, contractType: e.target.value })}
          className="ui-input"
        >
          <option value="">전체 유형</option>
          {Object.entries(CONTRACT_TYPE_BADGE).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="ui-input"
        >
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : loadError ? (
        <div className="ui-alert ui-alert-error">
          <p className="font-semibold">{loadError}</p>
          {loadErrorDetail ? (
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs opacity-90">
              {JSON.stringify(loadErrorDetail, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : contracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="등록된 계약이 없습니다"
          description="새 계약을 만들어 고객과의 서비스 계약을 시작하세요."
          actionLabel="새 계약 만들기"
          actionHref="/admin/contracts/new"
        />
      ) : (
        <div className="overflow-x-auto ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>계약번호</th>
                <th>유형</th>
                <th>업체명</th>
                <th>대표자</th>
                <th>연락처</th>
                <th>기간</th>
                <th>금액</th>
                <th>상태</th>
                <th>공급자</th>
                <th>고객</th>
                <th>파일</th>
                <th>생성일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/contracts/${c.id}`} className="cell-contract ui-link">
                      {c.contractNumber}
                    </Link>
                  </td>
                  <td><ContractTypeBadge contractType={c.contractType} /></td>
                  <td className="font-semibold text-brand-text">{c.companyName}</td>
                  <td>{c.representativeName || "-"}</td>
                  <td className="text-brand-muted">{c.phone}</td>
                  <td className="whitespace-nowrap text-brand-muted">
                    {formatDate(c.startDate)} ~ {formatDate(c.endDate)}
                  </td>
                  <td className="cell-amount">{formatCurrency(c.totalAmount)}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{c.providerSignedAt ? "✓" : "—"}</td>
                  <td>{c.customerSignedAt ? "✓" : "—"}</td>
                  <td>{c._count.uploadedFiles}</td>
                  <td className="text-brand-muted">{formatDate(c.createdAt)}</td>
                  <td>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="text-sm font-medium text-brand-error transition-colors hover:text-brand-error/80"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="계약서 삭제"
        message={"계약서를 삭제하시겠습니까?\n삭제된 계약서는 복구할 수 없습니다."}
        cancelLabel="취소"
        confirmLabel="삭제"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </AdminLayoutClient>
  );
}

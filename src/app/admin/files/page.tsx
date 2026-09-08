"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { LoadingSpinner, EmptyState } from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { FILE_CATEGORY_LABELS } from "@/lib/constants";

interface FileRow {
  id: string;
  category: string;
  originalName: string;
  fileSize: number;
  createdAt: string;
  contract: { id: string; contractNumber: string; companyName: string };
}

export default function FilesPage() {
  const { showToast } = useToast();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ companyName: "", contractNumber: "", category: "" });
  const [query, setQuery] = useState(filters);
  const initialLoad = useRef(true);

  useEffect(() => {
    if (filters === query) return;
    const timer = window.setTimeout(() => setQuery(filters), 280);
    return () => window.clearTimeout(timer);
  }, [filters, query]);

  const fetchFiles = useCallback(async (signal?: AbortSignal) => {
    if (initialLoad.current) setLoading(true);
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => v && params.set(k, v));
    try {
      const res = await fetch(`/api/admin/files?${params.toString()}`, { signal });
      const data = await res.json();
      if (signal?.aborted) return;
      if (data.success) setFiles(data.data.files);
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
    } finally {
      initialLoad.current = false;
      if (!signal?.aborted) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const ac = new AbortController();
    void fetchFiles(ac.signal);
    return () => ac.abort();
  }, [fetchFiles]);

  const handleDelete = async (fileId: string) => {
    if (!confirm("파일을 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/admin/files/${fileId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { showToast("삭제되었습니다"); fetchFiles(); }
    else showToast(data.message, "error");
  };

  return (
    <AdminLayoutClient title="파일관리" description="제출된 파일을 확인하고 관리합니다">
      <div className="ui-filter-bar grid-cols-1 md:grid-cols-3">
        <input placeholder="업체명 검색" value={filters.companyName} onChange={(e) => setFilters({ ...filters, companyName: e.target.value })} className="ui-input" />
        <input placeholder="계약번호 검색" value={filters.contractNumber} onChange={(e) => setFilters({ ...filters, contractNumber: e.target.value })} className="ui-input" />
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="ui-input">
          <option value="">전체 카테고리</option>
          {Object.entries(FILE_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="제출된 파일이 없습니다"
          description="고객이 파일 업로드 링크를 통해 제출하면 여기에 표시됩니다."
        />
      ) : (
        <div className="overflow-x-auto ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>업체명</th>
                <th>계약번호</th>
                <th>카테고리</th>
                <th>파일명</th>
                <th>크기</th>
                <th>업로드</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td className="font-semibold text-brand-text">{f.contract.companyName}</td>
                  <td>
                    <Link href={`/admin/contracts/${f.contract.id}`} className="cell-contract ui-link">
                      {f.contract.contractNumber}
                    </Link>
                  </td>
                  <td>
                    <span className="ui-badge ui-badge-draft">
                      <span className="ui-badge-dot" />
                      {FILE_CATEGORY_LABELS[f.category]}
                    </span>
                  </td>
                  <td>{f.originalName}</td>
                  <td className="cell-amount">{formatFileSize(f.fileSize)}</td>
                  <td className="text-brand-muted">{formatDateTime(f.createdAt)}</td>
                  <td className="whitespace-nowrap">
                    <a href={`/api/admin/files/${f.id}/preview`} target="_blank" className="ui-link mr-3 text-sm">미리보기</a>
                    <a href={`/api/admin/files/${f.id}/download`} className="ui-link mr-3 text-sm">다운로드</a>
                    <button onClick={() => handleDelete(f.id)} className="text-sm font-medium text-brand-error hover:text-brand-error/80">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayoutClient>
  );
}

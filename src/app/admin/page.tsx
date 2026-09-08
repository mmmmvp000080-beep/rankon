"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderX,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { LoadingSpinner } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";

interface DashboardData {
  stats: {
    total: number;
    draft: number;
    customerPending: number;
    completed: number;
    contractsWithoutFiles: number;
  };
  recentContracts: Array<{
    id: string;
    contractNumber: string;
    companyName: string;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
}

const STAT_CONFIG = [
  { key: "total", icon: FileText, color: "text-brand-primary", bg: "bg-brand-primary-soft", accent: "from-brand-primary/10" },
  { key: "draft", icon: Clock, color: "text-brand-text-muted", bg: "bg-brand-bg-alt", accent: "from-brand-bg-alt" },
  { key: "customerPending", icon: AlertCircle, color: "text-brand-warning", bg: "bg-brand-warning-soft", accent: "from-brand-warning/10" },
  { key: "completed", icon: CheckCircle2, color: "text-brand-success", bg: "bg-brand-success-soft", accent: "from-brand-success/10" },
  { key: "contractsWithoutFiles", icon: FolderX, color: "text-brand-error", bg: "bg-brand-error-soft", accent: "from-brand-error/10" },
] as const;

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<unknown>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
          return;
        }
        setError(d.message || "대시보드 데이터를 불러올 수 없습니다");
        setErrorDetail(d.error ?? null);
      })
      .catch((fetchErr) => {
        setError(fetchErr instanceof Error ? fetchErr.message : "대시보드 데이터를 불러올 수 없습니다");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayoutClient title="대시보드"><LoadingSpinner /></AdminLayoutClient>;

  if (error) {
    return (
      <AdminLayoutClient title="대시보드">
        <div className="ui-alert ui-alert-error">
          <p className="font-semibold">{error}</p>
          {errorDetail ? (
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs opacity-90">
              {JSON.stringify(errorDetail, null, 2)}
            </pre>
          ) : null}
        </div>
      </AdminLayoutClient>
    );
  }

  if (!data) {
    return (
      <AdminLayoutClient title="대시보드">
        <div className="ui-alert ui-alert-error">대시보드 데이터를 불러올 수 없습니다.</div>
      </AdminLayoutClient>
    );
  }

  const statLabels: Record<string, string> = {
    total: "전체 계약",
    draft: "작성중",
    customerPending: "고객 서명 대기",
    completed: "계약 완료",
    contractsWithoutFiles: "파일 미제출",
  };

  return (
    <AdminLayoutClient
      title="대시보드"
      description="운영 현황을 한눈에 확인하세요"
      actions={
        <>
          <Link href="/admin/contracts/new" className="ui-btn ui-btn-primary ui-btn-sm">
            <Plus size={16} />
            새 계약 만들기
          </Link>
          <Link href="/admin/contracts" className="ui-btn ui-btn-secondary ui-btn-sm">
            전체 계약
            <ArrowRight size={14} />
          </Link>
        </>
      }
    >
      <div className="mb-6 flex items-center gap-2 text-sm text-brand-muted">
        <TrendingUp size={16} className="text-brand-primary" />
        <span>실시간 운영 지표</span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {STAT_CONFIG.map(({ key, icon: Icon, color, bg }) => (
          <div key={key} className="ui-stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.8125rem] font-medium text-brand-muted">{statLabels[key]}</p>
                <p className="mt-2 text-[1.75rem] font-bold tracking-tight text-brand-text">
                  {data.stats[key as keyof typeof data.stats]}
                </p>
              </div>
              <div className={`ui-stat-icon ${bg}`}>
                <Icon size={18} className={color} strokeWidth={1.75} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 ui-table-wrap">
        <div className="ui-section-header">
          <h2 className="ui-section-title">최근 계약</h2>
          <Link href="/admin/contracts" className="ui-link text-sm">
            전체 보기 →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="ui-table">
            <thead>
              <tr>
                <th>계약번호</th>
                <th>업체명</th>
                <th>금액</th>
                <th>상태</th>
                <th>생성일</th>
              </tr>
            </thead>
            <tbody>
              {data.recentContracts.map((c) => (
                <tr key={c.id} className="group">
                  <td>
                    <Link href={`/admin/contracts/${c.id}`} className="cell-contract ui-link">
                      {c.contractNumber}
                    </Link>
                  </td>
                  <td className="font-semibold text-brand-text">{c.companyName}</td>
                  <td className="cell-amount">{formatCurrency(c.totalAmount)}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="text-brand-muted">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayoutClient>
  );
}

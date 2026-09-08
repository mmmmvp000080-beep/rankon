"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { CONTRACT_TYPES } from "@/lib/contract-type";
import { CONTRACT_TYPE_BADGE, CONTRACT_TYPE_TITLES } from "@/lib/constants";
import type { ContractType } from "@/generated/prisma/client";

interface TemplateClause {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
}

interface ContractTemplateEditorProps {
  purposeValue: string;
  purposeGuaranteeValue: string;
  onPurposeChange: (value: string) => void;
  onPurposeGuaranteeChange: (value: string) => void;
  onSavePurpose: () => Promise<void>;
  savingPurpose: boolean;
}

export function ContractTemplateEditor({
  purposeValue,
  purposeGuaranteeValue,
  onPurposeChange,
  onPurposeGuaranteeChange,
  onSavePurpose,
  savingPurpose,
}: ContractTemplateEditorProps) {
  const { showToast } = useToast();
  const [templateTab, setTemplateTab] = useState<ContractType>("NAVER_PLACE_MONTHLY_MANAGEMENT");
  const [clausesByType, setClausesByType] = useState<Record<ContractType, TemplateClause[]>>({
    NAVER_PLACE_MONTHLY_MANAGEMENT: [],
    NAVER_PLACE_MONTHLY_GUARANTEE: [],
  });
  const [errorsByType, setErrorsByType] = useState<Partial<Record<ContractType, string>>>({});
  const [loadingByType, setLoadingByType] = useState<Partial<Record<ContractType, boolean>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "" });
  const [newClause, setNewClause] = useState({ title: "", content: "" });

  const loadTemplate = useCallback(async (contractType: ContractType) => {
    setLoadingByType((prev) => ({ ...prev, [contractType]: true }));
    setErrorsByType((prev) => ({ ...prev, [contractType]: undefined }));
    try {
      const res = await fetch(`/api/admin/contract-template?contractType=${contractType}`);
      const data = await res.json();
      if (data.success) {
        setClausesByType((prev) => ({
          ...prev,
          [contractType]: data.data.clauses ?? [],
        }));
      } else {
        setErrorsByType((prev) => ({
          ...prev,
          [contractType]: data.message || "계약 조항을 불러올 수 없습니다",
        }));
      }
    } catch {
      setErrorsByType((prev) => ({
        ...prev,
        [contractType]: "계약 조항을 불러올 수 없습니다",
      }));
    } finally {
      setLoadingByType((prev) => ({ ...prev, [contractType]: false }));
    }
  }, []);

  useEffect(() => {
    for (const type of CONTRACT_TYPES) {
      void loadTemplate(type);
    }
  }, [loadTemplate]);

  const clauses = clausesByType[templateTab];
  const templateError = errorsByType[templateTab];
  const templateLoading = loadingByType[templateTab];

  const addClause = async () => {
    if (!newClause.title.trim() || !newClause.content.trim()) {
      showToast("조항 제목과 내용을 입력하세요", "error");
      return;
    }
    const res = await fetch("/api/admin/contract-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newClause, contractType: templateTab }),
    });
    const data = await res.json();
    if (data.success) {
      setClausesByType((prev) => ({
        ...prev,
        [templateTab]: [...prev[templateTab], data.data.clause],
      }));
      setNewClause({ title: "", content: "" });
      showToast("조항이 추가되었습니다");
    } else showToast(data.message, "error");
  };

  const saveClause = async (id: string) => {
    const res = await fetch("/api/admin/contract-template", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editForm }),
    });
    const data = await res.json();
    if (data.success) {
      setClausesByType((prev) => ({
        ...prev,
        [templateTab]: prev[templateTab].map((c) => (c.id === id ? data.data.clause : c)),
      }));
      setEditingId(null);
      showToast("조항이 수정되었습니다");
    } else showToast(data.message, "error");
  };

  const deleteClause = async (id: string) => {
    if (!confirm("이 조항을 삭제하시겠습니까?")) return;
    const res = await fetch(
      `/api/admin/contract-template?id=${id}&contractType=${templateTab}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    if (data.success) {
      setClausesByType((prev) => ({
        ...prev,
        [templateTab]: prev[templateTab].filter((c) => c.id !== id),
      }));
      showToast("조항이 삭제되었습니다");
    } else showToast(data.message, "error");
  };

  const moveClause = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= clauses.length) return;
    const reordered = [...clauses];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const items = reordered.map((c, i) => ({ id: c.id, sortOrder: i }));
    const res = await fetch("/api/admin/contract-template", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractType: templateTab, items }),
    });
    const data = await res.json();
    if (data.success) {
      setClausesByType((prev) => ({ ...prev, [templateTab]: data.data.clauses }));
    } else showToast(data.message, "error");
  };

  const purposeField =
    templateTab === "NAVER_PLACE_MONTHLY_GUARANTEE" ? purposeGuaranteeValue : purposeValue;
  const setPurposeField =
    templateTab === "NAVER_PLACE_MONTHLY_GUARANTEE" ? onPurposeGuaranteeChange : onPurposeChange;

  return (
    <>
      <div className="ui-tabs">
        {CONTRACT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTemplateTab(type)}
            className={`ui-tab ${templateTab === type ? "ui-tab-active" : ""}`}
          >
            {CONTRACT_TYPE_BADGE[type]} 계약서
          </button>
        ))}
      </div>

      <div className="max-w-3xl ui-card p-5">
        <h3 className="mb-1 font-semibold text-brand-secondary">
          {CONTRACT_TYPE_TITLES[templateTab]}
        </h3>
        <p className="mb-3 text-sm text-brand-muted">
          {CONTRACT_TYPE_BADGE[templateTab]} 계약 생성 시 적용되는 기본 계약 목적입니다.
        </p>
        <textarea
          className="ui-input min-h-24 w-full"
          value={purposeField}
          onChange={(e) => setPurposeField(e.target.value)}
          placeholder="계약 목적"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onSavePurpose}
            disabled={savingPurpose}
            className="ui-btn ui-btn-primary ui-btn-sm"
          >
            {savingPurpose ? "저장 중..." : "계약 목적 저장"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl ui-card p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="mb-2 font-semibold text-brand-secondary">계약 조항 템플릿</h3>
            <p className="text-sm text-brand-muted">
              {CONTRACT_TYPE_BADGE[templateTab]} 계약 생성 시 현재 템플릿이 복사됩니다. 이미 서명된
              계약은 템플릿 변경의 영향을 받지 않습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadTemplate(templateTab)}
            className="ui-btn ui-btn-secondary ui-btn-sm shrink-0"
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            재시도
          </button>
        </div>

        {templateLoading ? (
          <p className="text-sm text-brand-muted">조항을 불러오는 중...</p>
        ) : templateError ? (
          <div className="ui-alert ui-alert-error">
            <p className="font-semibold">{templateError}</p>
          </div>
        ) : null}

        {!templateLoading && !templateError && (
          <div className="space-y-3">
            {clauses.length === 0 && (
              <p className="rounded-lg border border-brand-border bg-brand-bg-secondary/40 px-4 py-3 text-sm text-brand-muted">
                저장된 조항이 없습니다. 아래에서 새 조항을 추가하거나 재시도하세요.
              </p>
            )}
            {clauses.map((clause, index) => (
              <div key={clause.id} className="rounded-lg border border-brand-border p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-brand-primary">제{index + 1}조</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveClause(index, -1)}
                      disabled={index === 0}
                      className="ui-btn ui-btn-ghost ui-btn-sm p-1"
                      aria-label="위로"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClause(index, 1)}
                      disabled={index === clauses.length - 1}
                      className="ui-btn ui-btn-ghost ui-btn-sm p-1"
                      aria-label="아래로"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(clause.id);
                        setEditForm({ title: clause.title, content: clause.content });
                      }}
                      className="ui-btn ui-btn-secondary ui-btn-sm"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteClause(clause.id)}
                      className="ui-btn ui-btn-danger ui-btn-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {editingId === clause.id ? (
                  <div className="space-y-2">
                    <input
                      className="ui-input w-full"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="조항 제목"
                    />
                    <textarea
                      className="ui-input min-h-28 w-full"
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      placeholder="조항 내용"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveClause(clause.id)}
                        className="ui-btn ui-btn-primary ui-btn-sm"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="ui-btn ui-btn-secondary ui-btn-sm"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-brand-secondary">{clause.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-brand-muted">{clause.content}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {!templateLoading && (
          <div className="mt-4 rounded-lg border border-dashed border-brand-border p-4">
            <p className="mb-2 text-sm font-medium text-brand-secondary">새 조항 추가</p>
            <input
              className="ui-input mb-2 w-full"
              value={newClause.title}
              onChange={(e) => setNewClause({ ...newClause, title: e.target.value })}
              placeholder="조항 제목 (예: 목적)"
            />
            <textarea
              className="ui-input mb-3 min-h-24 w-full"
              value={newClause.content}
              onChange={(e) => setNewClause({ ...newClause, content: e.target.value })}
              placeholder="조항 내용"
            />
            <button type="button" onClick={addClause} className="ui-btn ui-btn-primary ui-btn-sm">
              <Plus className="mr-1 h-3.5 w-3.5" /> 조항 추가
            </button>
          </div>
        )}
      </div>
    </>
  );
}

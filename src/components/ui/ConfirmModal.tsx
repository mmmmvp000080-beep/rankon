"use client";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-[12px] bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-brand-text">{title}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={loading} className="ui-btn ui-btn-secondary ui-btn-sm">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="ui-btn ui-btn-danger ui-btn-sm">
            {loading ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

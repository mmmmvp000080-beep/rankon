import Link from "next/link";
import { LucideIcon } from "lucide-react";

export function LoadingSpinner({ text = "로딩 중..." }: { text?: string }) {
  return (
    <div className="ui-loading">
      <div className="ui-loading-spinner" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="ui-empty-state ui-card">
      <div className="ui-empty-icon">
        <Icon size={28} className="text-brand-primary" strokeWidth={1.5} />
      </div>
      <p className="ui-empty-title">{title}</p>
      {description && <p className="ui-empty-desc">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="ui-btn ui-btn-primary ui-btn-sm">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button type="button" onClick={onAction} className="ui-btn ui-btn-primary ui-btn-sm">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

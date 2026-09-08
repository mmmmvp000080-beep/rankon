import { STATUS_LABELS } from "@/lib/constants";

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "ui-badge-draft",
  PROVIDER_SIGNED: "ui-badge-provider",
  CUSTOMER_PENDING: "ui-badge-pending",
  COMPLETED: "ui-badge-completed",
  CANCELLED: "ui-badge-cancelled",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASS[status] || "ui-badge-draft";
  return (
    <span className={`ui-badge ${cls}`}>
      <span className="ui-badge-dot" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

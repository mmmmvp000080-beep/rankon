import { CONTRACT_TYPE_BADGE } from "@/lib/constants";
import { DEFAULT_CONTRACT_TYPE } from "@/lib/contract-type";

interface ContractTypeBadgeProps {
  contractType?: string | null;
  className?: string;
}

export function ContractTypeBadge({ contractType, className = "" }: ContractTypeBadgeProps) {
  const type = contractType || DEFAULT_CONTRACT_TYPE;
  const label = CONTRACT_TYPE_BADGE[type] || CONTRACT_TYPE_BADGE[DEFAULT_CONTRACT_TYPE];
  const isGuarantee = type === "NAVER_PLACE_MONTHLY_GUARANTEE";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isGuarantee
          ? "bg-brand-warning-soft text-brand-warning"
          : "bg-brand-primary-soft text-brand-primary"
      } ${className}`}
    >
      {label}
    </span>
  );
}

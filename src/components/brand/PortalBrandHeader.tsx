import { BrandLogo } from "@/components/brand/BrandLogo";
import { LOGO_HEIGHT } from "@/lib/logo-assets";
import { PROVIDER_PORTAL_BRAND_LABEL } from "@/lib/provider-company-display";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface PortalBrandHeaderProps {
  contractNumber?: string;
  status?: string;
  documentTitle?: string;
  subtitle?: string;
}

/** Shared brand header for customer-facing pages */
export function PortalBrandHeader({
  contractNumber,
  status,
  documentTitle = "서비스 계약서",
  subtitle,
}: PortalBrandHeaderProps) {
  return (
    <header className="ui-portal-brand-header">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-6 md:px-8 md:py-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo layout="full" color="white" height={LOGO_HEIGHT.portal} priority maxWidth={280} />
          <div className="hidden sm:block sm:text-right">
            {contractNumber && (
              <p className="font-mono text-xs text-white/60">{contractNumber}</p>
            )}
            {status && (
              <div className="mt-1.5 flex justify-end">
                <StatusBadge status={status} />
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            {subtitle || PROVIDER_PORTAL_BRAND_LABEL}
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-white md:text-2xl">
            {documentTitle}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
            {contractNumber && (
              <span className="font-mono text-xs text-white/60">{contractNumber}</span>
            )}
            {status && <StatusBadge status={status} />}
          </div>
        </div>
      </div>
    </header>
  );
}

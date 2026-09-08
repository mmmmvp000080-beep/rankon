import type { ContractPdfViewModel } from "@/lib/pdf-html/types";
import { PROVIDER_COMPANY_PDF_FOOTER_LABEL } from "@/lib/provider-company-display";
import { esc } from "./utils";

interface Props {
  data: ContractPdfViewModel;
}

/** Page numbers are rendered via Chromium footerTemplate; this component documents footer metadata. */
export function ContractFooter({ data }: Props) {
  return (
    <footer className="contract-footer" aria-hidden="true">
      {PROVIDER_COMPANY_PDF_FOOTER_LABEL} · {esc(data.contractNumber)}
    </footer>
  );
}

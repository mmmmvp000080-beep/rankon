import type { ContractPdfViewModel } from "@/lib/pdf-html/types";
import { ContractHeader } from "./ContractHeader";
import { ContractSummary } from "./ContractSummary";
import { ServiceConditions } from "./ServiceConditions";
import { ContractClauses } from "./ContractClauses";
import { SpecialTerms } from "./SpecialTerms";
import { SignatureSection } from "./SignatureSection";
import { ContractVerification } from "./ContractVerification";
import { ContractFooter } from "./ContractFooter";

interface Props {
  data: ContractPdfViewModel;
}

export function ContractDocument({ data }: Props) {
  return (
    <div className="document">
      <ContractHeader data={data} />
      <ContractSummary data={data} />
      <ServiceConditions data={data} />
      <ContractClauses data={data} />
      <SpecialTerms data={data} />
      <SignatureSection data={data} />
      <ContractVerification data={data} />
    </div>
  );
}

export { ContractHeader, ContractSummary, ServiceConditions, ContractClauses, SpecialTerms, SignatureSection, ContractVerification, ContractFooter };

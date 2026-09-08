import type { ContractPdfViewModel } from "@/lib/pdf-html/types";
import { esc } from "./utils";

interface Props {
  data: ContractPdfViewModel;
}

export function SpecialTerms({ data }: Props) {
  return (
    <section>
      <h2 className="section-title">특약사항</h2>
      <div className="panel">
        {data.specialTerms ? (
          <div className="special-content">{esc(data.specialTerms)}</div>
        ) : (
          <div className="special-empty">별도 특약사항 없음</div>
        )}
      </div>
    </section>
  );
}

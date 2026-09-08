import type { ContractPdfViewModel } from "@/lib/pdf-html/types";
import { esc } from "./utils";

interface Props {
  data: ContractPdfViewModel;
}

export function ContractSummary({ data }: Props) {
  return (
    <section>
      <h2 className="section-title">계약 요약</h2>
      <div className="panel">
        <div className="summary-grid">
          <div>
            <span className="field-label">고객사</span>
            <span className="field-value">{esc(data.customerCompany)}</span>
          </div>
          <div>
            <span className="field-label">계약 상품</span>
            <span className="field-value">{esc(data.productName)}</span>
          </div>
          <div>
            <span className="field-label">대표자</span>
            <span className="field-value">{esc(data.representativeName)}</span>
          </div>
          <div>
            <span className="field-label">계약기간</span>
            <span className="field-value">{esc(data.contractPeriod)}</span>
          </div>
          <div>
            <span className="field-label">계약금액</span>
            <span className="field-value field-value-accent">
              {esc(data.totalAmount)} ({esc(data.vatLabel)})
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

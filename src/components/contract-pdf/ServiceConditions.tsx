import type { ContractPdfViewModel } from "@/lib/pdf-html/types";
import { esc } from "./utils";

interface Props {
  data: ContractPdfViewModel;
}

export function ServiceConditions({ data }: Props) {
  return (
    <section>
      <h2 className="section-title">서비스 조건</h2>
      <div className="panel">
        <div className="service-type-label">서비스 유형</div>
        <div className="service-type-value">{esc(data.serviceTypeLabel)}</div>
        <div className="service-scope-label">{esc(data.serviceScopeTitle)}</div>
        <ul className={`service-list${data.isGuarantee ? " single-col" : ""}`}>
          {data.serviceItems.map((item) => (
            <li key={item} className="service-item">
              {esc(item)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import type { ContractPdfViewModel } from "@/lib/pdf-html/types";
import { esc } from "./utils";

interface Props {
  data: ContractPdfViewModel;
}

export function ContractClauses({ data }: Props) {
  if (data.clauses.length === 0) return null;
  return (
    <section>
      <h2 className="section-title">계약 조항</h2>
      {data.clauses.map((clause) => (
        <div key={clause.num} className="clause">
          <div className="clause-number">{clause.num}</div>
          <div className="clause-content">
            <h3>{esc(clause.title)}</h3>
            <p>{esc(clause.content)}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

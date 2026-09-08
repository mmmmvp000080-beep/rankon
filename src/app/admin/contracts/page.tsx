import { Suspense } from "react";
import ContractsPageInner from "./ContractsPageInner";

export default function ContractsPage() {
  return (
    <Suspense fallback={<div className="p-6">로딩 중...</div>}>
      <ContractsPageInner />
    </Suspense>
  );
}

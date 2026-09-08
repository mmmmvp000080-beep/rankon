"use client";

import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "계약 생성" },
  { id: 2, label: "회사 서명 완료" },
  { id: 3, label: "고객 확인" },
  { id: 4, label: "고객 서명" },
  { id: 5, label: "계약 완료" },
] as const;

interface ContractProgressProps {
  currentStep: number;
}

export function ContractProgress({ currentStep }: ContractProgressProps) {
  return (
    <div className="contract-progress">
      <div className="contract-progress-track" aria-hidden />
      <ol className="contract-progress-steps">
        {STEPS.map((step) => {
          const done = step.id < currentStep;
          const active = step.id === currentStep;
          return (
            <li
              key={step.id}
              className={`contract-progress-step${done ? " is-done" : ""}${active ? " is-active" : ""}`}
            >
              <span className="contract-progress-dot" aria-hidden>
                {done ? <Check size={12} strokeWidth={2.5} /> : step.id}
              </span>
              <span className="contract-progress-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function resolveContractStep(input: {
  status?: string | null;
  providerSignedAt?: string | null;
  customerSignedAt?: string | null;
}): number {
  if (input.status === "COMPLETED" && input.customerSignedAt) return 5;
  if (input.customerSignedAt) return 4;
  if (input.providerSignedAt) return 3;
  return 2;
}

"use client";

import { SignatureCanvas, SignatureCanvasRef } from "@/components/SignatureCanvas";

interface AgreementChecks {
  content: boolean;
  privacy: boolean;
  electronic: boolean;
}

interface ContractSignPanelProps {
  checks: AgreementChecks;
  onCheckChange: (key: keyof AgreementChecks, value: boolean) => void;
  signerName: string;
  onSignerNameChange: (value: string) => void;
  signerTitle: string;
  onSignerTitleChange: (value: string) => void;
  submitting: boolean;
  onSubmit: () => void;
  sigRef: React.RefObject<SignatureCanvasRef | null>;
}

const CHECK_ITEMS: { key: keyof AgreementChecks; label: string }[] = [
  { key: "content", label: "계약 내용을 모두 확인했습니다." },
  { key: "privacy", label: "개인정보 처리에 동의합니다." },
  { key: "electronic", label: "전자계약에 동의합니다." },
];

export function ContractSignPanel({
  checks,
  onCheckChange,
  signerName,
  onSignerNameChange,
  signerTitle,
  onSignerTitleChange,
  submitting,
  onSubmit,
  sigRef,
}: ContractSignPanelProps) {
  const allAgreed = checks.content && checks.privacy && checks.electronic;
  const canSubmit = allAgreed && signerName.trim().length > 0 && !submitting;

  return (
    <section className="contract-sign-panel portal-reveal">
      <h2 className="contract-section-title">고객 확인 및 전자서명</h2>

      <div className="contract-checklist">
        {CHECK_ITEMS.map((item) => (
          <label key={item.key} className="contract-check-item">
            <input
              type="checkbox"
              checked={checks[item.key]}
              onChange={(e) => onCheckChange(item.key, e.target.checked)}
              className="contract-check-input"
            />
            <span className="contract-check-box" aria-hidden />
            <span className="contract-check-label">{item.label}</span>
          </label>
        ))}
      </div>

      <div className="contract-sign-fields">
        <input
          className="contract-input"
          placeholder="서명자 이름"
          value={signerName}
          onChange={(e) => onSignerNameChange(e.target.value)}
        />
        <input
          className="contract-input"
          placeholder="직책 (선택)"
          value={signerTitle}
          onChange={(e) => onSignerTitleChange(e.target.value)}
        />
      </div>

      <div className="contract-sign-canvas-wrap">
        <p className="contract-sign-canvas-label">서명을 아래 영역에 직접 작성해 주세요</p>
        <SignatureCanvas ref={sigRef} height={140} className="contract-sign-canvas" />
        <button
          type="button"
          onClick={() => sigRef.current?.clear()}
          className="contract-sign-clear"
        >
          서명 지우기
        </button>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="contract-cta-primary contract-cta-sign"
      >
        {submitting ? "서명 제출 중..." : "전자서명 진행"}
      </button>
    </section>
  );
}

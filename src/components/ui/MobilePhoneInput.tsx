"use client";

import { formatMobilePhone, MOBILE_PHONE_HINT } from "@/lib/phone";

interface MobilePhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function MobilePhoneInput({
  value,
  onChange,
  required,
  disabled,
  className = "ui-input",
  placeholder = "010-1234-5678",
}: MobilePhoneInputProps) {
  const handleChange = (raw: string) => {
    onChange(formatMobilePhone(raw));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    onChange(formatMobilePhone(e.clipboardData.getData("text")));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  return (
    <div>
      <input
        required={required}
        disabled={disabled}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        maxLength={13}
        className={className}
      />
      <p className="mt-1 text-xs text-brand-muted">{MOBILE_PHONE_HINT}</p>
    </div>
  );
}

"use client";

import {
  formatBusinessRegistration,
  formatCorporateRegistration,
} from "@/lib/registration-number";

interface RegistrationNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  kind: "business" | "corporate";
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function RegistrationNumberInput({
  value,
  onChange,
  kind,
  required,
  disabled,
  className = "ui-input",
}: RegistrationNumberInputProps) {
  const format = kind === "business" ? formatBusinessRegistration : formatCorporateRegistration;
  const placeholder = kind === "business" ? "123-45-67890" : "123456-1234567";
  const maxLength = kind === "business" ? 12 : 14;

  const handleChange = (raw: string) => onChange(format(raw));

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    onChange(format(e.clipboardData.getData("text")));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  return (
    <input
      required={required}
      disabled={disabled}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      maxLength={maxLength}
      className={className}
    />
  );
}

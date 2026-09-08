"use client";

import { formatRepresentativePhone } from "@/lib/phone";

interface RepresentativePhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function RepresentativePhoneInput({
  value,
  onChange,
  required,
  disabled,
  className = "ui-input",
  placeholder = "02-1234-5678",
}: RepresentativePhoneInputProps) {
  const handleChange = (raw: string) => onChange(formatRepresentativePhone(raw));

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    onChange(formatRepresentativePhone(e.clipboardData.getData("text")));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (allowed.includes(e.key)) return;
    if (!/^[\d-]$/.test(e.key)) e.preventDefault();
  };

  return (
    <input
      required={required}
      disabled={disabled}
      type="tel"
      inputMode="tel"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      maxLength={13}
      className={className}
    />
  );
}

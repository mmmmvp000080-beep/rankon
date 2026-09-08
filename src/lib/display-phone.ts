/** Returns a display phone value or "-" when empty. */
export function displayPhone(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed || "-";
}

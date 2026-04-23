/** Digits-only mobile for MSG91-style API (e.g. 919876543210). */
export function normalizeMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function formatPhoneDisplay(normalized: string): string {
  if (normalized.length >= 12 && normalized.startsWith("91")) {
    const rest = normalized.slice(2);
    return `+91 ${rest.replace(/(\d{5})(\d+)/, "$1 $2")}`;
  }
  return normalized ? `+${normalized}` : "";
}

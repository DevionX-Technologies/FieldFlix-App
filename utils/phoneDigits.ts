import { ADMIN_ROLE_PHONE_DIGITS } from '@/data/adminConfig';

/** Last 10 digits for Indian mobile comparison. */
export function getPhoneLast10(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === '') return null;
  const d = String(raw).replace(/\D/g, '');
  if (d.length >= 10) return d.slice(-10);
  return d.length > 0 ? d : null;
}

export function isAdminRolePhone(phone: string | null | undefined): boolean {
  const last = getPhoneLast10(phone);
  if (!last) return false;
  return ADMIN_ROLE_PHONE_DIGITS.has(last);
}

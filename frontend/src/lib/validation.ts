/** Checkout field rules. The API applies the same rules; these give instant feedback. */
import type { Customer } from "../api/types";
import type { DictKey } from "../i18n/dict";

export type FieldErrors = Partial<Record<keyof Customer, DictKey>>;

const POSTAL_RE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;

export function digits(s: string): string {
  return s.replace(/\D/g, "");
}

export function normalizePhone(s: string): string {
  let d = digits(s);
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : s.trim();
}

export function normalizePostal(s: string): string {
  const c = s.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(c) ? `${c.slice(0, 3)} ${c.slice(3)}` : s.trim();
}

export function validateCustomer(c: Customer): FieldErrors {
  const e: FieldErrors = {};
  if (c.name.trim().length < 2) e.name = "e_name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim())) e.email = "e_email";
  const d = digits(c.phone);
  if (!(d.length === 10 || (d.length === 11 && d.startsWith("1")))) e.phone = "e_phone";
  if (c.address.trim().length < 5) e.address = "e_addr";
  if (c.city.trim().length < 2) e.city = "e_city";
  if (!POSTAL_RE.test(c.postal_code.toUpperCase().replace(/[\s-]/g, ""))) e.postal_code = "e_postal";
  return e;
}

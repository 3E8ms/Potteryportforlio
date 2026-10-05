const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export function money(cents: number): string {
  return cad.format(cents / 100);
}

/** "$18" instead of "$18.00" for round prices on price stickers. */
export function shortMoney(cents: number): string {
  return money(cents).replace(/\.00$/, "");
}

export function formatMarketDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "America/Toronto", month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { timeZone: "America/Toronto" });
}

/**
 * The market time is always entered and shown in Toronto time, whatever time
 * zone the owner's computer is in. These helpers convert between an ISO
 * timestamp and the "YYYY-MM-DDTHH:mm" value of a datetime-local input.
 */
const ZONE = "America/Toronto";

function zoneParts(ms: number): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const out: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = Number(p.value);
  return out;
}

/** Minutes Toronto is ahead of UTC at the given instant (negative, e.g. -240). */
function offsetMinutes(ms: number): number {
  const p = zoneParts(ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

export function torontoInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let ms = wall - offsetMinutes(wall) * 60000;
  ms = wall - offsetMinutes(ms) * 60000; // second pass settles DST edges
  return new Date(ms).toISOString();
}

export function isoToTorontoInput(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const p = zoneParts(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

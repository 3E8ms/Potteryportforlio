/** The "next market" ticket with a live countdown. Empty date shows Coming soon. */
import { useEffect, useState } from "react";
import { useI18n } from "../i18n/LanguageContext";
import { formatMarketDate } from "../lib/format";
import { useShopData } from "../state/ShopData";

const LIVE_WINDOW_MS = 8 * 3600 * 1000;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function MarketTicket() {
  const { t, L, locale } = useI18n();
  const { settings } = useShopData();
  const now = useNow();
  const at = settings?.market_at ? Date.parse(settings.market_at) : NaN;
  const diff = at - now;
  const mode = Number.isNaN(at) ? "soon" : diff > 0 ? "count" : diff > -LIVE_WINDOW_MS ? "live" : "soon";
  const place = L(settings?.market_place);

  let main;
  if (mode === "count") {
    const s = Math.floor(diff / 1000);
    const [d, h, m, sec] = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
    const cells: [number, string][] = [[d, t("u_days")], [h, t("u_hrs")], [m, t("u_min")], [sec, t("u_sec")]];
    main = (
      <>
        <div className="eyebrow">{t("next_market")}</div>
        <div style={{ fontWeight: 700, marginTop: 4 }}>
          {formatMarketDate(settings!.market_at!, locale)}{place && ` · ${place}`}
        </div>
        <div className="digits" role="timer" aria-label={t("timer_aria", d, h)}>
          {cells.map(([n, label]) => (
            <div className="digit" key={label}><b>{String(n).padStart(2, "0")}</b><span>{label}</span></div>
          ))}
        </div>
      </>
    );
  } else if (mode === "live") {
    main = (
      <>
        <div className="eyebrow">{t("live_eyebrow")}</div>
        <div className="soon">{t("live_big")}</div>
        {place && <p style={{ margin: "4px 0 0" }}>{place}</p>}
      </>
    );
  } else {
    main = (
      <>
        <div className="eyebrow">{t("next_market")}</div>
        <div className="soon">{t("soon")}</div>
        <p className="muted" style={{ margin: "4px 0 0" }}>{t("soon_sub")}</p>
      </>
    );
  }

  return (
    <section className="ticket" aria-label={t("countdown_aria")}>
      <div className="ticket-main">{main}</div>
      <div className="ticket-stub">
        <span className="eyebrow" style={{ color: "inherit" }}>{t("admit")}</span>
        {mode === "count"
          ? <><b>{Math.ceil(diff / 86400000)}</b><span>{t("days_to_open")}</span></>
          : <><b>★</b><span>{t("stub_star")}</span></>}
      </div>
    </section>
  );
}

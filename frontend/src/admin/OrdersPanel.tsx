import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/client";
import type { OrderList, OrderStatus } from "../api/types";
import { useI18n } from "../i18n/LanguageContext";
import { formatDate, money } from "../lib/format";
import { provinceName } from "../lib/provinces";
import { useShopData } from "../state/ShopData";
import { useToast } from "../state/Toast";
import { useAdminCall } from "./useAdminCall";

const STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "cancelled"];

export function OrdersPanel() {
  const { t, L, lang, locale } = useI18n();
  const call = useAdminCall();
  const toast = useToast();
  const { reload: reloadShop } = useShopData();
  const [q, setQ] = useState("");
  const [data, setData] = useState<OrderList | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (query: string) => {
    try {
      setData(await call(() => adminApi.orders(query)));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [call]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(q), q ? 250 : 0);
    return () => window.clearTimeout(id);
  }, [q, load]);

  async function setStatus(orderNo: string, status: OrderStatus) {
    try {
      await call(() => adminApi.setStatus(orderNo, status));
      toast(t("st_changed", orderNo, t(`st_${status}`)));
      void reloadShop();
    } catch {
      toast(t("st_fail"));
    }
    void load(q);
  }

  const rows = data?.orders ?? [];
  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <div className="row">
          {(["pending", "paid", "shipped"] as const).map((s) => (
            <span key={s} className={`pill ${s}`}>{t(`st_${s}`)} {data?.counts[s] ?? 0}</span>
          ))}
        </div>
        <div className="row">
          <label className="f" htmlFor="order-q" style={{ flexDirection: "row", alignItems: "center" }}>
            <span className="sr">{t("search_orders")}</span>
            <input id="order-q" value={q} placeholder={t("search_ph")} onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 0, width: 220 }} />
          </label>
          <button className="btn ghost small" onClick={() => void load(q)}>{t("reload")}</button>
        </div>
      </div>

      {failed && <div className="note bad">{t("load_fail")}</div>}
      {!data && !failed && <p>{t("loading_orders")}</p>}

      {data && (rows.length ? (
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>{t("th_no")}</th><th>{t("th_date")}</th><th>{t("th_cust")}</th><th>{t("th_amt")}</th><th>{t("th_status")}</th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.order_no}>
                  <td className="num"><b>{o.order_no}</b></td>
                  <td className="num">{formatDate(o.created_at, locale)}</td>
                  <td>
                    <details>
                      <summary>{o.customer_name}</summary>
                      <div style={{ fontSize: 13, marginTop: 6 }}>
                        {o.address}<br />{o.city}, {provinceName(o.province, lang)} {o.postal_code}<br />
                        ☎ {o.phone}<br />✉ {o.email}
                        {o.note && <><br />{t("note_lbl", o.note)}</>}
                        <hr />
                        {o.items.map((i, n) => <div key={n}>{L(i.name)} ×{i.quantity}</div>)}
                      </div>
                    </details>
                    {o.stock_short && <span className="pill warn">{t("short_flag")}</span>}
                  </td>
                  <td className="num">{money(o.total_cents)}</td>
                  <td>
                    <select aria-label={t("th_status")} value={o.status}
                      onChange={(e) => void setStatus(o.order_no, e.target.value as OrderStatus)}
                      style={{ border: "2px solid var(--ink)", borderRadius: 6, background: "var(--field)", padding: 4 }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{t(`st_${s}`)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <h3 style={{ fontSize: 22 }}>{q ? t("no_match") : t("no_orders")}</h3>
          <p className="muted">{q ? t("no_match_p") : t("no_orders_p")}</p>
        </div>
      ))}
      <p className="muted" style={{ fontSize: 13, margin: "14px 0 0" }}>{t("stock_hint")}</p>
    </div>
  );
}

/** Where Stripe sends the customer after paying (or where test-mode checkout lands). */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { OrderPublic } from "../api/types";
import { useCart } from "../cart/CartContext";
import { Receipt } from "../components/Receipt";
import { useI18n } from "../i18n/LanguageContext";
import { useShopData } from "../state/ShopData";
import { useToast } from "../state/Toast";

const POLL_MS = 3000;
const MAX_POLLS = 10;

export function SuccessPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const cart = useCart();
  const toast = useToast();
  const { settings, reload } = useShopData();
  const orderNo = params.get("order") ?? "";
  const sessionId = params.get("session_id") ?? "";
  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [missing, setMissing] = useState(false);
  const [polls, setPolls] = useState(0);
  const testMode = settings ? !settings.payments_enabled : false;

  useEffect(() => {
    if (!orderNo || !sessionId) { setMissing(true); return; }
    let stop = false;
    api.order(orderNo, sessionId)
      .then((o) => { if (!stop) setOrder(o); })
      .catch((e) => { if (!stop && e instanceof ApiError && e.status === 404) setMissing(true); });
    return () => { stop = true; };
  }, [orderNo, sessionId, polls]);

  // Wait for the payment confirmation to arrive.
  useEffect(() => {
    if (order?.status !== "pending" || testMode || polls >= MAX_POLLS) return;
    const id = window.setTimeout(() => setPolls((n) => n + 1), POLL_MS);
    return () => window.clearTimeout(id);
  }, [order, polls, testMode]);

  const done = order && (order.status === "paid" || order.status === "shipped" || (testMode && order.status === "pending"));
  useEffect(() => {
    if (done) { cart.clear(); void reload(); }
  }, [done]);

  async function copy() {
    try { await navigator.clipboard.writeText(orderNo); toast(t("copied", orderNo)); }
    catch { toast(t("copy_fail")); }
  }

  if (missing) {
    return <div className="panel empty"><p>{t("order_missing")}</p><Link className="btn" to="/">{t("keep_shopping")}</Link></div>;
  }
  if (!order) return <div className="panel">{t("loading")}</div>;

  let title: string, body: string | null = null, tone = "";
  if (order.status === "paid" || order.status === "shipped") { title = t("paid_title"); body = t("paid_mail", order.email); }
  else if (order.status === "cancelled") { title = t("cancelled_title"); body = t("cancelled_p"); tone = "bad"; }
  else if (testMode) { title = t("test_mode_title"); body = t("test_mode_p"); }
  else if (polls < MAX_POLLS) { title = t("checking_title"); body = t("checking_p"); }
  else { title = t("checking_title"); body = t("still_pending"); }

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">{t("thanks_eyebrow")}</span>
        <h2>{title}</h2>
      </div>
      <div className="two">
        <div className="panel">
          <div className="eyebrow" style={{ marginBottom: 8 }}>{t("order_no")}</div>
          <div className="orderno">{order.order_no}</div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn ghost small" onClick={copy}>{t("copy_no")}</button>
          </div>
          <div style={{ marginTop: 18 }}>
            <Receipt
              lines={order.items.map((i) => ({ name: i.name, unitCents: i.unit_price_cents, quantity: i.quantity }))}
              totalCents={order.total_cents}
            />
          </div>
        </div>
        <div className="panel">
          {body && <div className={`note ${tone}`}>{body}</div>}
          <Link className="btn ghost" style={{ marginTop: 16 }} to={order.status === "cancelled" ? "/cart" : "/"}>
            {order.status === "cancelled" ? t("nav_cart") : t("keep_shopping")}
          </Link>
        </div>
      </div>
    </>
  );
}

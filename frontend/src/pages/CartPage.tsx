import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { Customer } from "../api/types";
import { useCart } from "../cart/CartContext";
import { ProductArt } from "../components/ProductArt";
import { Receipt } from "../components/Receipt";
import { Stepper } from "../components/Stepper";
import { useI18n } from "../i18n/LanguageContext";
import { money } from "../lib/format";
import { PROVINCES, provinceName } from "../lib/provinces";
import { storage } from "../lib/storage";
import { normalizePhone, normalizePostal, validateCustomer, type FieldErrors } from "../lib/validation";
import { useShopData } from "../state/ShopData";

const EMPTY: Customer = { name: "", email: "", phone: "", address: "", city: "", province: "ON", postal_code: "", note: "" };
const FORM_KEY = "xl-form";

export function CartPage() {
  const { t, L, lang } = useI18n();
  const cart = useCart();
  const { reload, productById } = useShopData();
  const [params] = useSearchParams();
  const [step, setStep] = useState<"cart" | "review">("cart");
  const [form, setForm] = useState<Customer>(() => ({ ...EMPTY, ...(storage.get<Customer>(FORM_KEY) ?? {}) }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(params.get("cancelled") ? t("cancelled_note") : null);

  function update<K extends keyof Customer>(key: K, value: Customer[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    storage.set(FORM_KEY, next);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function review() {
    const e = validateCustomer(form);
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(".f.bad input")?.focus());
      return;
    }
    setConfirmed(false);
    setStep("review");
    window.scrollTo(0, 0);
  }

  async function pay() {
    setBusy(true);
    setProblem(null);
    try {
      const items = cart.lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity }));
      const result = await api.checkout(items, form, lang);
      window.location.assign(result.checkout_url);
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.status === 409 && typeof err.detail === "object" && err.detail) {
        const d = err.detail as { code: string; product_id: number; available: number };
        const name = L(productById(d.product_id)?.name);
        cart.setQuantity(d.product_id, d.available ?? 0);
        setProblem(d.code === "not_enough_stock" && d.available > 0 ? t("err_stock", name, d.available) : t("err_unavailable", name));
        void reload();
        setStep("cart");
      } else if (err instanceof ApiError && err.status === 422) {
        setStep("cart");
        setErrors(validateCustomer(form));
        setProblem(t("err_generic"));
      } else {
        setProblem(err instanceof ApiError && err.code === "payment_unavailable" ? t("err_payment") : t("err_generic"));
      }
    }
  }

  if (!cart.lines.length) {
    return (
      <>
        <div className="page-head"><span className="eyebrow">{t("cart_eyebrow")}</span><h2>{t("cart_title")}</h2></div>
        {problem && <div className="note" style={{ marginBottom: 16 }}>{problem}</div>}
        <div className="panel empty">
          <h3 style={{ fontSize: 26 }}>{t("cart_empty_t")}</h3>
          <p className="muted">{t("cart_empty_p")}</p>
          <Link className="btn" to="/">{t("see_works")}</Link>
        </div>
      </>
    );
  }

  const field = (key: keyof Customer, label: string, opts: { type?: string; auto?: string; ph?: string; wide?: boolean } = {}) => (
    <label className={`f${errors[key] ? " bad" : ""}${opts.wide ? " wide" : ""}`} htmlFor={`f-${key}`}>
      {label}
      <input id={`f-${key}`} type={opts.type ?? "text"} value={form[key]} autoComplete={opts.auto}
        placeholder={opts.ph} onChange={(e) => update(key, e.target.value)} aria-invalid={!!errors[key]} />
      {errors[key] && <span className="err">{t(errors[key]!)}</span>}
    </label>
  );

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">{t("checkout")} · {t("step", step === "cart" ? 1 : 2)}</span>
        <h2>{step === "cart" ? t("cart_title") : t("review_title")}</h2>
      </div>
      {problem && <div className="note bad" style={{ marginBottom: 16 }} role="alert">{problem}</div>}
      <div className="two">
        <div className="panel">
          {cart.lines.map(({ product: p, quantity }) => (
            <div className="line" key={p.id}>
              <div className="thumb"><ProductArt product={p} /></div>
              <div style={{ minWidth: 0 }}>
                <b>{L(p.name)}</b>
                <div className="muted mono" style={{ fontSize: 14 }}>{money(p.price_cents)} · {t("stock_n", p.stock)}</div>
                {step === "cart" ? (
                  <div className="row" style={{ marginTop: 6 }}>
                    <Stepper value={quantity} min={1} max={p.stock} onChange={(n) => cart.setQuantity(p.id, n)} />
                    <button className="btn ghost small" onClick={() => cart.remove(p.id)}>{t("remove")}</button>
                  </div>
                ) : <div className="mono">× {quantity}</div>}
              </div>
              <div className="mono" style={{ fontWeight: 700 }}>{money(p.price_cents * quantity)}</div>
            </div>
          ))}
          <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
            <b>{t("subtotal")}</b>
            <b className="mono" style={{ fontSize: 20 }}>{money(cart.totalCents)}</b>
          </div>
        </div>

        {step === "cart" ? (
          <form className="panel" noValidate onSubmit={(e) => { e.preventDefault(); review(); }}>
            <h3 style={{ fontSize: 22, marginBottom: 12 }}>{t("ship_title")}</h3>
            <div className="form-grid">
              {field("name", t("f_name"), { auto: "name", wide: true })}
              {field("email", t("f_email"), { type: "email", auto: "email" })}
              {field("phone", t("f_phone"), { type: "tel", auto: "tel", ph: "613-555-0123" })}
              {field("address", t("f_addr"), { auto: "street-address", ph: t("f_addr_ph"), wide: true })}
              {field("city", t("f_city"), { auto: "address-level2" })}
              <label className="f" htmlFor="f-province">
                {t("f_prov")}
                <select id="f-province" value={form.province} onChange={(e) => update("province", e.target.value)}>
                  {PROVINCES.map((p) => <option key={p} value={p}>{provinceName(p, lang)}</option>)}
                </select>
              </label>
              {field("postal_code", t("f_postal"), { auto: "postal-code", ph: "K1P 1J1" })}
              <label className="f wide" htmlFor="f-note">
                {t("f_note")}
                <textarea id="f-note" value={form.note} maxLength={1000} onChange={(e) => update("note", e.target.value)} />
              </label>
            </div>
            <div className="row" style={{ marginTop: 16, justifyContent: "space-between" }}>
              <span className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{money(cart.totalCents)}</span>
              <button className="btn" type="submit">{t("next_review")}</button>
            </div>
          </form>
        ) : (
          <div className="panel">
            <h3 style={{ fontSize: 22 }}>{t("review_h")}</h3>
            <p className="muted" style={{ margin: "4px 0 12px" }}>{t("review_p")}</p>
            <div className="receipt" style={{ marginBottom: 14 }}>
              <div><b>{form.name}</b></div>
              <div>{form.address}</div>
              <div>{form.city}, {provinceName(form.province, lang)} {normalizePostal(form.postal_code)}</div>
              <hr />
              <div>☎ {normalizePhone(form.phone)}</div>
              <div>✉ {form.email}</div>
              {form.note && <><hr /><div style={{ whiteSpace: "pre-line" }}>{form.note}</div></>}
            </div>
            <Receipt
              lines={cart.lines.map((l) => ({ name: l.product.name, unitCents: l.product.price_cents, quantity: l.quantity }))}
              totalCents={cart.totalCents}
            />
            <label className="row" style={{ marginTop: 14, alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
                style={{ width: 22, height: 22, marginTop: 3 }} />
              <span>{t("confirm_label")}</span>
            </label>
            <div className="row" style={{ marginTop: 16, justifyContent: "space-between" }}>
              <button className="btn ghost" onClick={() => setStep("cart")} disabled={busy}>{t("edit_details")}</button>
              <button className="btn" onClick={pay} disabled={!confirmed || busy}>{busy ? t("placing") : t("place")}</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

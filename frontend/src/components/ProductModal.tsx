import { useEffect, useRef, useState } from "react";
import type { Product } from "../api/types";
import { useCart } from "../cart/CartContext";
import { useI18n } from "../i18n/LanguageContext";
import { money } from "../lib/format";
import { useToast } from "../state/Toast";
import { ProductArt } from "./ProductArt";
import { Stepper } from "./Stepper";
import { StockLabel } from "./StockLabel";

export function ProductModal({ product: p, onClose }: { product: Product; onClose: () => void }) {
  const { t, L } = useI18n();
  const cart = useCart();
  const toast = useToast();
  const closeRef = useRef<HTMLButtonElement>(null);
  const inCart = cart.quantities[p.id] ?? 0;
  const max = Math.max(0, p.stock - inCart);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const meta = [p.year, p.season ? t(`s_${p.season}`) : "", L(p.type), L(p.theme)].filter(Boolean).join(" · ");

  function add() {
    cart.add(p.id, Math.min(qty, max));
    toast(t("added", L(p.name)));
    onClose();
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button ref={closeRef} className="close" onClick={onClose} aria-label={t("close")}>×</button>
        <ProductArt product={p} />
        <div className="modal-body">
          <span className="eyebrow">{meta}</span>
          <h2 id="modal-title">{L(p.name)}</h2>
          {p.is_sample && <div className="note">{t("sample_note")}</div>}
          <div style={{ font: "700 26px var(--mono)" }}>{money(p.price_cents)}</div>
          <StockLabel stock={p.stock} />
          <p style={{ margin: 0, whiteSpace: "pre-line" }}>{L(p.description)}</p>
          {p.stock <= 0 ? (
            <button className="btn" disabled>{t("sold_out")}</button>
          ) : max <= 0 ? (
            <div className="note">{t("all_in_cart")}</div>
          ) : (
            <>
              <div className="row">
                <Stepper value={Math.min(qty, max)} max={max} onChange={setQty} />
                <button className="btn" onClick={add}>{t("add_cart")}</button>
              </div>
              {inCart > 0 && <span className="muted" style={{ fontSize: 14 }}>{t("in_cart", inCart)}</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

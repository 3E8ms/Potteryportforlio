import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/client";
import type { Product } from "../api/types";
import { ProductArt } from "../components/ProductArt";
import { useI18n } from "../i18n/LanguageContext";
import { money } from "../lib/format";
import { useShopData } from "../state/ShopData";
import { ProductForm } from "./ProductForm";
import { useAdminCall } from "./useAdminCall";

export function ProductsPanel() {
  const { t, L } = useI18n();
  const call = useAdminCall();
  const { reload: reloadShop } = useShopData();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const load = useCallback(async () => {
    try { setProducts(await call(() => adminApi.products())); } catch { /* handled by call */ }
  }, [call]);
  useEffect(() => { void load(); }, [load]);

  function done() {
    setEditing(null);
    void load();
    void reloadShop();
  }

  if (editing) {
    return <ProductForm product={editing === "new" ? null : editing} all={products ?? []} onDone={done}
      onChanged={() => { void load(); void reloadShop(); }} />;
  }
  if (!products) return <div className="panel">{t("loading")}</div>;

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ fontSize: 22 }}>{t("works_n", products.length)}</h3>
        <button className="btn small" onClick={() => setEditing("new")}>{t("add_work")}</button>
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr><th /><th>{t("th_work")}</th><th>{t("th_group")}</th><th>{t("th_price")}</th><th>{t("th_stock")}</th><th /></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.is_active ? "" : "inactive"}>
                <td style={{ width: 56 }}>
                  <div className="thumb" style={{ width: 48, height: 48, border: "2px solid var(--ink)", borderRadius: 8, overflow: "hidden" }}>
                    <ProductArt product={p} />
                  </div>
                </td>
                <td>
                  <b>{L(p.name)}</b>{" "}
                  {p.is_sample && <span className="pill pending">{t("sample")}</span>}{" "}
                  {!p.is_active && <span className="pill cancelled">{t("hidden_badge")}</span>}
                </td>
                <td style={{ fontSize: 13 }}>
                  {p.year} {p.season ? t(`s_${p.season}`) : ""}<br />{L(p.type)} · {L(p.theme)}
                </td>
                <td className="num">{money(p.price_cents)}</td>
                <td className="num"><span className={`stock ${p.stock <= 0 ? "none" : p.stock <= 5 ? "low" : "ok"}`}>{p.stock}</span></td>
                <td><button className="btn ghost small" onClick={() => setEditing(p)}>{t("edit")}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

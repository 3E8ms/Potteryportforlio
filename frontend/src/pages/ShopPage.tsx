import { useMemo, useState } from "react";
import type { Product } from "../api/types";
import { ProductCard, type Grouping } from "../components/ProductCard";
import { MarketTicket } from "../components/MarketTicket";
import { ProductModal } from "../components/ProductModal";
import { useI18n } from "../i18n/LanguageContext";
import { storage } from "../lib/storage";
import { useShopData } from "../state/ShopData";

const GROUPINGS: Grouping[] = ["time", "type", "theme"];

export function ShopPage() {
  const { t, L, locale } = useI18n();
  const { products } = useShopData();
  const [grouping, setGrouping] = useState<Grouping>(() => {
    const g = storage.get<Grouping>("xl-group");
    return g && GROUPINGS.includes(g) ? g : "time";
  });
  const [openId, setOpenId] = useState<number | null>(null);

  const groups = useMemo(() => {
    const key = (p: Product) =>
      grouping === "time" ? String(p.year) : (grouping === "type" ? L(p.type) : L(p.theme)) || t("other");
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const k = key(p);
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    const entries = [...map.entries()];
    if (grouping === "time") entries.sort((a, b) => Number(b[0]) - Number(a[0]));
    else entries.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], locale));
    return entries;
  }, [products, grouping, L, t, locale]);

  const open = openId != null ? products.find((p) => p.id === openId) : undefined;
  const labels: Record<Grouping, string> = { time: t("by_time"), type: t("by_type"), theme: t("by_theme") };

  function choose(g: Grouping) {
    setGrouping(g);
    storage.set("xl-group", g);
  }

  function close() {
    const id = openId;
    setOpenId(null);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`.card[data-id="${id}"]`)?.focus());
  }

  return (
    <>
      <MarketTicket />
      <div className="bar">
        <div>
          <span className="eyebrow">{t("coll_eyebrow")}</span>
          <h2 style={{ fontSize: 34, fontWeight: 900 }}>{t("coll_title")}</h2>
        </div>
        <div className="seg" role="group" aria-label={t("group_label")}>
          {GROUPINGS.map((g) => (
            <button key={g} aria-pressed={grouping === g} onClick={() => choose(g)}>{labels[g]}</button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="empty panel">
          <h2>{t("empty_shop_t")}</h2>
          <p className="muted">{t("empty_shop_p")}</p>
        </div>
      ) : (
        groups.map(([label, items]) => (
          <section className="group" key={label}>
            <div className="group-head">
              <h2>{grouping === "time" ? t("year_h", label) : label}</h2>
              <span className="eyebrow">{items.length === 1 ? t("n_work1") : t("n_works", items.length)}</span>
            </div>
            <div className="grid">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} grouping={grouping} onOpen={() => setOpenId(p.id)} />
              ))}
            </div>
          </section>
        ))
      )}

      {open && <ProductModal product={open} onClose={close} />}
    </>
  );
}

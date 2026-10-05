import type { Product } from "../api/types";
import { useI18n } from "../i18n/LanguageContext";
import { money, shortMoney } from "../lib/format";
import { ProductArt } from "./ProductArt";
import { StockLabel } from "./StockLabel";

export type Grouping = "time" | "type" | "theme";

export function ProductCard({ product: p, grouping, onOpen }: { product: Product; grouping: Grouping; onOpen: () => void }) {
  const { t, L } = useI18n();
  const season = p.season ? t(`s_${p.season}`) : "";
  const tags = [
    grouping !== "time" ? [p.year, season].filter(Boolean).join(" ") : season,
    grouping !== "type" ? L(p.type) : "",
    grouping !== "theme" ? L(p.theme) : "",
  ].filter(Boolean);

  return (
    <button className="card" onClick={onOpen} aria-label={`${L(p.name)}, ${money(p.price_cents)}`} data-id={p.id}>
      <ProductArt product={p} />
      <span className="price">{shortMoney(p.price_cents)}</span>
      {p.stock <= 0 ? <span className="flag out">{t("sold_out")}</span> : p.is_sample && <span className="flag">{t("sample")}</span>}
      <span className="card-body">
        <h3>{L(p.name)}</h3>
        <span className="chips">{tags.map((x) => <span className="chip" key={x}>{x}</span>)}</span>
        <span className="meta"><StockLabel stock={p.stock} /></span>
      </span>
    </button>
  );
}

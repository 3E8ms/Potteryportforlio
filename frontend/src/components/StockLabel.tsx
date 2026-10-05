import { useI18n } from "../i18n/LanguageContext";

export function StockLabel({ stock }: { stock: number }) {
  const { t } = useI18n();
  if (stock <= 0) return <span className="stock none">{t("sold_out")}</span>;
  if (stock <= 5) return <span className="stock low">{t("stock_low", stock)}</span>;
  return <span className="stock ok">{t("stock_ok", stock)}</span>;
}

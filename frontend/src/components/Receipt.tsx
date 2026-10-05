import type { I18nText } from "../api/types";
import { useI18n } from "../i18n/LanguageContext";
import { money } from "../lib/format";

interface Line { name: I18nText; unitCents: number; quantity: number }

export function Receipt({ lines, totalCents }: { lines: Line[]; totalCents: number }) {
  const { t, L } = useI18n();
  return (
    <div className="receipt">
      {lines.map((l, i) => (
        <div className="r" key={i}>
          <span>{L(l.name)} ×{l.quantity}</span>
          <span>{money(l.unitCents * l.quantity)}</span>
        </div>
      ))}
      <hr />
      <div className="r total"><span>{t("total")}</span><span>{money(totalCents)}</span></div>
    </div>
  );
}

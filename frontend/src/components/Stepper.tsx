import { useI18n } from "../i18n/LanguageContext";

interface Props { value: number; min?: number; max: number; onChange: (n: number) => void }

export function Stepper({ value, min = 1, max, onChange }: Props) {
  const { t } = useI18n();
  return (
    <div className="stepper">
      <button type="button" aria-label={t("dec")} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={t("inc")} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

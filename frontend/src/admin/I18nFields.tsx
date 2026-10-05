import type { I18nText, Lang } from "../api/types";
import { HTML_LANG, LANGS, useI18n } from "../i18n/LanguageContext";

interface Props {
  id: string;
  label: string;
  value: I18nText;
  onChange: (v: I18nText) => void;
  multiline?: boolean;
  suggestions?: Partial<Record<Lang, string[]>>;
}

/** One input per language for a translatable field. */
export function I18nFields({ id, label, value, onChange, multiline, suggestions }: Props) {
  const { t } = useI18n();
  return (
    <fieldset className="langset wide">
      <legend>{label}</legend>
      {LANGS.map((lg) => {
        const fid = `${id}-${lg}`;
        const common = {
          id: fid, lang: HTML_LANG[lg], value: value[lg] ?? "",
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [lg]: e.target.value }),
        };
        const list = suggestions?.[lg];
        return (
          <label className="f" htmlFor={fid} key={lg}>
            <span className="muted" style={{ fontWeight: 500, fontSize: 13 }}>{t(`ln_${lg}`)}</span>
            {multiline ? <textarea {...common} /> : <input {...common} list={list ? `${fid}-list` : undefined} />}
            {list && <datalist id={`${fid}-list`}>{list.map((s) => <option key={s} value={s} />)}</datalist>}
          </label>
        );
      })}
    </fieldset>
  );
}

import { useState } from "react";
import { adminApi } from "../api/client";
import type { SettingsInput } from "../api/types";
import { useI18n } from "../i18n/LanguageContext";
import { isoToTorontoInput, torontoInputToIso } from "../lib/time";
import { useShopData } from "../state/ShopData";
import { useToast } from "../state/Toast";
import { I18nFields } from "./I18nFields";
import { useAdminCall } from "./useAdminCall";

export function SettingsPanel() {
  const { t } = useI18n();
  const call = useAdminCall();
  const toast = useToast();
  const { settings, reload } = useShopData();
  const [form, setForm] = useState<SettingsInput | null>(() => settings && {
    name: settings.name, tagline: settings.tagline, market_at: settings.market_at,
    market_place: settings.market_place, form_link: settings.form_link,
  });
  const [when, setWhen] = useState(() => isoToTorontoInput(settings?.market_at ?? null));
  const [busy, setBusy] = useState(false);

  if (!form) return <div className="panel">{t("loading")}</div>;
  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => setForm({ ...form, [k]: v });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const link = form!.form_link.trim();
    if (link && !/^https:\/\//i.test(link)) { toast(t("bad_link")); return; }
    setBusy(true);
    try {
      await call(() => adminApi.saveSettings({ ...form!, form_link: link, market_at: when ? torontoInputToIso(when) : null }));
      await reload();
      toast(t("saved_settings"));
    } catch {
      toast(t("st_fail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={save}>
      <div className="two">
        <div className="form-grid">
          <h3 className="wide" style={{ fontSize: 22 }}>{t("mk_title")}</h3>
          <label className="f wide" htmlFor="s-when">
            {t("mk_at")}
            <input id="s-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>{t("mk_at_help")}</span>
          </label>
          <I18nFields id="s-place" label={t("mk_place")} value={form.market_place} onChange={(v) => set("market_place", v)} />
        </div>
        <div className="form-grid">
          <h3 className="wide" style={{ fontSize: 22 }}>{t("names_title")}</h3>
          <I18nFields id="s-name" label={t("s_name")} value={form.name} onChange={(v) => set("name", v)} />
          <I18nFields id="s-tag" label={t("s_tag")} value={form.tagline} onChange={(v) => set("tagline", v)} />
          <label className="f wide" htmlFor="s-form">
            {t("s_form")}
            <input id="s-form" type="url" value={form.form_link} placeholder="https://" onChange={(e) => set("form_link", e.target.value)} />
            <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>{t("s_form_help")}</span>
          </label>
        </div>
      </div>
      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn" type="submit" disabled={busy}>{busy ? t("saving") : t("save_settings")}</button>
      </div>
    </form>
  );
}

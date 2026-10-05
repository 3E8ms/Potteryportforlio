import { useMemo, useState } from "react";
import { adminApi } from "../api/client";
import type { Lang, Product, ProductInput, Season } from "../api/types";
import { ProductArt } from "../components/ProductArt";
import { LANGS, useI18n } from "../i18n/LanguageContext";
import { useToast } from "../state/Toast";
import { I18nFields } from "./I18nFields";
import { useAdminCall } from "./useAdminCall";

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

function blank(count: number): ProductInput {
  return {
    name: {}, description: {}, type: {}, theme: {}, year: new Date().getFullYear(), season: null,
    price_cents: 1000, stock: 1, tone: count % 4, is_active: true,
  };
}

interface Props { product: Product | null; all: Product[]; onDone: () => void; onChanged: () => void }

export function ProductForm({ product, all, onDone, onChanged }: Props) {
  const { t } = useI18n();
  const call = useAdminCall();
  const toast = useToast();
  const [current, setCurrent] = useState<Product | null>(product);
  const [form, setForm] = useState<ProductInput>(() => product ? {
    name: product.name, description: product.description, type: product.type, theme: product.theme,
    year: product.year, season: product.season, price_cents: product.price_cents, stock: product.stock,
    tone: product.tone, is_active: product.is_active,
  } : blank(all.length));
  const [price, setPrice] = useState(() => (form.price_cents / 100).toFixed(2));
  const [busy, setBusy] = useState<"save" | "image" | null>(null);
  const [armDelete, setArmDelete] = useState(false);

  const suggest = useMemo(() => {
    const pick = (key: "type" | "theme") =>
      Object.fromEntries(LANGS.map((lg) => [lg, [...new Set(all.map((p) => p[key][lg]).filter(Boolean) as string[])]])) as Record<Lang, string[]>;
    return { type: pick("type"), theme: pick("theme") };
  }, [all]);

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!LANGS.some((lg) => form.name[lg]?.trim())) { toast(t("need_name")); return; }
    const body = { ...form, price_cents: Math.max(0, Math.round(Number(price) * 100) || 0) };
    setBusy("save");
    try {
      await call(() => current ? adminApi.updateProduct(current.id, body) : adminApi.createProduct(body));
      toast(t("saved_work"));
      onDone();
    } catch {
      toast(t("st_fail"));
      setBusy(null);
    }
  }

  async function upload(file: File) {
    if (!current) return;
    setBusy("image");
    try {
      setCurrent(await call(() => adminApi.uploadImage(current.id, file)));
      onChanged();
    } catch {
      toast(t("img_fail"));
    } finally {
      setBusy(null);
    }
  }

  async function removeImage() {
    if (!current) return;
    try { setCurrent(await call(() => adminApi.removeImage(current.id))); onChanged(); } catch { toast(t("st_fail")); }
  }

  async function remove() {
    if (!current) return;
    try { await call(() => adminApi.deleteProduct(current.id)); toast(t("deleted")); onDone(); } catch { toast(t("st_fail")); }
  }

  const preview = { name: form.name, image_url: current?.image_url ?? null, tone: form.tone };

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 22 }}>{current ? t("edit_work") : t("new_work")}</h3>
        <button className="linkbtn" onClick={onDone}>{t("back_list")}</button>
      </div>
      <p className="muted" style={{ margin: "6px 0 14px", fontSize: 14 }}>{t("lang_fields_note")}</p>
      <div className="two" style={{ gap: 20 }}>
        <div className="form-grid">
          <I18nFields id="p-name" label={t("f_wname")} value={form.name} onChange={(v) => set("name", v)} />
          <label className="f" htmlFor="p-price">{t("f_price")}
            <input id="p-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label className="f" htmlFor="p-stock">{t("f_stock")}
            <input id="p-stock" type="number" min="0" step="1" value={form.stock}
              onChange={(e) => set("stock", Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
          </label>
          <label className="f" htmlFor="p-year">{t("f_year")}
            <input id="p-year" type="number" min="1990" max="2100" value={form.year}
              onChange={(e) => set("year", Number(e.target.value) || new Date().getFullYear())} />
          </label>
          <label className="f" htmlFor="p-season">{t("f_season")}
            <select id="p-season" value={form.season ?? ""} onChange={(e) => set("season", (e.target.value || null) as Season | null)}>
              <option value="">—</option>
              {SEASONS.map((s) => <option key={s} value={s}>{t(`s_${s}`)}</option>)}
            </select>
          </label>
          <I18nFields id="p-type" label={t("f_wtype")} value={form.type} onChange={(v) => set("type", v)} suggestions={suggest.type} />
          <I18nFields id="p-theme" label={t("f_wtheme")} value={form.theme} onChange={(v) => set("theme", v)} suggestions={suggest.theme} />
          <I18nFields id="p-desc" label={t("f_wdesc")} value={form.description} onChange={(v) => set("description", v)} multiline />
          <label className="switch wide">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
            {t("f_active")}
          </label>
        </div>
        <div>
          <div style={{ border: "2px solid var(--ink)", borderRadius: 12, overflow: "hidden" }}>
            <ProductArt product={preview} />
          </div>
          {current ? (
            <>
              <label className="f" htmlFor="p-img" style={{ marginTop: 12 }}>
                {busy === "image" ? t("uploading") : t("photo")}
                <input id="p-img" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy !== null}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
              </label>
              {current.image_url && (
                <button className="btn ghost small" style={{ marginTop: 8 }} onClick={removeImage}>{t("rm_photo")}</button>
              )}
            </>
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>{t("photo_after_save")}</p>
          )}
        </div>
      </div>
      <div className="row" style={{ justifyContent: "space-between", marginTop: 18 }}>
        <div className="row">
          <button className="btn" onClick={save} disabled={busy !== null}>{busy === "save" ? t("saving") : t("save_work")}</button>
          <button className="btn ghost" onClick={onDone}>{t("cancel")}</button>
        </div>
        {current && (armDelete
          ? <button className="btn danger" onClick={remove}>{t("del_confirm")}</button>
          : <button className="btn ghost small" onClick={() => setArmDelete(true)}>{t("del_arm")}</button>)}
      </div>
    </div>
  );
}

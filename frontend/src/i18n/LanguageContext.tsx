import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { I18nText, Lang } from "../api/types";
import { DICT, type DictKey } from "./dict";
import { storage } from "../lib/storage";

export const LANGS: Lang[] = ["en", "hans", "hant"];
export const LANG_NAME: Record<Lang, string> = { en: "English", hans: "简体中文", hant: "繁體中文" };
export const HTML_LANG: Record<Lang, string> = { en: "en", hans: "zh-Hans", hant: "zh-Hant" };
export const LOCALE: Record<Lang, string> = { en: "en-CA", hans: "zh-CN", hant: "zh-TW" };
const INDEX: Record<Lang, number> = { en: 0, hans: 1, hant: 2 };
const FALLBACK: Record<Lang, Lang[]> = { en: ["en", "hant", "hans"], hans: ["hans", "hant", "en"], hant: ["hant", "hans", "en"] };

export function detectLang(saved: unknown, browser: readonly string[]): Lang {
  if (typeof saved === "string" && (LANGS as string[]).includes(saved)) return saved as Lang;
  const first = (browser[0] ?? "en").toLowerCase();
  if (first.startsWith("zh")) return /hans|cn|sg|my/.test(first) ? "hans" : "hant";
  return "en";
}

/** Pick text in the given language, falling back to the others when it is empty. */
export function pick(text: I18nText | null | undefined, lang: Lang): string {
  if (!text) return "";
  for (const l of FALLBACK[lang]) if (text[l]) return text[l]!;
  return "";
}

export function translate(lang: Lang, key: DictKey, ...args: (string | number)[]): string {
  let s: string = DICT[key][INDEX[lang]];
  args.forEach((a, i) => { s = s.split(`{${i}}`).join(String(a)); });
  return s;
}

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey, ...args: (string | number)[]) => string;
  L: (text: I18nText | null | undefined) => string;
  locale: string;
}

const Ctx = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    detectLang(storage.get("xl-lang"), navigator.languages ?? [navigator.language]));
  const setLang = useCallback((l: Lang) => { setLangState(l); storage.set("xl-lang", l); }, []);
  useEffect(() => { document.documentElement.lang = HTML_LANG[lang]; }, [lang]);
  const value = useMemo<I18n>(() => ({
    lang, setLang, locale: LOCALE[lang],
    t: (key, ...args) => translate(lang, key, ...args),
    L: (text) => pick(text, lang),
  }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside LanguageProvider");
  return v;
}

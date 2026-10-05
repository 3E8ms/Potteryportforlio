import { NavLink } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { LANGS, LANG_NAME, HTML_LANG, useI18n } from "../i18n/LanguageContext";
import { useAdmin } from "../state/Admin";
import { useShopData } from "../state/ShopData";

export function Header() {
  const { t, L, lang, setLang } = useI18n();
  const { settings } = useShopData();
  const { count } = useCart();
  const { username } = useAdmin();

  return (
    <>
      <header className="top">
        <div className="brand">
          <h1>
            {L(settings?.name)}
            <small>{L(settings?.tagline)}</small>
          </h1>
        </div>
        <div className="top-right">
          <div className="langs" role="group" aria-label={t("lang_label")}>
            {LANGS.map((l) => (
              <button key={l} lang={HTML_LANG[l]} aria-pressed={lang === l} onClick={() => setLang(l)}>
                {LANG_NAME[l]}
              </button>
            ))}
          </div>
          <nav className="tabs" aria-label={t("nav_label")}>
            <NavLink to="/" end className="navbtn">{t("nav_shop")}</NavLink>
            <NavLink to="/custom" className="navbtn">{t("nav_custom")}</NavLink>
            <NavLink to="/cart" className="navbtn">
              {t("nav_cart")}
              {count > 0 && <span className="count">{count}</span>}
            </NavLink>
            {username && <NavLink to="/admin" className="navbtn">{t("nav_admin")}</NavLink>}
          </nav>
        </div>
      </header>
      <div className="stripes" aria-hidden="true" />
    </>
  );
}

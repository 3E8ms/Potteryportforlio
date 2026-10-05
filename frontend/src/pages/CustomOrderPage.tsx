import { useI18n } from "../i18n/LanguageContext";
import { useShopData } from "../state/ShopData";

export function CustomOrderPage() {
  const { t } = useI18n();
  const { settings } = useShopData();
  const link = settings?.form_link;
  const steps = [["s1t", "s1p"], ["s2t", "s2p"], ["s3t", "s3p"]] as const;

  return (
    <>
      <div className="page-head">
        <span className="eyebrow">{t("custom_eyebrow")}</span>
        <h2>{t("custom_title")}</h2>
        <p>{t("custom_intro")}</p>
      </div>
      <div className="two">
        <div className="panel">
          <h3 style={{ fontSize: 24 }}>{t("how_title")}</h3>
          <ol className="steps">
            {steps.map(([title, body]) => (
              <li key={title}><div><b>{t(title)}</b><div className="muted">{t(body)}</div></div></li>
            ))}
          </ol>
          {link ? (
            <>
              <a className="btn" href={link} target="_blank" rel="noopener noreferrer">{t("open_form")}</a>
              <p className="muted" style={{ fontSize: 13, margin: "10px 0 0" }}>{t("form_note")}</p>
            </>
          ) : (
            <button className="btn" disabled>{t("form_soon")}</button>
          )}
        </div>
        <div className="panel" style={{ boxShadow: "none" }}>
          <span className="eyebrow">{t("good_eyebrow")}</span>
          <ul style={{ paddingLeft: 20, margin: "10px 0 0" }}>
            <li>{t("g1")}</li><li>{t("g2")}</li><li>{t("g3")}</li>
          </ul>
        </div>
      </div>
    </>
  );
}

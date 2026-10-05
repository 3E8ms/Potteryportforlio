import { useI18n } from "../i18n/LanguageContext";
import { useShopData } from "../state/ShopData";

export function Footer() {
  const { t, L } = useI18n();
  const { settings } = useShopData();
  return (
    <footer>
      <span>© {new Date().getFullYear()} {L(settings?.name)}</span>
      <span className="mono">{t("footer_made")}</span>
    </footer>
  );
}

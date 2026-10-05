import { useState } from "react";
import { useI18n } from "../i18n/LanguageContext";
import { useAdmin } from "../state/Admin";
import { useShopData } from "../state/ShopData";
import { LoginForm } from "./LoginForm";
import { OrdersPanel } from "./OrdersPanel";
import { ProductsPanel } from "./ProductsPanel";
import { SettingsPanel } from "./SettingsPanel";

type Tab = "orders" | "products" | "settings";

export function AdminPage() {
  const { t } = useI18n();
  const { username, checked, signOut } = useAdmin();
  const { settings } = useShopData();
  const [tab, setTab] = useState<Tab>("orders");

  if (!checked) return <div className="panel">{t("loading")}</div>;
  if (!username) return <LoginForm />;

  const tabs: [Tab, string][] = [["orders", t("tab_orders")], ["products", t("tab_products")], ["settings", t("tab_settings")]];
  return (
    <>
      <div className="page-head row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <span className="eyebrow">{t("bo_eyebrow")}</span>
          <h2>{t("bo_title")}</h2>
          <p className="muted">{t("bo_p")}</p>
        </div>
        <button className="btn ghost small" onClick={signOut}>{t("logout")}</button>
      </div>
      {settings && !settings.payments_enabled && <div className="note" style={{ marginBottom: 16 }}>{t("payments_off")}</div>}
      <div className="admin-tabs">
        {tabs.map(([key, label]) => (
          <button key={key} className="navbtn" aria-current={tab === key ? "page" : undefined} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "orders" && <OrdersPanel />}
      {tab === "products" && <ProductsPanel />}
      {tab === "settings" && <SettingsPanel />}
    </>
  );
}

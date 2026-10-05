import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminPage } from "./admin/AdminPage";
import { CartProvider } from "./cart/CartContext";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { LanguageProvider, useI18n } from "./i18n/LanguageContext";
import { CartPage } from "./pages/CartPage";
import { CustomOrderPage } from "./pages/CustomOrderPage";
import { ShopPage } from "./pages/ShopPage";
import { SuccessPage } from "./pages/SuccessPage";
import { AdminProvider } from "./state/Admin";
import { ShopDataProvider, useShopData } from "./state/ShopData";
import { ToastProvider } from "./state/Toast";
import { useEffect } from "react";

function Shell() {
  const { t, L } = useI18n();
  const { status, settings } = useShopData();

  useEffect(() => { if (settings) document.title = L(settings.name); }, [settings, L]);

  return (
    <>
      <Header />
      <main>
        {status === "loading" && <div className="panel">{t("loading")}</div>}
        {status === "error" && <div className="note bad" role="alert">{t("load_error")}</div>}
        {status === "ready" && (
          <Routes>
            <Route path="/" element={<ShopPage />} />
            <Route path="/custom" element={<CustomOrderPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<div className="panel empty"><h2>{t("not_found_t")}</h2><p>{t("not_found_p")}</p></div>} />
          </Routes>
        )}
      </main>
      <Footer />
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ToastProvider>
          <ShopDataProvider>
            <AdminProvider>
              <CartProvider>
                <Shell />
              </CartProvider>
            </AdminProvider>
          </ShopDataProvider>
        </ToastProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

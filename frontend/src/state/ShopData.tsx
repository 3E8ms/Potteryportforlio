/** Loads products and shop settings once and shares them with every page. */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { Product, ShopSettings } from "../api/types";

interface ShopData {
  products: Product[];
  settings: ShopSettings | null;
  status: "loading" | "ready" | "error";
  reload: () => Promise<void>;
  productById: (id: number) => Product | undefined;
}

const Ctx = createContext<ShopData | null>(null);

export function ShopDataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [status, setStatus] = useState<ShopData["status"]>("loading");

  const reload = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api.products(), api.settings()]);
      setProducts(p);
      setSettings(s);
      setStatus("ready");
    } catch {
      setStatus((prev) => (prev === "ready" ? prev : "error"));
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const productById = useCallback((id: number) => products.find((p) => p.id === id), [products]);

  return <Ctx.Provider value={{ products, settings, status, reload, productById }}>{children}</Ctx.Provider>;
}

export function useShopData(): ShopData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShopData must be used inside ShopDataProvider");
  return v;
}

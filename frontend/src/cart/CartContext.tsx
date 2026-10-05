/** The shopping cart: product id -> quantity, kept in this browser. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "../api/types";
import { storage } from "../lib/storage";
import { useShopData } from "../state/ShopData";

export interface CartLine { product: Product; quantity: number }

interface Cart {
  quantities: Record<number, number>;
  lines: CartLine[];
  count: number;
  totalCents: number;
  add: (id: number, qty: number) => void;
  setQuantity: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
}

const KEY = "xl-cart";
const Ctx = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, status } = useShopData();
  const [quantities, setQuantities] = useState<Record<number, number>>(() => storage.get(KEY, {}) ?? {});

  useEffect(() => { storage.set(KEY, quantities); }, [quantities]);

  const lines = useMemo(() => {
    const out: CartLine[] = [];
    for (const [id, qty] of Object.entries(quantities)) {
      const product = products.find((p) => p.id === Number(id));
      const quantity = product ? Math.min(qty, product.stock) : 0;
      if (product && quantity > 0) out.push({ product, quantity });
    }
    return out;
  }, [quantities, products]);

  // Drop items that no longer exist or have sold out, once product data is in.
  useEffect(() => {
    if (status !== "ready") return;
    setQuantities((q) => {
      const next: Record<number, number> = {};
      for (const l of lines) next[l.product.id] = l.quantity;
      return JSON.stringify(next) === JSON.stringify(q) ? q : next;
    });
  }, [lines, status]);

  const setQuantity = useCallback((id: number, qty: number) => {
    setQuantities((q) => {
      const next = { ...q };
      if (qty > 0) next[id] = qty; else delete next[id];
      return next;
    });
  }, []);

  const value = useMemo<Cart>(() => ({
    quantities,
    lines,
    count: lines.reduce((a, l) => a + l.quantity, 0),
    totalCents: lines.reduce((a, l) => a + l.quantity * l.product.price_cents, 0),
    add: (id, qty) => setQuantities((q) => ({ ...q, [id]: (q[id] ?? 0) + qty })),
    setQuantity,
    remove: (id) => setQuantity(id, 0),
    clear: () => setQuantities({}),
  }), [quantities, lines, setQuantity]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): Cart {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside CartProvider");
  return v;
}

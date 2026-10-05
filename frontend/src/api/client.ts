/** Thin wrapper around fetch for the shop API. */
import type {
  CheckoutResult, Customer, Lang, OrderAdmin, OrderList, OrderPublic, OrderStatus,
  Product, ProductInput, SettingsInput, ShopSettings,
} from "./types";

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === "string" ? detail : `HTTP ${status}`);
  }
  /** The error code the API returned, e.g. "not_enough_stock". */
  get code(): string | undefined {
    if (typeof this.detail === "string") return this.detail;
    if (this.detail && typeof this.detail === "object" && "code" in this.detail) {
      return String((this.detail as { code: unknown }).code);
    }
    return undefined;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers, credentials: "same-origin" });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.detail ?? body);
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });

export const api = {
  products: () => request<Product[]>("/api/products"),
  settings: () => request<ShopSettings>("/api/settings"),
  checkout: (items: { product_id: number; quantity: number }[], customer: Customer, lang: Lang) =>
    request<CheckoutResult>("/api/checkout", json("POST", { items, customer, lang })),
  order: (orderNo: string, sessionId: string) =>
    request<OrderPublic>(`/api/orders/${encodeURIComponent(orderNo)}?session_id=${encodeURIComponent(sessionId)}`),
};

export const adminApi = {
  me: () => request<{ username: string }>("/api/admin/me"),
  login: (username: string, password: string) =>
    request<{ username: string }>("/api/admin/login", json("POST", { username, password })),
  logout: () => request<void>("/api/admin/logout", { method: "POST" }),
  orders: (q: string) => request<OrderList>(`/api/admin/orders?q=${encodeURIComponent(q)}`),
  setStatus: (orderNo: string, status: OrderStatus) =>
    request<OrderAdmin>(`/api/admin/orders/${encodeURIComponent(orderNo)}`, json("PATCH", { status })),
  products: () => request<Product[]>("/api/admin/products"),
  createProduct: (p: ProductInput) => request<Product>("/api/admin/products", json("POST", p)),
  updateProduct: (id: number, p: ProductInput) => request<Product>(`/api/admin/products/${id}`, json("PUT", p)),
  deleteProduct: (id: number) => request<void>(`/api/admin/products/${id}`, { method: "DELETE" }),
  uploadImage: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Product>(`/api/admin/products/${id}/image`, { method: "POST", body: form });
  },
  removeImage: (id: number) => request<Product>(`/api/admin/products/${id}/image`, { method: "DELETE" }),
  saveSettings: (s: SettingsInput) => request<ShopSettings>("/api/admin/settings", json("PUT", s)),
};

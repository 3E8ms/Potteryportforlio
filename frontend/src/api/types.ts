export type Lang = "en" | "hans" | "hant";
export type I18nText = Partial<Record<Lang, string>>;
export type Season = "spring" | "summer" | "autumn" | "winter";
export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export interface Product {
  id: number;
  name: I18nText;
  description: I18nText;
  type: I18nText;
  theme: I18nText;
  year: number;
  season: Season | null;
  price_cents: number;
  stock: number;
  tone: number;
  image_url: string | null;
  is_sample: boolean;
  is_active: boolean;
}

export type ProductInput = Omit<Product, "id" | "image_url" | "is_sample">;

export interface ShopSettings {
  name: I18nText;
  tagline: I18nText;
  market_at: string | null;
  market_place: I18nText;
  form_link: string;
  payments_enabled: boolean;
}

export type SettingsInput = Omit<ShopSettings, "payments_enabled">;

export interface Customer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  note: string;
}

export interface CheckoutResult {
  order_no: string;
  checkout_url: string;
  payments_enabled: boolean;
}

export interface OrderItem {
  product_id: number | null;
  name: I18nText;
  unit_price_cents: number;
  quantity: number;
}

export interface OrderPublic {
  order_no: string;
  status: OrderStatus;
  total_cents: number;
  email: string;
  created_at: string;
  items: OrderItem[];
}

export interface OrderAdmin extends OrderPublic {
  id: number;
  lang: Lang;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  note: string;
  stock_applied: boolean;
  stock_short: boolean;
  stripe_session_id: string | null;
  paid_at: string | null;
  shipped_at: string | null;
}

export interface OrderList {
  orders: OrderAdmin[];
  counts: Partial<Record<OrderStatus, number>>;
}

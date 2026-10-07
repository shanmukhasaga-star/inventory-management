import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type Sale = Tables<"sales">;
export type Settings = Tables<"settings">;
export type Notification = Tables<"notifications">;
export type Profile = Tables<"profiles">;

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatINR(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "₹0";
  const isWhole = Math.abs(n - Math.round(n)) < 0.005;
  return `₹${isWhole ? inr.format(Math.round(n)) : inr2.format(n)}`;
}

export function formatCompactINR(value: number): string {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return formatINR(value);
}

export function formatNumber(value: number): string {
  return inr.format(value);
}

export type StockStatus = "out" | "low" | "ok";

export function stockStatus(p: Pick<Product, "quantity" | "min_stock">): StockStatus {
  if (p.quantity <= 0) return "out";
  if (p.quantity <= p.min_stock) return "low";
  return "ok";
}

export const stockStatusLabel: Record<StockStatus, string> = {
  out: "Out of stock",
  low: "Low stock",
  ok: "In stock",
};

export function productValue(p: Pick<Product, "quantity" | "purchase_price">): number {
  return p.quantity * Number(p.purchase_price);
}

export function speakableINR(value: number): string {
  const n = Math.round(value);
  return `${inr.format(n)} rupees`;
}

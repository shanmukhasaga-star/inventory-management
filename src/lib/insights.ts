import {
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  format,
  isAfter,
  differenceInCalendarDays,
} from "date-fns";
import { formatINR, productValue, stockStatus, type Product, type Sale } from "./format";

export interface Analytics {
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  lowStock: Product[];
  outOfStock: Product[];
  todaySales: number;
  todayCount: number;
  weekSales: number;
  monthSales: number;
  monthCount: number;
  monthProfit: number;
  salesByDay: { date: string; label: string; sales: number; count: number }[];
  salesByMonth: { month: string; sales: number; purchases: number; profit: number }[];
  categoryQty: { category: string; quantity: number; value: number; products: number }[];
  topSelling: { product: Product; units: number; revenue: number; perDay: number }[];
  notMoving: Product[];
  reorder: { product: Product; suggested: number; perDay: number; daysLeft: number | null }[];
  insights: Insight[];
}

export interface Insight {
  tone: "danger" | "warning" | "success" | "info";
  title: string;
  detail: string;
}

export function computeAnalytics(products: Product[], sales: Sale[], now = new Date()): Analytics {
  const today = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const thirtyAgo = subDays(now, 30);

  const totalQuantity = products.reduce((s, p) => s + p.quantity, 0);
  const totalValue = products.reduce((s, p) => s + productValue(p), 0);
  const totalRetailValue = products.reduce((s, p) => s + p.quantity * Number(p.selling_price), 0);

  const lowStock = products.filter((p) => stockStatus(p) === "low");
  const outOfStock = products.filter((p) => stockStatus(p) === "out");

  const costOf = new Map(products.map((p) => [p.id, Number(p.purchase_price)]));

  let todaySales = 0,
    todayCount = 0,
    weekSales = 0,
    monthSales = 0,
    monthCount = 0,
    monthProfit = 0;
  for (const s of sales) {
    const d = new Date(s.sold_at);
    const amt = Number(s.total_amount);
    if (isAfter(d, today)) {
      todaySales += amt;
      todayCount++;
    }
    if (isAfter(d, weekStart)) weekSales += amt;
    if (isAfter(d, monthStart)) {
      monthSales += amt;
      monthCount++;
      const cost = (s.product_id ? costOf.get(s.product_id) : undefined) ?? 0;
      monthProfit += amt - cost * s.quantity;
    }
  }

  // Sales by day (last 30 days)
  const dayMap = new Map<string, { sales: number; count: number }>();
  for (let i = 29; i >= 0; i--) {
    dayMap.set(format(subDays(now, i), "yyyy-MM-dd"), { sales: 0, count: 0 });
  }
  for (const s of sales) {
    const key = format(new Date(s.sold_at), "yyyy-MM-dd");
    const e = dayMap.get(key);
    if (e) {
      e.sales += Number(s.total_amount);
      e.count++;
    }
  }
  const salesByDay = [...dayMap.entries()].map(([date, v]) => ({
    date,
    label: format(new Date(date), "d MMM"),
    ...v,
  }));

  // Sales by month (last 6 months) with purchase cost estimate
  const monthMap = new Map<string, { sales: number; purchases: number }>();
  for (let i = 5; i >= 0; i--) {
    monthMap.set(format(subMonths(now, i), "yyyy-MM"), { sales: 0, purchases: 0 });
  }
  for (const s of sales) {
    const key = format(new Date(s.sold_at), "yyyy-MM");
    const e = monthMap.get(key);
    if (e) {
      e.sales += Number(s.total_amount);
      const cost = (s.product_id ? costOf.get(s.product_id) : undefined) ?? Number(s.unit_price) * 0.8;
      e.purchases += cost * s.quantity;
    }
  }
  const salesByMonth = [...monthMap.entries()].map(([m, v]) => ({
    month: format(new Date(m + "-01"), "MMM yy"),
    sales: Math.round(v.sales),
    purchases: Math.round(v.purchases),
    profit: Math.round(v.sales - v.purchases),
  }));

  // Category breakdown
  const catMap = new Map<string, { quantity: number; value: number; products: number }>();
  for (const p of products) {
    const e = catMap.get(p.category) ?? { quantity: 0, value: 0, products: 0 };
    e.quantity += p.quantity;
    e.value += productValue(p);
    e.products++;
    catMap.set(p.category, e);
  }
  const categoryQty = [...catMap.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.value - a.value);

  // Velocity (last 30 days)
  const unitMap = new Map<string, { units: number; revenue: number; last: Date | null }>();
  for (const s of sales) {
    if (!s.product_id) continue;
    const d = new Date(s.sold_at);
    const e = unitMap.get(s.product_id) ?? { units: 0, revenue: 0, last: null };
    if (!e.last || d > e.last) e.last = d;
    if (isAfter(d, thirtyAgo)) {
      e.units += s.quantity;
      e.revenue += Number(s.total_amount);
    }
    unitMap.set(s.product_id, e);
  }
  const topSelling = products
    .map((product) => {
      const e = unitMap.get(product.id);
      const units = e?.units ?? 0;
      return { product, units, revenue: e?.revenue ?? 0, perDay: units / 30 };
    })
    .filter((x) => x.units > 0)
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);

  const notMoving = products.filter((p) => {
    const e = unitMap.get(p.id);
    if (!e || !e.last) return p.quantity > 0 && differenceInCalendarDays(now, new Date(p.created_at)) >= 14;
    return e.units === 0 && p.quantity > 0;
  });

  const reorder = products
    .map((product) => {
      const e = unitMap.get(product.id);
      const perDay = (e?.units ?? 0) / 30;
      const target = Math.ceil(perDay * 14) + product.min_stock;
      const suggested = Math.max(0, target - product.quantity);
      const daysLeft = perDay > 0 ? Math.floor(product.quantity / perDay) : null;
      return { product, suggested, perDay, daysLeft };
    })
    .filter((r) => r.suggested > 0 && (stockStatus(r.product) !== "ok" || (r.daysLeft !== null && r.daysLeft <= 10)))
    .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

  // Automatic insights
  const insights: Insight[] = [];
  if (outOfStock.length)
    insights.push({
      tone: "danger",
      title: `${outOfStock.length} product${outOfStock.length > 1 ? "s are" : " is"} out of stock`,
      detail: `${outOfStock
        .slice(0, 3)
        .map((p) => p.name)
        .join(", ")}${outOfStock.length > 3 ? " and more" : ""} cannot be sold right now. Reorder today to avoid lost sales.`,
    });
  if (lowStock.length)
    insights.push({
      tone: "warning",
      title: `${lowStock.length} product${lowStock.length > 1 ? "s are" : " is"} running low`,
      detail: `Below minimum level: ${lowStock
        .slice(0, 3)
        .map((p) => `${p.name} (${p.quantity} left)`)
        .join(", ")}.`,
    });
  const fastest = topSelling[0];
  if (fastest)
    insights.push({
      tone: "success",
      title: `${fastest.product.name} is your fastest seller`,
      detail: `${fastest.units} units sold in the last 30 days, earning ${formatINR(fastest.revenue)}. Keep at least ${Math.ceil(fastest.perDay * 14)} units in stock.`,
    });
  const urgent = reorder.find((r) => r.daysLeft !== null && r.daysLeft <= 5 && r.product.quantity > 0);
  if (urgent)
    insights.push({
      tone: "warning",
      title: `${urgent.product.name} may run out in about ${urgent.daysLeft} day${urgent.daysLeft === 1 ? "" : "s"}`,
      detail: `At the current selling speed, order around ${urgent.suggested} more units soon.`,
    });
  if (notMoving.length)
    insights.push({
      tone: "info",
      title: `${notMoving.length} product${notMoving.length > 1 ? "s have" : " has"} not sold in 30 days`,
      detail: `${formatINR(notMoving.reduce((s, p) => s + productValue(p), 0))} is tied up in slow stock like ${notMoving
        .slice(0, 2)
        .map((p) => p.name)
        .join(" and ")}. Consider a discount or ordering less next time.`,
    });
  const topCat = categoryQty[0];
  if (topCat && totalValue > 0)
    insights.push({
      tone: "info",
      title: `${topCat.category} holds ${Math.round((topCat.value / totalValue) * 100)}% of your inventory value`,
      detail: `${formatINR(topCat.value)} across ${topCat.products} products. A balanced mix reduces risk.`,
    });
  const lastMonth = salesByMonth[salesByMonth.length - 2];
  const thisMonth = salesByMonth[salesByMonth.length - 1];
  if (lastMonth && thisMonth && lastMonth.sales > 0) {
    const change = ((thisMonth.sales - lastMonth.sales) / lastMonth.sales) * 100;
    insights.push({
      tone: change >= 0 ? "success" : "warning",
      title: `Sales are ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(0)}% vs last month so far`,
      detail: `${formatINR(thisMonth.sales)} this month compared to ${formatINR(lastMonth.sales)} last month.`,
    });
  }
  if (products.length === 0)
    insights.push({
      tone: "info",
      title: "Add your first product",
      detail: "Insights appear automatically once you add products and record sales.",
    });

  return {
    totalProducts: products.length,
    totalQuantity,
    totalValue,
    totalRetailValue,
    potentialProfit: totalRetailValue - totalValue,
    lowStock,
    outOfStock,
    todaySales,
    todayCount,
    weekSales,
    monthSales,
    monthCount,
    monthProfit,
    salesByDay,
    salesByMonth,
    categoryQty,
    topSelling,
    notMoving,
    reorder,
    insights,
  };
}

/** Builds a compact text summary for the AI model. */
export function summarizeForAI(products: Product[], sales: Sale[]): string {
  const a = computeAnalytics(products, sales);
  const lines: string[] = [];
  lines.push(`Products: ${a.totalProducts}, total units: ${a.totalQuantity}, inventory cost value: ${formatINR(a.totalValue)}, retail value: ${formatINR(a.totalRetailValue)}.`);
  lines.push(`Sales: today ${formatINR(a.todaySales)}, this week ${formatINR(a.weekSales)}, this month ${formatINR(a.monthSales)} (${a.monthCount} sales).`);
  lines.push(`Monthly sales (last 6 months): ${a.salesByMonth.map((m) => `${m.month}=${formatINR(m.sales)}`).join(", ")}.`);
  lines.push(`Out of stock: ${a.outOfStock.map((p) => `${p.name} [${p.sku}]`).join(", ") || "none"}.`);
  lines.push(`Low stock: ${a.lowStock.map((p) => `${p.name} (${p.quantity}/${p.min_stock})`).join(", ") || "none"}.`);
  lines.push(`Fast sellers (30d): ${a.topSelling.map((t) => `${t.product.name} ${t.units} units`).join(", ") || "none"}.`);
  lines.push(`Not moving (30d): ${a.notMoving.map((p) => `${p.name} (${p.quantity} units, ${formatINR(productValue(p))})`).join(", ") || "none"}.`);
  lines.push(`Reorder suggestions: ${a.reorder.map((r) => `${r.product.name} +${r.suggested}${r.daysLeft !== null ? ` (~${r.daysLeft} days left)` : ""}`).join(", ") || "none"}.`);
  lines.push(`Categories: ${a.categoryQty.map((c) => `${c.category} ${c.quantity} units / ${formatINR(c.value)}`).join(", ")}.`);
  lines.push(`All products: ${products.map((p) => `${p.name} [${p.sku}, ${p.category}, qty ${p.quantity}, min ${p.min_stock}, buy ${formatINR(p.purchase_price)}, sell ${formatINR(p.selling_price)}]`).join("; ")}.`);
  return lines.join("\n");
}

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { productsQuery, salesQuery } from "@/lib/queries";
import { computeAnalytics } from "@/lib/insights";

export function useInventoryData() {
  const products = useQuery(productsQuery);
  const sales = useQuery(salesQuery);
  const analytics = useMemo(
    () => computeAnalytics(products.data ?? [], sales.data ?? []),
    [products.data, sales.data],
  );
  return {
    products: products.data ?? [],
    sales: sales.data ?? [],
    analytics,
    isLoading: products.isLoading || sales.isLoading,
    error: (products.error ?? sales.error) as Error | null,
  };
}

export const CHART_COLORS = [
  "hsl(var(--chart-1, 217 91% 55%))",
  "hsl(var(--chart-2, 199 89% 48%))",
  "hsl(var(--chart-3, 152 60% 42%))",
  "hsl(var(--chart-4, 38 92% 50%))",
  "hsl(var(--chart-5, 262 70% 60%))",
  "#64748b",
];

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

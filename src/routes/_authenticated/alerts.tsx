import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { PageHeader, SectionCard, StatCard, EmptyState, PageSkeleton } from "@/components/app/PageBits";
import { StockBadge } from "@/components/app/StockBadge";
import { Button } from "@/components/ui/button";
import { useInventoryData, CHART_COLORS } from "@/lib/use-analytics";
import { formatINR, formatNumber, stockStatus, productValue } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Low Stock Alerts — StockSense AI" },
      { name: "description", content: "See which products are low or out of stock and how much to reorder." },
      { property: "og:title", content: "Low Stock Alerts — StockSense AI" },
      { property: "og:description", content: "Products below minimum level, with reorder suggestions." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { analytics, isLoading } = useInventoryData();
  if (isLoading) return <PageSkeleton />;

  const { lowStock, outOfStock, reorder } = analytics;
  const chartData = [...outOfStock, ...lowStock].slice(0, 10).map((p) => ({
    name: p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name,
    quantity: p.quantity,
    minimum: p.min_stock,
  }));
  const attention = [...outOfStock, ...lowStock];

  return (
    <div>
      <PageHeader title="Low Stock Alerts" description="Products that need your attention today." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Out of stock" value={formatNumber(outOfStock.length)} icon={XCircle} tone="danger" />
        <StatCard title="Low stock" value={formatNumber(lowStock.length)} icon={AlertTriangle} tone="warning" />
        <StatCard title="Reorder suggestions" value={formatNumber(reorder.length)} icon={CheckCircle2} tone="info" />
      </div>

      {chartData.length > 0 && (
        <SectionCard className="mt-6" title="Stock vs minimum level" description="Lowest 10 products">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={12} width={40} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" name="In stock" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="minimum" name="Minimum level" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      <SectionCard className="mt-6" title="Products needing attention">
        {attention.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All stock levels are healthy" description="Nothing is below its minimum level right now." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3 text-right">In stock</th>
                  <th className="py-2 pr-3 text-right">Minimum</th>
                  <th className="py-2 pr-3 text-right">Suggested order</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {attention.map((p) => {
                  const r = reorder.find((x) => x.product.id === p.id);
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{p.sku}</td>
                      <td className="py-2.5 pr-3">{p.category}</td>
                      <td className="num py-2.5 pr-3 text-right">{p.quantity}</td>
                      <td className="num py-2.5 pr-3 text-right">{p.min_stock}</td>
                      <td className="num py-2.5 pr-3 text-right font-semibold">{r?.suggested ?? Math.max(0, p.min_stock * 2 - p.quantity)}</td>
                      <td className="py-2.5 pr-3"><StockBadge status={stockStatus(p)} /></td>
                      <td className="py-2.5 text-right">
                        <Button asChild size="sm" variant="outline"><Link to="/products">Update stock</Link></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Money tied up in these products: {formatINR(attention.reduce((s, p) => s + productValue(p), 0))}
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

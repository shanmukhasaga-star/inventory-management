import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileBarChart, Download, IndianRupee, Package, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { PageHeader, SectionCard, StatCard, EmptyState, PageSkeleton } from "@/components/app/PageBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockBadge } from "@/components/app/StockBadge";
import { useInventoryData, downloadCSV, CHART_COLORS } from "@/lib/use-analytics";
import { formatINR, formatNumber, formatCompactINR, productValue, stockStatus, stockStatusLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — StockSense AI" },
      { name: "description", content: "Sales, inventory, low-stock, category and performance reports in ₹ with CSV export." },
      { property: "og:title", content: "Reports — StockSense AI" },
      { property: "og:description", content: "Sales, inventory and performance reports in ₹." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { products, sales, analytics, isLoading } = useInventoryData();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rangeSales = useMemo(() => {
    const f = from ? new Date(from).getTime() : -Infinity;
    const t = to ? new Date(to).getTime() + 86400000 : Infinity;
    return sales.filter((s) => {
      const d = new Date(s.sold_at).getTime();
      return d >= f && d <= t;
    });
  }, [sales, from, to]);

  const rangeTotal = rangeSales.reduce((s, x) => s + Number(x.total_amount), 0);
  const units = rangeSales.reduce((s, x) => s + x.quantity, 0);

  const performance = useMemo(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>();
    for (const s of rangeSales) {
      const key = s.product_id ?? s.product_name;
      const e = map.get(key) ?? { name: s.product_name, units: 0, revenue: 0 };
      e.units += s.quantity;
      e.revenue += Number(s.total_amount);
      map.set(key, e);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [rangeSales]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Filter by date and export what you need."
        actions={<Button variant="outline" onClick={() => window.print()}><Download className="size-4" /> Print / PDF</Button>}
      />

      <SectionCard title="Date filter" description="Applies to sales and performance reports">
        <div className="grid gap-3 sm:grid-cols-3 sm:max-w-xl">
          <div>
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>Clear</Button>
          </div>
        </div>
      </SectionCard>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard title="Sales in period" value={formatINR(rangeTotal)} icon={TrendingUp} hint={`${rangeSales.length} transactions`} />
        <StatCard title="Units sold" value={formatNumber(units)} icon={Package} tone="info" />
        <StatCard title="Inventory value now" value={formatINR(analytics.totalValue)} icon={IndianRupee} tone="success" />
      </div>

      <Tabs defaultValue="sales" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="low">Low stock</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="category">Category</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SectionCard
            title="Sales report"
            actions={
              <Button size="sm" variant="outline" onClick={() => downloadCSV("sales-report.csv", [["Date", "Product", "Qty", "Unit Price", "Total"], ...rangeSales.map((s) => [new Date(s.sold_at).toLocaleDateString("en-IN"), s.product_name, s.quantity, Number(s.unit_price), Number(s.total_amount)])])}>
                Export CSV
              </Button>
            }
          >
            <div className="mb-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" fontSize={11} interval={4} />
                  <YAxis fontSize={12} width={60} tickFormatter={(v) => formatCompactINR(Number(v))} />
                  <Tooltip formatter={(v) => formatINR(Number(v))} />
                  <Line type="monotone" dataKey="sales" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {rangeSales.length === 0 ? (
              <EmptyState icon={FileBarChart} title="No sales in this period" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground"><tr className="border-b"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Product</th><th className="py-2 pr-3 text-right">Qty</th><th className="py-2 pr-3 text-right">Unit price</th><th className="py-2 text-right">Total</th></tr></thead>
                  <tbody>
                    {rangeSales.slice(0, 100).map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-muted-foreground">{new Date(s.sold_at).toLocaleDateString("en-IN")}</td>
                        <td className="py-2 pr-3 font-medium">{s.product_name}</td>
                        <td className="num py-2 pr-3 text-right">{s.quantity}</td>
                        <td className="num py-2 pr-3 text-right">{formatINR(s.unit_price)}</td>
                        <td className="num py-2 text-right font-semibold">{formatINR(s.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="inventory">
          <SectionCard
            title="Inventory report"
            description={`Total value ${formatINR(analytics.totalValue)}`}
            actions={
              <Button size="sm" variant="outline" onClick={() => downloadCSV("inventory-report.csv", [["Product", "SKU", "Category", "Qty", "Purchase", "Selling", "Value", "Status"], ...products.map((p) => [p.name, p.sku, p.category, p.quantity, Number(p.purchase_price), Number(p.selling_price), productValue(p), stockStatusLabel[stockStatus(p)]])])}>
                Export CSV
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground"><tr className="border-b"><th className="py-2 pr-3">Product</th><th className="py-2 pr-3">Category</th><th className="py-2 pr-3 text-right">Qty</th><th className="py-2 pr-3 text-right">Value</th><th className="py-2">Status</th></tr></thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{p.name}</td>
                      <td className="py-2 pr-3">{p.category}</td>
                      <td className="num py-2 pr-3 text-right">{p.quantity}</td>
                      <td className="num py-2 pr-3 text-right font-semibold">{formatINR(productValue(p))}</td>
                      <td className="py-2"><StockBadge status={stockStatus(p)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="low">
          <SectionCard title="Low stock report" description={`${analytics.lowStock.length} low · ${analytics.outOfStock.length} out of stock`}>
            {[...analytics.outOfStock, ...analytics.lowStock].length === 0 ? (
              <EmptyState icon={FileBarChart} title="All stock levels are healthy" />
            ) : (
              <ul className="divide-y">
                {[...analytics.outOfStock, ...analytics.lowStock].map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="num text-muted-foreground">{p.quantity}/{p.min_stock}</span>
                      <StockBadge status={stockStatus(p)} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="performance">
          <SectionCard title="Product performance" description="Revenue in the selected period">
            {performance.length === 0 ? (
              <EmptyState icon={FileBarChart} title="No sales in this period" />
            ) : (
              <ul className="divide-y">
                {performance.map((p) => (
                  <li key={p.name} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{p.units} units · <span className="num font-semibold text-foreground">{formatINR(p.revenue)}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="category">
          <SectionCard title="Category report">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground"><tr className="border-b"><th className="py-2 pr-3">Category</th><th className="py-2 pr-3 text-right">Products</th><th className="py-2 pr-3 text-right">Units</th><th className="py-2 text-right">Value</th></tr></thead>
                <tbody>
                  {analytics.categoryQty.map((c) => (
                    <tr key={c.category} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{c.category}</td>
                      <td className="num py-2 pr-3 text-right">{c.products}</td>
                      <td className="num py-2 pr-3 text-right">{c.quantity}</td>
                      <td className="num py-2 text-right font-semibold">{formatINR(c.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

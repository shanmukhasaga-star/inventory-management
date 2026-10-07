import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Package,
  Boxes,
  IndianRupee,
  AlertTriangle,
  XCircle,
  TrendingUp,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { PageHeader, StatCard, SectionCard, EmptyState, PageSkeleton } from "@/components/app/PageBits";
import { StockBadge } from "@/components/app/StockBadge";
import { useInventoryData, CHART_COLORS } from "@/lib/use-analytics";
import { formatINR, formatNumber, formatCompactINR, productValue, stockStatus } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — StockSense AI" },
      { name: "description", content: "Live inventory value, sales and stock alerts for your shop in ₹." },
      { property: "og:title", content: "Dashboard — StockSense AI" },
      { property: "og:description", content: "Live inventory value, sales and stock alerts in ₹." },
    ],
  }),
  component: DashboardPage,
});

const toneClass = {
  danger: "border-destructive/30 bg-destructive/5",
  warning: "border-warning/40 bg-warning/10",
  success: "border-success/30 bg-success/5",
  info: "border-info/30 bg-info/5",
};

function DashboardPage() {
  const { products, sales, analytics, isLoading } = useInventoryData();
  if (isLoading) return <PageSkeleton />;

  const a = analytics;
  const recentSales = sales.slice(0, 6);
  const recentProducts = products.slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A live picture of your stock and sales."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/products">Add product</Link>
            </Button>
            <Button asChild>
              <Link to="/sales">Record sale</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total products" value={formatNumber(a.totalProducts)} icon={Package} />
        <StatCard title="Total quantity" value={formatNumber(a.totalQuantity)} icon={Boxes} tone="info" hint="Units in stock" />
        <StatCard title="Inventory value" value={formatINR(a.totalValue)} icon={IndianRupee} tone="success" hint={`Retail ${formatINR(a.totalRetailValue)}`} />
        <StatCard title="Today's sales" value={formatINR(a.todaySales)} icon={TrendingUp} tone="primary" hint={`${a.todayCount} sales today`} delay={60} />
        <StatCard title="This month" value={formatINR(a.monthSales)} icon={CalendarDays} tone="info" hint={`${a.monthCount} sales`} delay={80} />
        <StatCard title="Low stock" value={formatNumber(a.lowStock.length)} icon={AlertTriangle} tone="warning" hint="Below minimum level" delay={100} />
        <StatCard title="Out of stock" value={formatNumber(a.outOfStock.length)} icon={XCircle} tone="danger" hint="Reorder now" delay={120} />
        <StatCard title="Potential profit" value={formatINR(a.potentialProfit)} icon={IndianRupee} tone="success" hint="If all stock sells" delay={140} />
      </div>

      <SectionCard className="mt-6" title="AI Inventory Insights" description="Automatic findings from your own data">
        <div className="grid gap-3 md:grid-cols-2">
          {a.insights.map((i, idx) => (
            <div key={idx} className={cn("rounded-xl border p-4", toneClass[i.tone])}>
              <p className="flex items-start gap-2 text-sm font-semibold">
                <Sparkles className="mt-0.5 size-4 shrink-0" />
                {i.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{i.detail}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Monthly sales" description="Last 6 months">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={a.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => formatCompactINR(Number(v))} width={60} />
                <Tooltip formatter={(v) => formatINR(Number(v))} />
                <Area type="monotone" dataKey="sales" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Sales vs purchases" description="Revenue against stock cost">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => formatCompactINR(Number(v))} width={60} />
                <Tooltip formatter={(v) => formatINR(Number(v))} />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" name="Purchases" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Stock quantity by category">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.categoryQty}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="category" fontSize={12} />
                <YAxis fontSize={12} width={40} />
                <Tooltip />
                <Bar dataKey="quantity" name="Units" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Category-wise inventory value">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={a.categoryQty} dataKey="value" nameKey="category" innerRadius={45} outerRadius={85} paddingAngle={2}>
                  {a.categoryQty.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatINR(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Recent transactions" actions={<Link className="text-sm text-primary" to="/sales">View all</Link>}>
          {recentSales.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No sales yet" description="Record your first sale to see it here." />
          ) : (
            <ul className="divide-y">
              {recentSales.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.quantity} × {formatINR(s.unit_price)} · {new Date(s.sold_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span className="num font-semibold">{formatINR(s.total_amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recently added products" actions={<Link className="text-sm text-primary" to="/products">View all</Link>}>
          {recentProducts.length === 0 ? (
            <EmptyState icon={Package} title="No products yet" description="Add products to start tracking stock." />
          ) : (
            <ul className="divide-y">
              {recentProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.sku} · {p.category} · {formatINR(productValue(p))}
                    </p>
                  </div>
                  <StockBadge status={stockStatus(p)} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

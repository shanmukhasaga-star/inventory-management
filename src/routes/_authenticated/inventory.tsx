import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Warehouse, Search, IndianRupee, Boxes, Package } from "lucide-react";
import { PageHeader, SectionCard, StatCard, EmptyState, PageSkeleton } from "@/components/app/PageBits";
import { StockBadge } from "@/components/app/StockBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryData, downloadCSV } from "@/lib/use-analytics";
import { formatINR, formatNumber, productValue, stockStatus, stockStatusLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — StockSense AI" },
      { name: "description", content: "Full inventory table with quantity, prices and total value in ₹." },
      { property: "og:title", content: "Inventory — StockSense AI" },
      { property: "og:description", content: "Quantity, prices and total stock value in ₹." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { products, analytics, isLoading } = useInventoryData();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter(
        (p) =>
          (!q || [p.name, p.sku, p.category, p.supplier ?? ""].some((v) => v.toLowerCase().includes(q))) &&
          (category === "all" || p.category === category),
      )
      .sort((a, b) => productValue(b) - productValue(a));
  }, [products, search, category]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock on hand and what it is worth."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCSV("inventory.csv", [
                ["Product", "SKU", "Category", "Quantity", "Purchase Price", "Selling Price", "Total Value", "Status"],
                ...rows.map((p) => [
                  p.name,
                  p.sku,
                  p.category,
                  p.quantity,
                  Number(p.purchase_price),
                  Number(p.selling_price),
                  productValue(p),
                  stockStatusLabel[stockStatus(p)],
                ]),
              ])
            }
          >
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Products" value={formatNumber(analytics.totalProducts)} icon={Package} />
        <StatCard title="Units in stock" value={formatNumber(analytics.totalQuantity)} icon={Boxes} tone="info" />
        <StatCard title="Total inventory value" value={formatINR(analytics.totalValue)} icon={IndianRupee} tone="success" />
      </div>

      <SectionCard className="mt-6" title="Inventory table" description={`${rows.length} products`}>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:max-w-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search inventory…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={Warehouse} title="Nothing in inventory" description="Add products to see them here." action={<Button asChild><Link to="/products">Add product</Link></Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3 text-right">Quantity</th>
                  <th className="py-2 pr-3 text-right">Purchase (₹)</th>
                  <th className="py-2 pr-3 text-right">Selling (₹)</th>
                  <th className="py-2 pr-3 text-right">Total value (₹)</th>
                  <th className="py-2 pr-3">Stock status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{p.sku}</td>
                    <td className="py-2.5 pr-3">{p.category}</td>
                    <td className="num py-2.5 pr-3 text-right">{p.quantity}</td>
                    <td className="num py-2.5 pr-3 text-right">{formatINR(p.purchase_price)}</td>
                    <td className="num py-2.5 pr-3 text-right">{formatINR(p.selling_price)}</td>
                    <td className="num py-2.5 pr-3 text-right font-semibold">{formatINR(productValue(p))}</td>
                    <td className="py-2.5 pr-3"><StockBadge status={stockStatus(p)} /></td>
                    <td className="py-2.5 text-right">
                      <Button asChild size="sm" variant="ghost"><Link to="/products">Manage</Link></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

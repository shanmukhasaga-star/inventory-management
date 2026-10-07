import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Plus, TrendingUp, CalendarDays, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SectionCard, StatCard, EmptyState, PageSkeleton } from "@/components/app/PageBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryData, downloadCSV } from "@/lib/use-analytics";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales — StockSense AI" },
      { name: "description", content: "Record sales in ₹, update stock automatically and review sales history." },
      { property: "og:title", content: "Sales — StockSense AI" },
      { property: "og:description", content: "Record sales in ₹ and review daily, weekly and monthly totals." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const qc = useQueryClient();
  const { products, sales, analytics, isLoading } = useInventoryData();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [range, setRange] = useState("all");

  const selected = products.find((p) => p.id === productId);
  const total = Number(quantity || 0) * Number(price || 0);

  const filtered = useMemo(() => {
    const now = Date.now();
    const days = range === "day" ? 1 : range === "week" ? 7 : range === "month" ? 30 : null;
    if (!days) return sales;
    return sales.filter((s) => now - new Date(s.sold_at).getTime() <= days * 86400000);
  }, [sales, range]);

  const record = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Please choose a product.");
      const qty = Number(quantity);
      const unit = Number(price);
      if (!Number.isInteger(qty) || qty <= 0) throw new Error("Quantity must be at least 1.");
      if (!Number.isFinite(unit) || unit < 0) throw new Error("Please enter a valid selling price.");
      if (qty > selected.quantity) throw new Error(`Only ${selected.quantity} units of ${selected.name} in stock.`);
      const { error } = await supabase.rpc("record_sale", {
        _product_id: selected.id,
        _quantity: qty,
        _unit_price: unit,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sale recorded and stock updated");
      qc.invalidateQueries();
      setOpen(false);
      setQuantity("1");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Record sales; stock updates itself."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCSV("sales.csv", [
                  ["Date", "Product", "Category", "Quantity", "Unit Price", "Total"],
                  ...filtered.map((s) => [
                    new Date(s.sold_at).toLocaleString("en-IN"),
                    s.product_name,
                    s.category ?? "",
                    s.quantity,
                    Number(s.unit_price),
                    Number(s.total_amount),
                  ]),
                ])
              }
            >
              Export CSV
            </Button>
            <Button
              onClick={() => {
                setOpen(true);
                if (!productId && products[0]) {
                  setProductId(products[0].id);
                  setPrice(String(products[0].selling_price));
                }
              }}
            >
              <Plus className="size-4" /> Record sale
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today" value={formatINR(analytics.todaySales)} icon={TrendingUp} hint={`${analytics.todayCount} sales`} />
        <StatCard title="This week" value={formatINR(analytics.weekSales)} icon={CalendarDays} tone="info" />
        <StatCard title="This month" value={formatINR(analytics.monthSales)} icon={CalendarDays} tone="success" hint={`${analytics.monthCount} sales`} />
        <StatCard title="Month profit (est.)" value={formatINR(analytics.monthProfit)} icon={IndianRupee} tone="primary" />
      </div>

      <SectionCard
        className="mt-6"
        title="Sales history"
        description={`${filtered.length} records`}
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="day">Last 24 hours</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No sales in this period" description="Record a sale to see it here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3 text-right">Qty</th>
                  <th className="py-2 pr-3 text-right">Unit price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="py-2.5 pr-3 text-muted-foreground">{new Date(s.sold_at).toLocaleDateString("en-IN")}</td>
                    <td className="py-2.5 pr-3 font-medium">{s.product_name}</td>
                    <td className="py-2.5 pr-3">{s.category ?? "—"}</td>
                    <td className="num py-2.5 pr-3 text-right">{s.quantity}</td>
                    <td className="num py-2.5 pr-3 text-right">{formatINR(s.unit_price)}</td>
                    <td className="num py-2.5 text-right font-semibold">{formatINR(s.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a sale</DialogTitle>
            <DialogDescription>Stock reduces automatically. Sales above available stock are blocked.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Product</Label>
              <Select
                value={productId}
                onValueChange={(v) => {
                  setProductId(v);
                  const p = products.find((x) => x.id === v);
                  if (p) setPrice(String(p.selling_price));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Choose a product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.quantity <= 0}>
                      {p.name} — {p.quantity} left
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="q">Quantity sold</Label>
                <Input id="q" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                {selected && <p className="mt-1 text-xs text-muted-foreground">{selected.quantity} in stock</p>}
              </div>
              <div>
                <Label htmlFor="up">Selling price (₹)</Label>
                <Input id="up" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg bg-accent p-3 text-sm">
              Total amount: <span className="num font-bold">{formatINR(total)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => record.mutate()} disabled={record.isPending}>
              {record.isPending ? "Saving…" : "Record sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

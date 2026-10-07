import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SectionCard, EmptyState, PageSkeleton } from "@/components/app/PageBits";
import { StockBadge } from "@/components/app/StockBadge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryData } from "@/lib/use-analytics";
import { formatINR, productValue, stockStatus, type Product } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products — StockSense AI" },
      { name: "description", content: "Add, edit, search and organise every product with prices in ₹." },
      { property: "og:title", content: "Products — StockSense AI" },
      { property: "og:description", content: "Add, edit and organise products with prices in ₹." },
    ],
  }),
  component: ProductsPage,
});

type FormState = {
  name: string;
  sku: string;
  category: string;
  supplier: string;
  quantity: string;
  min_stock: string;
  purchase_price: string;
  selling_price: string;
};

const empty: FormState = {
  name: "",
  sku: "",
  category: "General",
  supplier: "",
  quantity: "0",
  min_stock: "5",
  purchase_price: "0",
  selling_price: "0",
};

function ProductsPage() {
  const qc = useQueryClient();
  const { products, isLoading } = useInventoryData();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("name");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      const matches =
        !q ||
        [p.name, p.sku, p.category, p.supplier ?? ""].some((v) => v.toLowerCase().includes(q));
      const cat = category === "all" || p.category === category;
      const st = status === "all" || stockStatus(p) === status;
      return matches && cat && st;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "price":
          return Number(b.selling_price) - Number(a.selling_price);
        case "quantity":
          return b.quantity - a.quantity;
        case "value":
          return productValue(b) - productValue(a);
        case "status":
          return stockStatus(a).localeCompare(stockStatus(b));
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [products, search, category, status, sort]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Please sign in again.");
      const quantity = Number(form.quantity);
      const min_stock = Number(form.min_stock);
      const purchase_price = Number(form.purchase_price);
      const selling_price = Number(form.selling_price);
      if (!form.name.trim()) throw new Error("Product name is required.");
      if (!form.sku.trim()) throw new Error("SKU is required.");
      if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Quantity cannot be negative.");
      if (!Number.isFinite(min_stock) || min_stock < 0) throw new Error("Minimum stock cannot be negative.");
      if (purchase_price < 0 || selling_price < 0) throw new Error("Prices cannot be negative.");

      let image_url = editing?.image_url ?? null;
      if (imageFile) {
        const path = `${uid}/${crypto.randomUUID()}-${imageFile.name.replace(/[^\w.-]/g, "")}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, imageFile);
        if (upErr) throw upErr;
        image_url = path;
      }

      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim() || "General",
        supplier: form.supplier.trim() || null,
        quantity,
        min_stock,
        purchase_price,
        selling_price,
        image_url,
      };

      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert({ ...payload, user_id: uid });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product added");
      qc.invalidateQueries();
      setOpen(false);
      setImageFile(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (p: Product) => {
      const { error } = await supabase.from("products").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries();
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing(null);
    setForm(empty);
    setImageFile(null);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      supplier: p.supplier ?? "",
      quantity: String(p.quantity),
      min_stock: String(p.min_stock),
      purchase_price: String(p.purchase_price),
      selling_price: String(p.selling_price),
    });
    setImageFile(null);
    setOpen(true);
  }

  if (isLoading) return <PageSkeleton />;

  const totalValue = Number(form.quantity || 0) * Number(form.purchase_price || 0);

  return (
    <div>
      <PageHeader
        title="Products"
        description="Everything you stock, with prices in ₹."
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" /> Add product
          </Button>
        }
      />

      <SectionCard title="All products" description={`${rows.length} of ${products.length} shown`}>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search name, SKU, supplier…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Stock status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock</SelectItem>
              <SelectItem value="ok">In stock</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="price">Sort: Selling price</SelectItem>
              <SelectItem value="quantity">Sort: Quantity</SelectItem>
              <SelectItem value="value">Sort: Stock value</SelectItem>
              <SelectItem value="status">Sort: Stock status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={Package} title="No products found" description="Try a different search, or add a new product." action={<Button onClick={openNew}>Add product</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Supplier</th>
                  <th className="py-2 pr-3 text-right">Qty</th>
                  <th className="py-2 pr-3 text-right">Purchase</th>
                  <th className="py-2 pr-3 text-right">Selling</th>
                  <th className="py-2 pr-3 text-right">Value</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{p.sku}</td>
                    <td className="py-2.5 pr-3">{p.category}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{p.supplier ?? "—"}</td>
                    <td className="num py-2.5 pr-3 text-right">{p.quantity}</td>
                    <td className="num py-2.5 pr-3 text-right">{formatINR(p.purchase_price)}</td>
                    <td className="num py-2.5 pr-3 text-right">{formatINR(p.selling_price)}</td>
                    <td className="num py-2.5 pr-3 text-right font-semibold">{formatINR(productValue(p))}</td>
                    <td className="py-2.5 pr-3"><StockBadge status={stockStatus(p)} /></td>
                    <td className="py-2.5 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>All money values are in Indian Rupees (₹).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Product name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sku">SKU / Product ID *</Label>
              <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cat">Category</Label>
              <Input id="cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sup">Supplier</Label>
              <Input id="sup" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="qty">Quantity</Label>
              <Input id="qty" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="min">Minimum stock level</Label>
              <Input id="min" type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pp">Purchase price (₹)</Label>
              <Input id="pp" type="number" min="0" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sp">Selling price (₹)</Label>
              <Input id="sp" type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="img">Product image (optional)</Label>
              <Input id="img" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="sm:col-span-2 rounded-lg bg-accent p-3 text-sm">
              Total stock value: <span className="num font-bold">{formatINR(totalValue)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This removes the product from your inventory. Past sales records stay.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

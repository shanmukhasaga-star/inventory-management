import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, Tag, Truck } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { productsQuery } from "@/lib/queries";
import { formatINR, stockStatus } from "@/lib/format";
import { StockBadge } from "./StockBadge";

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const { data: products = [] } = useQuery(productsQuery);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const categories = [...new Set(products.map((p) => p.category))];
  const suppliers = [...new Set(products.map((p) => p.supplier).filter(Boolean))] as string[];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search products, SKU, categories, suppliers…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Products">
          {products.map((p) => (
            <CommandItem
              key={p.id}
              value={`${p.name} ${p.sku} ${p.category} ${p.supplier ?? ""}`}
              onSelect={() => {
                onOpenChange(false);
                navigate({ to: "/products", search: { q: p.sku } });
              }}
            >
              <Package className="text-primary" />
              <div className="flex-1">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.sku} · {p.category} · {formatINR(p.selling_price)}
                </div>
              </div>
              <StockBadge status={stockStatus(p)} />
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Categories">
          {categories.map((c) => (
            <CommandItem
              key={c}
              value={`category ${c}`}
              onSelect={() => {
                onOpenChange(false);
                navigate({ to: "/products", search: { category: c } });
              }}
            >
              <Tag className="text-info" /> {c}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Suppliers">
          {suppliers.map((s) => (
            <CommandItem
              key={s}
              value={`supplier ${s}`}
              onSelect={() => {
                onOpenChange(false);
                navigate({ to: "/products", search: { q: s } });
              }}
            >
              <Truck className="text-success" /> {s}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

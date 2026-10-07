import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, PackageCheck, TrendingUp, Snowflake, Lightbulb } from "lucide-react";
import { PageHeader, SectionCard, EmptyState, PageSkeleton } from "@/components/app/PageBits";
import { StockBadge } from "@/components/app/StockBadge";
import { useInventoryData } from "@/lib/use-analytics";
import { formatINR, stockStatus, productValue } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ai-suggestions")({
  head: () => ({
    meta: [
      { title: "AI Suggestions — StockSense AI" },
      { name: "description", content: "Plain-language restocking, pricing and inventory advice from your own data." },
      { property: "og:title", content: "AI Suggestions — StockSense AI" },
      { property: "og:description", content: "Restocking and inventory advice in simple language." },
    ],
  }),
  component: SuggestionsPage,
});

const toneClass = {
  danger: "border-destructive/30 bg-destructive/5",
  warning: "border-warning/40 bg-warning/10",
  success: "border-success/30 bg-success/5",
  info: "border-info/30 bg-info/5",
};

function SuggestionsPage() {
  const { analytics, isLoading } = useInventoryData();
  if (isLoading) return <PageSkeleton />;
  const a = analytics;

  return (
    <div>
      <PageHeader title="AI Suggestions" description="Simple advice worked out from your real stock and sales." />

      <SectionCard title="What your data is telling you">
        <div className="grid gap-3 md:grid-cols-2">
          {a.insights.map((i, idx) => (
            <div key={idx} className={cn("rounded-xl border p-4", toneClass[i.tone])}>
              <p className="flex items-start gap-2 text-sm font-semibold">
                <Lightbulb className="mt-0.5 size-4 shrink-0" />
                {i.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{i.detail}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Restock these first" description="Suggested reorder quantity for the next 2 weeks">
          {a.reorder.length === 0 ? (
            <EmptyState icon={PackageCheck} title="Nothing urgent" description="Your stock levels look comfortable." />
          ) : (
            <ul className="divide-y">
              {a.reorder.slice(0, 10).map((r) => (
                <li key={r.product.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.product.quantity} left
                      {r.daysLeft !== null ? ` · about ${r.daysLeft} days of stock` : " · slow moving"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="num text-sm font-bold">Order {r.suggested}</p>
                    <StockBadge status={stockStatus(r.product)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Fast sellers" description="Most units sold in the last 30 days">
          {a.topSelling.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No sales in the last 30 days" />
          ) : (
            <ul className="divide-y">
              {a.topSelling.map((t) => (
                <li key={t.product.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.product.name}</p>
                    <p className="text-xs text-muted-foreground">{t.units} units · about {t.perDay.toFixed(1)} per day</p>
                  </div>
                  <span className="num font-semibold">{formatINR(t.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Not moving" description="No sales in the last 30 days">
          {a.notMoving.length === 0 ? (
            <EmptyState icon={Snowflake} title="Everything is selling" />
          ) : (
            <ul className="divide-y">
              {a.notMoving.slice(0, 10).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.quantity} units sitting in stock</p>
                  </div>
                  <span className="num font-semibold">{formatINR(productValue(p))}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Ways to improve" description="Practical next steps">
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2"><Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />Keep about two weeks of stock for your fast sellers so you never lose a sale.</li>
            <li className="flex gap-2"><Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />Money locked in slow stock: {formatINR(a.notMoving.reduce((s, p) => s + productValue(p), 0))}. A small discount can free it up.</li>
            <li className="flex gap-2"><Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />Your stock is worth {formatINR(a.totalValue)} and could sell for {formatINR(a.totalRetailValue)} — a possible profit of {formatINR(a.potentialProfit)}.</li>
            <li className="flex gap-2"><Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />Review minimum stock levels every month so alerts stay accurate.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

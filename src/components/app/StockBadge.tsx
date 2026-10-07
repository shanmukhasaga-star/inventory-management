import { cn } from "@/lib/utils";
import { stockStatusLabel, type StockStatus } from "@/lib/format";

const styles: Record<StockStatus, string> = {
  ok: "bg-success/15 text-success border-success/30",
  low: "bg-warning/20 text-warning-foreground border-warning/40",
  out: "bg-destructive/10 text-destructive border-destructive/30",
};

export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        styles[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", status === "ok" ? "bg-success" : status === "low" ? "bg-warning" : "bg-destructive")} />
      {stockStatusLabel[status]}
    </span>
  );
}

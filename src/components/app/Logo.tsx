import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="gradient-primary flex size-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-float">
        <Boxes className="size-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-base font-bold text-foreground">StockSense AI</div>
          <div className="text-[11px] font-medium text-muted-foreground">Inventory Management</div>
        </div>
      )}
    </div>
  );
}

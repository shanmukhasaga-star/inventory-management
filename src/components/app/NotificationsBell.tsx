import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, AlertTriangle, PackagePlus, ShoppingCart, Info, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notificationsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/format";

export const notificationIcon: Record<string, { icon: typeof Bell; className: string }> = {
  low_stock: { icon: AlertTriangle, className: "bg-warning/15 text-warning-foreground" },
  out_of_stock: { icon: XCircle, className: "bg-destructive/10 text-destructive" },
  product: { icon: PackagePlus, className: "bg-primary/10 text-primary" },
  sale: { icon: ShoppingCart, className: "bg-success/15 text-success" },
  info: { icon: Info, className: "bg-info/15 text-info" },
};

export function NotificationItem({ n, compact }: { n: Notification; compact?: boolean }) {
  const meta = notificationIcon[n.type] ?? notificationIcon["info"]!;
  const Icon = meta.icon;
  return (
    <div className={cn("flex gap-3 rounded-lg p-3", !n.is_read && "bg-accent/50")}>
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", meta.className)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{n.title}</p>
          {!n.is_read && <span className="size-2 rounded-full bg-primary" />}
        </div>
        <p className={cn("text-sm text-muted-foreground", compact && "line-clamp-2")}>{n.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function NotificationsBell() {
  const qc = useQueryClient();
  const { data: notifications = [] } = useQuery({ ...notificationsQuery, refetchInterval: 30_000 });
  const unread = notifications.filter((n) => !n.is_read).length;

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">Notifications</div>
          <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} disabled={unread === 0}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <div className="max-h-[420px] space-y-1 overflow-y-auto p-2">
          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            notifications.slice(0, 20).map((n) => <NotificationItem key={n.id} n={n} compact />)
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

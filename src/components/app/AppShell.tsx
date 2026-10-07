import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  AlertTriangle,
  Sparkles,
  Mic,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { profileQuery, settingsQuery, productsQuery } from "@/lib/queries";
import { stockStatus } from "@/lib/format";
import { Logo } from "./Logo";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsBell } from "./NotificationsBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: Warehouse },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/alerts", label: "Low Stock Alerts", icon: AlertTriangle },
  { to: "/ai-suggestions", label: "AI Suggestions", icon: Sparkles },
  { to: "/voice-assistant", label: "AI Voice Assistant", icon: Mic },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onNavigate, alertCount }: { onNavigate?: (() => void) | undefined; alertCount: number }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" }}
        >
          <item.icon className="size-4.5 shrink-0" />
          <span className="flex-1">{item.label}</span>
          {item.to === "/alerts" && alertCount > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">
              {alertCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery(profileQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { data: products } = useQuery(productsQuery);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV.find((n) => pathname.startsWith(n.to));
  const alertCount = (products ?? []).filter((p) => stockStatus(p) !== "ok").length;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.full_name || profile?.email || "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/dashboard" onClick={onNavigate}>
        <Logo />
      </Link>
      <NavLinks onNavigate={onNavigate} alertCount={alertCount} />
      <button
        onClick={signOut}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <LogOut className="size-4.5" /> Logout
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        {sidebar()}
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebar(() => setOpen(false))}
        </SheetContent>
      </Sheet>

      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex h-16 items-center gap-2 px-4 md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-bold md:text-lg">{current?.label ?? "StockSense"}</div>
            <div className="hidden truncate text-xs text-muted-foreground sm:block">{settings?.shop_name}</div>
          </div>
          <Button
            variant="outline"
            onClick={() => setSearchOpen(true)}
            className="hidden w-64 justify-start gap-2 text-muted-foreground md:flex"
          >
            <Search className="size-4" /> Search products, SKU, category…
            <kbd className="ml-auto rounded border bg-muted px-1.5 text-[10px] font-semibold">⌘K</kbd>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
            <Search />
          </Button>
          <NotificationsBell />
          <Link to="/settings" className="ml-1">
            <Avatar className="size-9 border">
              <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">{initials}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <main className={cn("mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8")}>{children}</main>
    </div>
  );
}

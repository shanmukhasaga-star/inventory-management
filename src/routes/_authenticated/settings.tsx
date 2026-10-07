import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SectionCard, PageSkeleton } from "@/components/app/PageBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { settingsQuery, profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — StockSense AI" },
      { name: "description", content: "Shop name, currency, low-stock threshold, theme and notification preferences." },
      { property: "og:title", content: "Settings — StockSense AI" },
      { property: "og:description", content: "Shop details, alerts threshold, theme and notifications." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery(settingsQuery);
  const profile = useQuery(profileQuery);

  const [shopName, setShopName] = useState("");
  const [threshold, setThreshold] = useState("5");
  const [theme, setTheme] = useState("light");
  const [notify, setNotify] = useState({ low: true, out: true, sales: true, product: true });
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (settings.data) {
      setShopName(settings.data.shop_name);
      setThreshold(String(settings.data.low_stock_threshold));
      setTheme(settings.data.theme);
      setNotify({
        low: settings.data.notify_low_stock,
        out: settings.data.notify_out_of_stock,
        sales: settings.data.notify_sales,
        product: settings.data.notify_new_product,
      });
    }
  }, [settings.data]);

  useEffect(() => {
    if (profile.data) setFullName(profile.data.full_name ?? "");
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const t = Number(threshold);
      if (!shopName.trim()) throw new Error("Shop name is required.");
      if (!Number.isFinite(t) || t < 0) throw new Error("Low stock threshold must be zero or more.");
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Please sign in again.");

      const { error } = await supabase
        .from("settings")
        .update({
          shop_name: shopName.trim(),
          low_stock_threshold: t,
          theme,
          notify_low_stock: notify.low,
          notify_out_of_stock: notify.out,
          notify_sales: notify.sales,
          notify_new_product: notify.product,
        })
        .eq("user_id", uid);
      if (error) throw error;

      const { error: pErr } = await supabase.from("profiles").update({ full_name: fullName.trim() || null }).eq("id", uid);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      document.documentElement.classList.toggle("dark", theme === "dark");
      localStorage.setItem("theme", theme);
      toast.success("Settings saved");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (settings.isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Personalise your shop, alerts and profile." />

      <SectionCard title="Shop details">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="shop">Shop / business name</Label>
            <Input id="shop" value={shopName} onChange={(e) => setShopName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cur">Currency</Label>
            <Input id="cur" value="Indian Rupee (₹)" readOnly disabled />
          </div>
          <div>
            <Label htmlFor="thr">Default low-stock threshold</Label>
            <Input id="thr" type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Used for new products when you don't set one.</p>
          </div>
          <div>
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="mt-4" title="Your profile">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="fn">Full name</Label>
            <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="em">Email</Label>
            <Input id="em" value={profile.data?.email ?? ""} readOnly disabled />
          </div>
        </div>
      </SectionCard>

      <SectionCard className="mt-4" title="Notification preferences">
        <div className="space-y-4">
          {[
            ["low", "Low stock warnings"],
            ["out", "Out of stock warnings"],
            ["sales", "Sale completed"],
            ["product", "New product added"],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label htmlFor={key} className="font-normal">{label}</Label>
              <Switch
                id={key}
                checked={notify[key as keyof typeof notify]}
                onCheckedChange={(v) => setNotify({ ...notify, [key as string]: v })}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="mt-4 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}

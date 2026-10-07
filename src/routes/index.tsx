import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Bot, Boxes, Mic, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StockSense AI — Smart Inventory Management for Indian Shops" },
      {
        name: "description",
        content:
          "Track products, sales and low stock in ₹ with AI suggestions, charts, reports and a voice assistant.",
      },
      { property: "og:title", content: "StockSense AI — Smart Inventory Management" },
      {
        property: "og:description",
        content: "AI-powered inventory, sales and low-stock alerts for shop owners, all in Indian Rupees.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Boxes, title: "Products & Inventory", text: "Add, edit and track every item with SKU, category, supplier and live stock status." },
  { icon: TrendingUp, title: "Sales in ₹", text: "Record sales in seconds. Stock updates automatically and totals are always in Rupees." },
  { icon: BarChart3, title: "Charts & Reports", text: "Monthly sales, category mix, sales vs purchases and CSV exports." },
  { icon: Bot, title: "AI Suggestions", text: "Restock advice, fast and slow movers, reorder quantities explained simply." },
  { icon: Mic, title: "Voice Assistant", text: "Ask “What is my total inventory value?” and hear the answer." },
  { icon: ShieldCheck, title: "Low Stock Alerts", text: "Automatic warnings before you run out of best sellers." },
];

function Landing() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="gradient-hero min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild>
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:pt-20">
        <section className="animate-fade-up max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <Bot className="size-3.5" /> AI-powered inventory for shop owners
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-foreground md:text-6xl">
            Know your stock. <span className="text-primary">Grow your sales.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            StockSense AI tracks products, sales and low stock in Indian Rupees — with charts,
            reports, smart suggestions and a voice assistant that answers your questions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-float">
              <Link to={signedIn ? "/dashboard" : "/auth"} search={signedIn ? {} : { mode: "signup" }}>
                {signedIn ? "Go to dashboard" : "Create free account"}
              </Link>
            </Button>
            {!signedIn && (
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">I already have an account</Link>
              </Button>
            )}
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="surface-card animate-fade-up p-5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="gradient-primary mb-4 inline-flex size-10 items-center justify-center rounded-lg text-primary-foreground">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

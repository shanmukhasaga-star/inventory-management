import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, Send } from "lucide-react";
import { PageHeader, SectionCard, PageSkeleton } from "@/components/app/PageBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventoryData } from "@/lib/use-analytics";
import { formatINR, speakableINR, stockStatus, type Product } from "@/lib/format";
import type { Analytics } from "@/lib/insights";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/voice-assistant")({
  head: () => ({
    meta: [
      { title: "AI Voice Assistant — StockSense AI" },
      { name: "description", content: "Ask about stock, sales and inventory value out loud and hear the answer." },
      { property: "og:title", content: "AI Voice Assistant — StockSense AI" },
      { property: "og:description", content: "Ask about stock and sales out loud, hear the answer." },
    ],
  }),
  component: VoicePage,
});

const EXAMPLES = [
  "Show low stock products",
  "How many products are available?",
  "What is my total inventory value?",
  "Show today's sales",
  "Which products need restocking?",
  "Show products in the grocery category",
];

function answer(q: string, a: Analytics, products: Product[]): string {
  const t = q.toLowerCase();
  const list = (ps: Product[]) => ps.slice(0, 6).map((p) => `${p.name} (${p.quantity})`).join(", ");

  if (t.includes("out of stock"))
    return a.outOfStock.length
      ? `${a.outOfStock.length} products are out of stock: ${list(a.outOfStock)}.`
      : "Good news, nothing is out of stock.";
  if (t.includes("low stock") || t.includes("low-stock"))
    return a.lowStock.length
      ? `${a.lowStock.length} products are low on stock: ${list(a.lowStock)}.`
      : "No products are below their minimum level right now.";
  if (t.includes("restock") || t.includes("reorder"))
    return a.reorder.length
      ? `You should reorder: ${a.reorder.slice(0, 5).map((r) => `${r.product.name}, about ${r.suggested} units`).join("; ")}.`
      : "Nothing needs reordering today.";
  if (t.includes("value") || t.includes("worth"))
    return `Your inventory is worth ${speakableINR(a.totalValue)} at cost, and about ${speakableINR(a.totalRetailValue)} at selling price.`;
  if (t.includes("today"))
    return `Today you made ${speakableINR(a.todaySales)} from ${a.todayCount} sales.`;
  if (t.includes("week")) return `This week's sales are ${speakableINR(a.weekSales)}.`;
  if (t.includes("month") || t.includes("monthly"))
    return `This month you have made ${speakableINR(a.monthSales)} from ${a.monthCount} sales.`;
  if (t.includes("how many") || t.includes("available") || t.includes("total products"))
    return `You have ${a.totalProducts} products and ${a.totalQuantity} units in stock.`;
  if (t.includes("best") || t.includes("fast") || t.includes("top"))
    return a.topSelling.length
      ? `Your fastest seller is ${a.topSelling[0]!.product.name}, with ${a.topSelling[0]!.units} units sold in 30 days.`
      : "There are no sales in the last 30 days.";
  if (t.includes("not moving") || t.includes("slow"))
    return a.notMoving.length
      ? `These are not selling: ${list(a.notMoving)}.`
      : "Everything is selling well.";

  const catMatch = a.categoryQty.find((c) => t.includes(c.category.toLowerCase()));
  if (catMatch) {
    const items = products.filter((p) => p.category === catMatch.category);
    return `${catMatch.category} has ${items.length} products, ${catMatch.quantity} units, worth ${speakableINR(catMatch.value)}: ${list(items)}.`;
  }
  const prod = products.find((p) => t.includes(p.name.toLowerCase()) || t.includes(p.sku.toLowerCase()));
  if (prod)
    return `${prod.name} has ${prod.quantity} units left, selling at ${formatINR(prod.selling_price)}. Status: ${stockStatus(prod) === "ok" ? "in stock" : stockStatus(prod) === "low" ? "low stock" : "out of stock"}.`;

  return "I can tell you about stock levels, inventory value, today's sales, restocking and categories. Try asking: what is my total inventory value?";
}

function VoicePage() {
  const { products, analytics, isLoading } = useInventoryData();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<{ role: "you" | "assistant"; text: string }[]>([]);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript as string;
      setInput(text);
      handle(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => rec.abort?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, analytics]);

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    window.speechSynthesis.speak(u);
  }

  function handle(text: string) {
    const reply = answer(text, analytics, products);
    setLog((l) => [...l, { role: "you", text }, { role: "assistant", text: reply }]);
    speak(reply);
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="AI Voice Assistant" description="Ask about your shop and hear the answer." />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SectionCard title="Conversation">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6">
            <button
              type="button"
              onClick={() => {
                if (!supported) return;
                if (listening) {
                  recRef.current?.stop();
                  setListening(false);
                } else {
                  setListening(true);
                  recRef.current?.start();
                }
              }}
              className={cn(
                "flex size-20 items-center justify-center rounded-full text-primary-foreground transition-all",
                listening ? "animate-pulse bg-destructive shadow-lg" : "bg-primary hover:scale-105",
              )}
              aria-label={listening ? "Stop listening" : "Start listening"}
            >
              {listening ? <MicOff className="size-8" /> : <Mic className="size-8" />}
            </button>
            <p className="text-sm font-medium">
              {!supported ? "Voice input isn't supported in this browser — type instead." : listening ? "Listening…" : "Tap the microphone and ask a question"}
            </p>
          </div>

          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim()) return;
              handle(input.trim());
              setInput("");
            }}
          >
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a question…" />
            <Button type="submit"><Send className="size-4" /></Button>
          </form>

          <div className="mt-4 space-y-3">
            {log.map((m, i) => (
              <div key={i} className={cn("rounded-xl px-4 py-3 text-sm", m.role === "you" ? "ml-auto max-w-[85%] bg-primary text-primary-foreground" : "max-w-[90%] bg-accent")}>
                {m.role === "assistant" && (
                  <button className="mb-1 flex items-center gap-1 text-xs text-muted-foreground" onClick={() => speak(m.text)}>
                    <Volume2 className="size-3.5" /> Read aloud
                  </button>
                )}
                {m.text}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Try asking">
          <ul className="space-y-2">
            {EXAMPLES.map((e) => (
              <li key={e}>
                <button className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => handle(e)}>
                  {e}
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

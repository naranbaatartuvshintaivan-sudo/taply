"use client";

import { useEffect, useRef, useState } from "react";
import { btnLine, btnSolid, eyebrow, Stepper, SummaryRow } from "@/components/order/ui";
import { fmt } from "@/lib/pricing";

// /c/<token> — тоо ширхэг → серверийн үнэ → "Төлөх". Үнийг client тооцохгүй: /api/quote,
// төлөхөд /api/c/<token>/pay дахин тооцно.

type Platform = "fb" | "ig";
type ServerQuote = { totalQty: number; subtotal: number; unitPrice: number | null; deliveryFee: number; total: number };

const LABEL: Record<Platform, string> = { fb: "Facebook", ig: "Instagram" };

export function ChoiceForm({
  token,
  design,
  set,
  platforms,
  initialQuote,
  admin,
}: {
  token: string;
  design: string;
  set: number;
  platforms: Platform[];
  initialQuote: ServerQuote | null;
  admin: boolean;
}) {
  const [qty, setQty] = useState<Record<Platform, number>>({ fb: platforms.includes("fb") ? 1 : 0, ig: platforms.includes("ig") ? 1 : 0 });
  const [quote, setQuote] = useState<ServerQuote | null>(initialQuote);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "custom", platforms, qty }),
          signal: ctrl.signal,
        });
        const d = await r.json();
        if (d.ok) {
          setQuote(d);
          setNote(null);
        } else {
          setQuote(null);
          setNote(d.message ?? "Тоо ширхгээ шалгана уу");
        }
      } catch {
        /* цуцлагдсан */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [qty, platforms]);

  async function pay(test = false) {
    if (busy) return; // давхар дарахаас сэргийлнэ (сервер ч ижил pending-ийг дахин ашиглана)
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/c/${encodeURIComponent(token)}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ d: design, s: String(set), qty, test }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.url) {
        window.location.href = d.url; // pay.wire.mn — busy хэвээр
        return;
      }
      if (d.paid && d.orderId) {
        window.location.href = `/o/${d.orderId}`;
        return;
      }
      setError(d.message ?? "Алдаа гарлаа. Дахин оролдоно уу.");
    } catch {
      setError("Сүлжээний алдаа. Дахин оролдоно уу.");
    }
    setBusy(false);
  }

  const both = platforms.length > 1;
  return (
    <div className="max-w-[560px]">
      <p className={`${eyebrow} m-0 text-mute`}>Тоо ширхэг</p>
      <div className="mt-4">
        {platforms.map((p) => (
          <div key={p} className="flex min-h-[72px] items-center justify-between gap-6 border-t border-line py-3">
            <span className="text-lg font-bold">{both ? LABEL[p] : "Стенд"}</span>
            <Stepper value={qty[p]} max={99} label={LABEL[p]} onChange={(v) => setQty((q) => ({ ...q, [p]: v }))} />
          </div>
        ))}
      </div>
      {both && <p className="mb-0 mt-3 text-sm text-mute">Аль нэгийг нь эсвэл хоёуланг нь захиалж болно. Үнэ нийт тоогоор тооцогдоно.</p>}

      <div className="mt-10">
        {quote ? (
          <>
            <SummaryRow k={quote.unitPrice ? `${quote.totalQty} × ${fmt(quote.unitPrice)}₮` : `${quote.totalQty} ширхэг`} v={`${fmt(quote.subtotal)}₮`} />
            <SummaryRow k="Хүргэлт" v={quote.deliveryFee === 0 ? "Үнэгүй" : `${fmt(quote.deliveryFee)}₮`} />
            <SummaryRow k="Нийт" v={`${fmt(quote.total)}₮`} strong />
          </>
        ) : (
          <p role="status" className="m-0 border-t border-line py-[18px] text-base font-semibold">{note ?? "…"}</p>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-0 mt-6 text-base font-semibold text-[#c62828]">
          {error}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" className={btnSolid} disabled={!quote || busy} onClick={() => pay(false)}>
          {busy ? "Түр хүлээнэ үү…" : "Төлөх"}
        </button>
        {admin && (
          <button type="button" className={btnLine} disabled={busy} onClick={() => pay(true)}>
            🧪 Тест горим: 100₮
          </button>
        )}
      </div>
    </div>
  );
}

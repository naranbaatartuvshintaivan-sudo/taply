"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { btnSolid } from "./ui";

// Төлбөр хүлээгдэж байх үед 3 сек тутам төлөв шалгана. Өөрчлөгдвөл хуудсыг серверээс дахин зурна.
export function StatusPoller({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const last = useRef(status);

  useEffect(() => {
    last.current = status;
    if (status !== "pending_payment") return;
    let stop = false;
    let n = 0;
    const tick = async () => {
      if (stop || document.hidden) return;
      n++;
      try {
        const r = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        const d = await r.json();
        if (d.ok && d.status !== last.current) {
          last.current = d.status;
          router.refresh();
        }
      } catch {
        /* сүлжээ тасарсан — дараагийн удаа */
      }
    };
    // 3 сек тутам, 20 минутын дараа зогсоно (дахин ачаалбал үргэлжилнэ)
    const id = window.setInterval(() => (n < 400 ? tick() : window.clearInterval(id)), 3000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [orderId, status, router]);

  return null;
}

export function RetryButton({ orderId, label = "Дахин төлөх" }: { orderId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
      const d = await r.json();
      if (d.ok && typeof d.url === "string") {
        window.location.href = d.url;
        return;
      }
      if (d.ok && d.status) router.refresh();
      else setMsg(d.message ?? "Алдаа гарлаа");
    } catch {
      setMsg("Сүлжээний алдаа. Дахин оролдоно уу.");
    }
    setBusy(false);
  }

  return (
    <div>
      <button type="button" className={btnSolid} onClick={retry} disabled={busy}>
        {busy ? "Түр хүлээнэ үү…" : label}
      </button>
      {msg && (
        <p role="alert" className="mt-4 text-base font-medium text-[#c62828]">
          {msg}
        </p>
      )}
    </div>
  );
}

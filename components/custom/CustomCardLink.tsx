"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { customCardTarget, hasAdminHint } from "@/lib/admin-card";

// "Өөрийн логотой" карт (CUSTOM_PUBLIC=false). Серверээс үргэлж нийтийн хувилбараар (#contact)
// гарна — нүүр хуудас статик хэвээр. Зөвхөн админ дохио-cookie байвал /api/admin/me-ээс асууж,
// сервер баталбал /custom руу солино. Нийтийн хэрэглэгчид нэмэлт хүсэлт явахгүй.
export function CustomCardLink({ className, from, children }: { className: string; from: string; children: ReactNode }) {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (!hasAdminHint(document.cookie)) return;
    const ctrl = new AbortController();
    fetch("/api/admin/me", { cache: "no-store", credentials: "same-origin", signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((d: { ok?: boolean }) => setAdmin(d.ok === true))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const t = customCardTarget(admin);
  return (
    <Link href={t.href} className={className}>
      {children}
      <div className="mt-12 flex items-center justify-between gap-4 text-[15px] font-bold">
        <span>{from}</span>
        <span className="inline-flex items-center gap-2">
          {t.cta} <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

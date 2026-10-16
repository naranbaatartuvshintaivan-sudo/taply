import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { OrderForm } from "@/components/order/OrderForm";
import { SHOW_PRICES } from "@/lib/config";

export const metadata: Metadata = {
  title: "Энгийн карт захиалах — TAPLY",
  description: "Facebook, Instagram NFC наалт, стенд онлайнаар захиалж төлөх.",
};

// /order?test=1 → тест самбар (түлхүүрийн талбартай). Түлхүүр URL-д хэзээ ч орохгүй —
// зөвхөн POST body-д, сервер /api/orders дээр шалгана (Vercel лог, браузерын түүхэнд үлдэхгүй).
export default async function OrderPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const { test } = await searchParams;
  const testPanel = test === "1";

  return (
    <main className="w-full overflow-x-clip bg-white text-ink">
      <Nav showPrices={SHOW_PRICES} home={false} />
      <div className="mx-auto max-w-[1360px] px-6 pt-[96px] md:px-12">
        <p className="mb-6 text-[13px] font-medium uppercase tracking-[.22em] text-mute">Энгийн карт</p>
        <h1 className="m-0 text-[clamp(52px,9vw,128px)] font-extrabold leading-[.95] tracking-[-.045em]">Захиалах.</h1>
        <div className="mt-20">
          <OrderForm testPanel={testPanel} />
        </div>
      </div>
      <Footer />
    </main>
  );
}

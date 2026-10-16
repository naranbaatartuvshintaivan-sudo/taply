import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { OrderForm } from "@/components/order/OrderForm";
import { isAdminKey } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Энгийн карт захиалах — TAPLY",
  description: "Facebook, Instagram NFC наалт, стенд онлайнаар захиалж төлөх.",
};

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  let testKey: string | undefined;
  try {
    if (key && isAdminKey(key)) testKey = key;
  } catch {
    /* env тохируулаагүй — тест горимгүй */
  }

  return (
    <main className="w-full overflow-x-clip bg-white text-ink">
      <Nav home={false} />
      <div className="mx-auto max-w-[1360px] px-6 pt-[96px] md:px-12">
        <p className="mb-6 text-[13px] font-medium uppercase tracking-[.22em] text-mute">Энгийн карт</p>
        <h1 className="m-0 text-[clamp(52px,9vw,128px)] font-extrabold leading-[.95] tracking-[-.045em]">Захиалах.</h1>
        <div className="mt-20">
          <OrderForm testKey={testKey} />
        </div>
      </div>
      <Footer />
    </main>
  );
}

import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { CustomForm } from "@/components/custom/CustomForm";
import { SHOW_PRICES } from "@/lib/config";

export const metadata: Metadata = {
  title: "Өөрийн логотой стенд — TAPLY",
  description: "Логогоо илгээнэ үү. 3 загвар гаргаж үзүүлнэ, та сонгоно.",
};

export default function CustomPage() {
  return (
    <main className="w-full overflow-x-clip bg-white text-ink">
      <Nav showPrices={SHOW_PRICES} home={false} />
      <div className="mx-auto max-w-[1360px] px-6 pt-[96px] md:px-12">
        <p className="mb-6 text-[13px] font-medium uppercase tracking-[.22em] text-mute">Өөрийн логотой</p>
        <h1 className="m-0 text-[clamp(52px,9vw,128px)] font-extrabold leading-[.95] tracking-[-.045em]">Захиалах.</h1>
        <p className="mb-0 mt-10 max-w-[560px] text-xl leading-[1.55] text-[#2a2a2a]">
          Логогоо илгээнэ үү. 3 загвар гаргаж үзүүлнэ, та сонгоно.
        </p>
        <div className="mt-20">
          <CustomForm />
        </div>
      </div>
      <Footer />
    </main>
  );
}

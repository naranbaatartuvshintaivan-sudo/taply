import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

const wrap = "mx-auto max-w-[1360px] px-6 md:px-12";
const eyebrow = "text-[13px] font-medium uppercase tracking-[.22em]";

export type LegalSection = { title: string; body: ReactNode };

// /terms, /privacy зэрэг энгийн текст хуудасны нийтлэг хэв маяг
export function LegalPage({
  label,
  title,
  updated,
  sections,
}: {
  label: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <main className="w-full overflow-x-clip bg-white text-ink">
      <Nav home={false} />
      <div className={`${wrap} pt-[120px]`}>
        <p className={`${eyebrow} mb-6 text-mute`}>{label}</p>
        <h1 className="m-0 max-w-[900px] text-[clamp(44px,7vw,104px)] font-extrabold leading-[.98] tracking-[-.045em]">
          {title}
        </h1>
        <p className="mb-0 mt-10 text-[15px] text-mute">Шинэчилсэн: {updated}</p>

        <div className="mt-[120px] max-w-[760px]">
          {sections.map((s, i) => (
            <section
              key={s.title}
              className={"border-t border-line py-12 " + (i === sections.length - 1 ? "border-b" : "")}
            >
              <h2 className="m-0 text-2xl font-bold tracking-[-.02em]">{s.title}</h2>
              <div className="mt-5 text-base leading-[1.75] text-body [&_li]:mt-2 [&_p]:mb-0 [&_p]:mt-4 [&_p:first-child]:mt-0 [&_strong]:text-ink [&_ul]:mb-0 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}

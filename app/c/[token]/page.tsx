import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChoiceForm } from "@/components/custom/ChoiceForm";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { ADMIN_COOKIE } from "@/lib/admin";
import { CONTACT, SHOW_PRICES } from "@/lib/config";
import { adminFromCookie, customQuote, loadChoice } from "@/lib/custom-checkout";
import { DESIGN_KEYS } from "@/lib/mockups/designs";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
// Token нь нууц линк — хайлтад оруулахгүй, referrer-ээр задруулахгүй
export const metadata: Metadata = {
  title: "Загвараа сонгох — TAPLY",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const eyebrow = "text-[13px] font-medium uppercase tracking-[.22em]";

export default async function ChoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, sp, h, jar] = await Promise.all([params, searchParams, headers(), cookies()]);
  const r = await loadChoice(token, sp.s, sp.d, clientIp(h));
  if (r.kind === "rate_limited") {
    return (
      <main className="min-h-screen bg-white px-6 pt-32 text-ink">
        <p className="mx-auto max-w-[560px] text-lg font-semibold">Хэт олон хандалт. Түр хүлээгээд дахин нээнэ үү.</p>
      </main>
    );
  }
  if (r.kind !== "ok") notFound();

  const p = r.page;
  const s = p.set.design_set;
  const admin = adminFromCookie(jar.get(ADMIN_COOKIE)?.value);
  const q = customQuote(p.platforms, Object.fromEntries(p.platforms.map((x) => [x, 1])));
  const initialQuote = q.ok ? { totalQty: q.totalQty, subtotal: q.subtotal, unitPrice: q.unitPrice, deliveryFee: q.deliveryFee, total: q.total } : null;
  const phones = CONTACT.phones;

  return (
    <main className="w-full overflow-x-clip bg-white text-ink">
      <Nav showPrices={SHOW_PRICES} home={false} />
      <div className="mx-auto max-w-[1360px] px-6 pt-[96px] md:px-12">
        <p className={`${eyebrow} mb-6 text-mute`}>Өөрийн логотой · {p.req.business_name}</p>

        {p.paid ? (
          <>
            <h1 className="m-0 text-[clamp(48px,8vw,112px)] font-extrabold leading-[.95] tracking-[-.045em]">Төлөгдсөн ✓</h1>
            <p className="mb-0 mt-10 max-w-[560px] text-xl leading-[1.55] text-[#2a2a2a]">
              Энэ загварын захиалга ({p.paid.code}) төлөгдсөн. Бид хэвлээд тантай холбогдоно.
            </p>
            <Link href={`/o/${p.paid.id}`} className="mt-10 inline-flex min-h-14 items-center rounded-full bg-ink px-9 text-[15px] font-bold text-white">
              Захиалгаа харах
            </Link>
          </>
        ) : (
          <h1 className="m-0 text-[clamp(48px,8vw,112px)] font-extrabold leading-[.95] tracking-[-.045em]">Загвараа сонгоно уу.</h1>
        )}

        {/* Загвар солих — ижил багц дотор */}
        <nav aria-label="Загвар" className="mt-14 flex flex-wrap gap-3">
          {DESIGN_KEYS.map((k) => (
            <Link
              key={k}
              href={`/c/${encodeURIComponent(p.req.token)}?d=${k}&s=${s}`}
              aria-current={k === p.design ? "page" : undefined}
              scroll={false}
              className={`inline-flex min-h-12 items-center rounded-full px-6 text-[15px] font-bold ${k === p.design ? "bg-ink text-white" : "border-[1.5px] border-ink hover:bg-[#f5f5f5]"}`}
            >
              {k} · {p.labels[k]}
            </Link>
          ))}
        </nav>
        {!p.paid && <p className="mb-0 mt-4 text-sm text-mute">Загвараа өөрчлөх бол дээрээс сонгоно уу.</p>}

        <div className={`mt-10 grid gap-6 ${p.images[p.design].length > 1 ? "md:grid-cols-2" : "max-w-[720px]"}`}>
          {p.images[p.design].map((img) => (
            <figure key={img.platform} className="m-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`Загвар ${p.design} · ${img.label}`} className="block aspect-square w-full rounded-md bg-[#e2e2e2]" />
              {p.images[p.design].length > 1 && <figcaption className="mt-3 text-[15px] font-bold">{img.label}</figcaption>}
            </figure>
          ))}
        </div>

        {!p.paid && (
          <div className="mt-16">
            <ChoiceForm token={p.req.token} design={p.design} set={s} platforms={p.platforms} initialQuote={initialQuote} admin={admin} />
          </div>
        )}

        <p className="mb-0 mt-16 text-base text-body">
          Өөрчлөлт хэрэгтэй бол залгана уу:{" "}
          {phones.map((ph, i) => (
            <span key={ph.href}>
              {i > 0 && " · "}
              <a href={ph.href} className="font-bold text-ink">
                {ph.label}
              </a>
            </span>
          ))}
        </p>
      </div>
      <Footer />
    </main>
  );
}

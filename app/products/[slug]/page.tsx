import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { Photo } from "@/components/Photo";
import { CONTACT, SHOW_PRICES } from "@/lib/config";
import { PRODUCTS, getProduct } from "@/lib/products";

const wrap = "mx-auto max-w-[1360px] px-6 md:px-12";
const eyebrow = "text-[13px] font-medium uppercase tracking-[.22em]";
const btn = "inline-flex min-h-14 items-center justify-center rounded-full px-9 text-[15px] font-bold";

export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  const title = `${p.name} — TAPLY`;
  return {
    title,
    description: p.summary,
    openGraph: { title, description: p.summary, images: [p.src] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();

  const others = PRODUCTS.filter((o) => o.slug !== p.slug);

  return (
    <main className="w-full overflow-x-clip bg-white text-ink">
      <Nav showPrices={SHOW_PRICES} home={false} />

      <div className={`${wrap} pt-12`}>
        <Link
          href="/#products"
          className="inline-flex items-center gap-2 text-sm font-medium text-mute hover:text-ink"
        >
          ← Бүх бүтээгдэхүүн
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-20">
          <Photo n={1} label={p.name} src={p.src} alt={p.alt} aspect="3 / 4" />

          <div className="lg:pt-4">
            <p className={`${eyebrow} mb-6 text-mute`}>Бүтээгдэхүүн</p>
            <h1 className="m-0 text-[clamp(40px,5.5vw,76px)] font-bold leading-[1.05] tracking-[-.035em]">
              {p.name}
            </h1>
            <p className="mb-10 mt-8 max-w-[520px] text-lg leading-[1.65] text-[#2a2a2a]">{p.about}</p>

            <div className="max-w-[520px]">
              {p.features.map((f, i) => (
                <div
                  key={f}
                  className={
                    "border-t border-line py-[18px] text-[17px] font-medium " +
                    (i === p.features.length - 1 ? "border-b" : "")
                  }
                >
                  {f}
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-wrap gap-4">
              {SHOW_PRICES && (
                <Link href="/#price" className={`${btn} bg-ink text-white hover:bg-[#2a2a2a]`}>
                  Үнэ харах
                </Link>
              )}
              <Link
                href="/#order"
                className={`${btn} border-[1.5px] border-ink hover:bg-ink hover:text-white`}
              >
                Захиалах
              </Link>
            </div>

            <p className="mb-0 mt-10 text-base text-body">
              Тусгай захиалгаар залгах:{" "}
              {CONTACT.phones.map((ph, i) => (
                <span key={ph.href}>
                  {i > 0 && " · "}
                  <a href={ph.href} className="font-bold text-ink hover:opacity-55">
                    {ph.label}
                  </a>
                </span>
              ))}
            </p>
          </div>
        </div>

        <section className="pt-[160px]">
          <p className={`${eyebrow} mb-10 text-mute`}>Бусад бүтээгдэхүүн</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {others.map((o, i) => (
              <Link key={o.slug} href={`/products/${o.slug}`} className="group block">
                <div className="group-hover:opacity-90">
                  <Photo
                    n={i + 1}
                    label={o.name}
                    src={o.src}
                    alt={o.alt}
                    aspect="3 / 4"
                    sizes="(min-width:1024px) 20vw, (min-width:640px) 33vw, 50vw"
                  />
                </div>
                <div className="mt-3 text-sm font-medium">{o.name}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}

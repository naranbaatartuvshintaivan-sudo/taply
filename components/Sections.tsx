import Image from "next/image";
import Link from "next/link";
import { CONTACT, PRICE_CARDS, SHOW_PRICES } from "@/lib/config";
import { CUSTOMERS, customerAlt, distribute, type Customer } from "@/lib/customers";
import { PRODUCTS } from "@/lib/products";
import { GoLink } from "./PageTransition";
import { Photo } from "./Photo";

const wrap = "mx-auto max-w-[1360px] px-6 md:px-12";
const eyebrow = "text-[13px] font-medium uppercase tracking-[.22em]";
const h2 = "font-bold leading-[1.05] tracking-[-.035em] text-[clamp(40px,5.5vw,76px)]";
// Хоёр баганат зургийн хэмжээ (1360px wrap, 48px padding, 24px зай)
const HALF = "(min-width:1360px) 620px, (min-width:768px) 46vw, 100vw";

export function Hero() {
  return (
    <section id="top" className={`${wrap} pt-[120px]`}>
      <p className={`${eyebrow} mb-10 text-mute`}>NFC карт · Улаанбаатар</p>
      <h1 className="m-0 text-[clamp(72px,13vw,196px)] font-extrabold leading-[.92] tracking-[-.045em]">
        Tap.
        <br />
        Follow.
      </h1>
      <div className="mt-24 flex flex-wrap items-end justify-between gap-12">
        <p className="m-0 max-w-[460px] text-xl leading-[1.55] text-[#2a2a2a]">
          Утсаа картанд хүргэхэд л таны Instagram, Facebook хуудас нээгдэнэ. Хайх, бичих, QR
          уншуулах шаардлагагүй.
        </p>
        <div className="flex flex-wrap gap-4">
          <GoLink
            id="order"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-ink px-9 text-[15px] font-bold text-white hover:bg-[#2a2a2a]"
          >
            Захиалах
          </GoLink>
          <GoLink
            id="how"
            className="inline-flex min-h-14 items-center justify-center rounded-full border-[1.5px] border-ink px-9 text-[15px] font-bold hover:bg-ink hover:text-white"
          >
            Яаж ажилладаг вэ
          </GoLink>
        </div>
      </div>
      <div className="mt-[120px] grid gap-6 md:grid-cols-2">
        <Photo
          n={1}
          label="Facebook стенд"
          src="/products/fb-stand.png"
          alt="Facebook хуудас руу холбодог NFC болон QR кодтой ширээний стенд"
          aspect="4 / 3"
          sizes={HALF}
          priority
        />
        <Photo
          n={2}
          label="Instagram стенд"
          src="/products/ig-stand.png"
          alt="Instagram хуудас руу холбодог NFC болон QR кодтой ширээний стенд"
          aspect="4 / 3"
          sizes={HALF}
          priority
        />
      </div>
    </section>
  );
}

const steps = [
  { n: "01", t: "Карт ширээн дээр", d: "Касс, ширээ, лангуу, салоны толины дэргэд. Зочин өөрөө олж харна." },
  { n: "02", t: "Утсаа хүргэнэ", d: "Апп татах, камер нээх хэрэггүй. Утасны ар талаар картыг хүрэхэд хангалттай." },
  { n: "03", t: "Хуудас нээгдэнэ", d: "Таны Instagram эсвэл Facebook шууд нээгдэж, нэг товшилтоор дагана." },
];

export function How() {
  return (
    <section id="how" className={`${wrap} pt-[240px]`}>
      <p className={`${eyebrow} mb-6 text-mute`}>Яаж ажилладаг</p>
      <h2 className={`${h2} mb-[120px] max-w-[820px]`}>Гурван секунд. Нэг хүрэлт.</h2>
      <div className="flex flex-wrap gap-x-16 gap-y-20">
        {steps.map((s) => (
          <div key={s.n} className="flex-[1_1_280px] border-t-[1.5px] border-ink pt-8">
            <div className="text-[88px] font-light leading-none tracking-[-.04em]">{s.n}</div>
            <h3 className="mb-4 mt-12 text-2xl font-bold tracking-[-.02em]">{s.t}</h3>
            <p className="m-0 text-base leading-[1.65] text-body">{s.d}</p>
          </div>
        ))}
      </div>
      <ul aria-label="Хэлбэрүүд" className="m-0 mt-[160px] list-none border-b border-line p-0">
        {forms.map((f) => (
          <li
            key={f.name}
            className="grid gap-x-12 gap-y-3 border-t border-line py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] md:items-baseline"
          >
            <span className="text-[clamp(28px,3vw,40px)] font-bold leading-none tracking-[-.03em]">{f.name}</span>
            <span className="text-[15px] font-medium text-mute">{f.size}</span>
            <span className="text-base leading-[1.65] text-body">{f.desc}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const forms = [
  { name: "Наалт", size: "100 × 100 мм", desc: "Касс, ширээ, лангуун дээр наана. Утсаа хүргэхэд хуудас нээгдэнэ." },
  { name: "Стенд", size: "Ширээний босоо стенд", desc: "Ширээн дээр өөрөө зогсоно. NFC болон QR код хоёулаа бий." },
  { name: "Custom", size: "Таны загвараар", desc: "Өөрийн лого, QR, монгол бичвэртэй. Загвар гаргах нь үнэгүй." },
];

// Баганы өргөн: 1360px wrap − 96px padding, 24px зай → 3 багана ≈ 405px; утсан дээр 2 багана
const CLIENT_SIZES = "(min-width:1360px) 410px, (min-width:768px) 31vw, 50vw";
const SPEEDS = [48, 56, 44]; // сек — багана бүр өөр хурдтай, тэгш багана эсрэг чиглэлд (globals.css)

function ClientItem({ c, hidden }: { c: Customer; hidden: boolean }) {
  return (
    <li className="pb-6">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-ph shadow-[0_8px_24px_rgba(0,0,0,.08)]">
        <Image src={c.src} alt={hidden ? "" : customerAlt(c)} fill sizes={CLIENT_SIZES} className="object-cover" />
        {c.name && (
          <p className="absolute inset-x-0 bottom-0 m-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-10 text-[13px] font-medium text-white">
            {c.name}
          </p>
        )}
      </div>
    </li>
  );
}

// Нэг зураг хуудсан дээр хэд хэд гарна — эхний удаагийнх нь л screen reader-т, бусад нь aria-hidden
function Marquee({ cols, className }: { cols: Customer[][]; className: string }) {
  const seen = new Set<string>();
  const first = (c: Customer) => (seen.has(c.src) ? false : (seen.add(c.src), true));
  return (
    <div className={`h-full gap-6 ${className}`}>
      {cols.map((col, i) => (
        <div
          key={i}
          className="marquee-col will-change-transform"
          style={{ "--marquee-duration": `${SPEEDS[i % SPEEDS.length]}s` } as React.CSSProperties}
        >
          <ul className="m-0 list-none p-0">
            {col.map((c, j) => (
              <ClientItem key={j} c={c} hidden={!first(c)} />
            ))}
          </ul>
          <ul aria-hidden className="m-0 list-none p-0">
            {col.map((c, j) => (
              <ClientItem key={j} c={c} hidden />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function Clients() {
  return (
    <section id="clients" className={`${wrap} pt-[240px]`}>
      <h2 className={`${h2} m-0`}>Манай хэрэглэгчид</h2>
      <p className="mb-[120px] mt-8 max-w-[520px] text-xl leading-[1.55] text-[#2a2a2a]">
        Эдгээр газарт TAPLY аль хэдийн ажиллаж байна.
      </p>
      {/* Тасралтгүй гүйдэг баганууд. Дээд, доод ирмэг mask-ээр бүдгэрнэ. */}
      <div
        className="marquee h-[680px] overflow-hidden motion-reduce:hidden"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
        }}
      >
        <Marquee cols={distribute(CUSTOMERS, 2)} className="grid grid-cols-2 md:hidden" />
        <Marquee cols={distribute(CUSTOMERS, 3)} className="hidden grid-cols-3 md:grid" />
      </div>
      {/* prefers-reduced-motion: хөдөлгөөнгүй энгийн grid, зураг бүр нэг удаа */}
      <ul className="m-0 hidden list-none grid-cols-2 gap-x-6 p-0 motion-reduce:grid md:grid-cols-3">
        {CUSTOMERS.map((c) => (
          <ClientItem key={c.src} c={c} hidden={false} />
        ))}
      </ul>
    </section>
  );
}

function Caption() {
  return (
    <div className="mt-4 flex justify-between text-[13px] text-[#9a9a9a]">
      <span>[БАЙРШИЛ]</span>
      <span>[ЦАГ]</span>
    </div>
  );
}

export function City() {
  return (
    <section id="city" className="mt-[280px] bg-ink text-white">
      <div className={`${wrap} py-[200px]`}>
        <p className={`${eyebrow} mb-6 text-[#9a9a9a]`}>Бодит газар</p>
        <h2 className={`${h2} mb-10 max-w-[900px]`}>Хаана ч tap хийж болно.</h2>
        <p className="mb-[120px] max-w-[480px] text-lg leading-[1.6] text-[#b5b5b5]">
          Кафе, салон, дэлгүүр, гудамж. Карт хаана байсан ч хүн утсаа хүргэхэд л хуудас нээгдэнэ.
        </p>

        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-[2_1_520px]">
            <Photo n={3} label="босоо" height={720} dark />
            <Caption />
          </div>
          <div className="flex-[1_1_300px]">
            <Photo n={4} label="" height={420} dark />
            <Caption />
          </div>
        </div>

        <div className="mt-[120px] flex flex-wrap items-start gap-6">
          <div className="mt-[120px] flex-[1_1_300px]">
            <Photo n={5} label="" height={440} dark />
            <Caption />
          </div>
          <div className="flex-[1_1_300px]">
            <Photo n={6} label="босоо" height={600} dark />
            <Caption />
          </div>
          <div className="mt-[240px] flex-[1_1_300px]">
            <Photo n={7} label="" height={380} dark />
            <Caption />
          </div>
        </div>
      </div>
    </section>
  );
}

const offers = [
  "Таны линкийг карт руу бичнэ",
  "QR код хэвлэнэ",
  "Газар дээр нь суурилуулна",
  "Хүргэнэ",
];

export function Offer() {
  return (
    <section className={`${wrap} pt-[240px]`}>
      <div className="flex flex-wrap justify-between gap-20">
        <h2 className={`${h2} m-0 flex-[1_1_420px]`}>Бид пластик биш, бэлэн шийдэл өгнө.</h2>
        <div className="max-w-[520px] flex-[1_1_360px]">
          <p className="mb-10 mt-0 text-lg leading-[1.65] text-[#2a2a2a]">Карт бүрт доорх бүгд багтсан.</p>
          {offers.map((o, i) => (
            <div
              key={o}
              className={
                "border-t border-line py-[22px] text-[17px] font-medium " +
                (i === offers.length - 1 ? "border-b" : "")
              }
            >
              {o}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const chip = "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[13px] font-bold";
const chipSolid = `${chip} bg-ink text-white hover:bg-[#2a2a2a]`;
const chipLine = `${chip} border-[1.5px] border-ink hover:bg-ink hover:text-white`;

export function Products() {
  return (
    <section id="products" className={`${wrap} pt-[240px]`}>
      <p className={`${eyebrow} mb-6 text-mute`}>Бүтээгдэхүүн</p>
      <h2 className={`${h2} mb-[120px] max-w-[820px]`}>Бидний хийдэг зүйлс.</h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((p, i) => (
          <figure key={p.slug} className="m-0">
            <Link href={`/products/${p.slug}`} aria-label={`${p.name} — дэлгэрэнгүй`} className="block hover:opacity-90">
              <Photo
                n={i + 1}
                label={p.name}
                src={p.src}
                alt={p.alt}
                aspect="3 / 4"
                sizes="(min-width:1024px) 34vw, (min-width:640px) 50vw, 100vw"
              />
            </Link>
            <figcaption className="mt-4">
              <div className="text-[15px] font-medium">{p.name}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/products/${p.slug}`} className={chipSolid}>
                  Дэлгэрэнгүй
                </Link>
                {SHOW_PRICES && (
                  <GoLink id="price" className={chipLine}>
                    Үнэ
                  </GoLink>
                )}
                <GoLink id="order" className={chipLine}>
                  Захиалах
                </GoLink>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function Price() {
  return (
    <section id="price" className={`${wrap} pt-[240px]`}>
      <p className={`${eyebrow} mb-6 text-mute`}>Үнэ</p>
      <h2 className={`${h2} mb-[120px]`}>Нэг удаа төлнө.</h2>
      <div className="flex flex-wrap gap-6">
        {PRICE_CARDS.map((c) => (
          <div
            key={c.name}
            className={
              "flex-[1_1_440px] px-6 py-14 sm:px-12 " +
              (c.dark ? "bg-ink text-white" : "border-[1.5px] border-ink")
            }
          >
            <div className={`${eyebrow} ${c.dark ? "text-[#9a9a9a]" : "text-mute"}`}>{c.name}</div>
            <div className="mb-2 mt-6 text-[64px] font-extrabold leading-none tracking-[-.04em]">
              {c.main}{" "}
              <span className={`text-xl font-medium tracking-normal ${c.dark ? "text-[#9a9a9a]" : "text-mute"}`}>
                / 1 ширхэг
              </span>
            </div>
            <div className={`mb-14 text-[15px] ${c.dark ? "text-[#b5b5b5]" : "text-body"}`}>{c.sub}</div>
            {c.rows.map((r, i) => (
              <div
                key={r.label}
                className={
                  "flex justify-between gap-4 border-t py-[18px] text-base " +
                  (c.dark ? "border-[#3a3a3a] " : "border-line ") +
                  (i === c.rows.length - 1 ? (c.dark ? "border-b border-b-[#3a3a3a]" : "border-b border-b-line") : "")
                }
              >
                <span>{r.label}</span>
                <strong>{r.value}</strong>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-16 gap-y-6 border-[1.5px] border-ink px-6 py-12 sm:px-12">
        <div className="flex-[0_0_auto] text-[clamp(44px,5vw,64px)] font-extrabold leading-none tracking-[-.04em]">
          7 хоног
        </div>
        <div className="max-w-[560px] flex-[1_1_300px]">
          <div className="text-xl font-bold tracking-[-.01em]">Ажиллахгүй бол мөнгийг бүтэн буцаана.</div>
          <p className="mb-0 mt-3 text-[15px] leading-[1.7] text-body">
            Хүлээн авснаас хойш 7 хоногийн дотор карт ажиллахгүй бол бидэнд хэлээрэй — төлсөн
            мөнгийг тань бүтэн буцаана.{" "}
            <Link href="/terms" className="font-bold text-ink underline underline-offset-4 hover:opacity-55">
              Нөхцөл
            </Link>
          </p>
        </div>
      </div>

      <p className="mb-0 mt-12 max-w-[640px] text-[15px] leading-[1.7] text-body">
        Custom загвар үнэгүй. Лого, бичвэрээ илгээнэ, батлагдсанаас хойш 3–5 хоногт бэлэн. Хот
        доторх хүргэлт 7,000₮, 3 ба түүнээс дээш ширхэг бол үнэгүй. 30 ширхэгээс дээш бол утсаар
        тохирно.
      </p>
    </section>
  );
}

const orderChoices: {
  href: string;
  eyebrow: string;
  title: string;
  desc: string;
  from: string;
  cta: string;
  dark?: boolean;
}[] = [
  {
    href: "/order",
    eyebrow: "Facebook · Instagram",
    title: "Энгийн карт",
    desc: "Бэлэн загвартай наалт эсвэл стенд. Линкээ оруулаад шууд төлнө.",
    from: "34,900₮-өөс",
    cta: "Захиалах",
  },
  {
    href: "/custom",
    eyebrow: "Таны брэнд",
    title: "Өөрийн логотой",
    desc: "Логогоо илгээнэ үү. 3 загвар гаргаж үзүүлнэ, та сонгоно.",
    from: "44,900₮-өөс",
    cta: "Захиалах",
    dark: true,
  },
];

export function Order() {
  return (
    <section id="order" className={`${wrap} pt-[280px]`}>
      <h2 className="m-0 text-[clamp(64px,11vw,168px)] font-extrabold leading-[.95] tracking-[-.045em]">
        Захиалах.
      </h2>
      <p className="mb-16 mt-14 max-w-[520px] text-xl leading-[1.55] text-[#2a2a2a]">
        Аль картаа сонгоод онлайнаар захиална уу. Бусдыг нь бид хийнэ.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {orderChoices.map((c) => {
          const cls =
            "group flex min-h-[320px] flex-col justify-between px-6 py-10 sm:px-12 sm:py-14 " +
            (c.dark ? "bg-ink text-white hover:bg-[#1f1f1f]" : "border-[1.5px] border-ink hover:bg-[#f5f5f5]");
          const body = (
            <>
              <div>
                <div className={`${eyebrow} ${c.dark ? "text-[#9a9a9a]" : "text-mute"}`}>{c.eyebrow}</div>
                <div className="mt-6 text-[clamp(36px,4.5vw,60px)] font-extrabold leading-[1.02] tracking-[-.04em]">
                  {c.title}
                </div>
                <p className={`mb-0 mt-6 max-w-[400px] text-base leading-[1.6] ${c.dark ? "text-[#b5b5b5]" : "text-body"}`}>
                  {c.desc}
                </p>
              </div>
              <div className="mt-12 flex items-center justify-between gap-4 text-[15px] font-bold">
                <span>{c.from}</span>
                <span className="inline-flex items-center gap-2">
                  {c.cta} <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </div>
            </>
          );
          return (
            <Link key={c.href} href={c.href} className={cls}>
              {body}
            </Link>
          );
        })}
      </div>

      <div id="contact" className="max-md:scroll-mt-24">
        <p className="mb-0 mt-16 text-lg font-bold text-ink">Логогоо илгээнэ үү, 3 загвар гаргаж үзүүлнэ.</p>
        <p className="mb-5 mt-3 text-base text-body">Асуух зүйл байвал чатлаарай:</p>
        <div className="flex flex-wrap gap-3">
          <a
            href={CONTACT.instagram}
            className="inline-flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-ink px-7 text-[15px] font-bold hover:bg-ink hover:text-white"
          >
            Instagram DM
          </a>
          <a
            href={CONTACT.facebook}
            className="inline-flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-ink px-7 text-[15px] font-bold hover:bg-ink hover:text-white"
          >
            Facebook Messenger
          </a>
        </div>
        <p className="mb-0 mt-8 text-base text-body">
          Утас:{" "}
          {CONTACT.phones.map((p, i) => (
            <span key={p.href}>
              {i > 0 && " · "}
              <a href={p.href} className="inline-flex min-h-11 items-center font-bold text-ink hover:opacity-55">
                {p.label}
              </a>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

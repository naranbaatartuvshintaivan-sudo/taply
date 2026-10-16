import Image from "next/image";
import Link from "next/link";
import { DELIVERY, REFUND_DAYS } from "@/lib/config";
import { CUSTOMERS, customerAlt, distribute, type Customer } from "@/lib/customers";
import { CUSTOM_PHONE_ONLY_FROM, fmt, priceTiers } from "@/lib/pricing";
import { ProductGrid } from "./cart/ProductGrid";
import { ContactLine } from "./ContactLine";
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
            id="products"
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

export function Products() {
  return (
    <section id="products" className={`${wrap} pt-[240px]`}>
      {/* Хуучин #order линк (IG bio, пост, QR) энд ирнэ */}
      <span id="order" aria-hidden className="block" />
      <p className={`${eyebrow} mb-6 text-mute`}>Бүтээгдэхүүн</p>
      <h2 className={`${h2} mb-6 max-w-[820px]`}>Сонгоод шууд захиална.</h2>
      <p className="mb-[96px] mt-0 max-w-[520px] text-lg leading-[1.6] text-body">
        Олон авах тусам хямд: 3 ба түүнээс дээш ширхэг бол нэгж үнэ буурч, хүргэлт үнэгүй.
      </p>
      <ProductGrid />
    </section>
  );
}

// Footer-ийн шууд дээрх жижиг үнийн блок. Хуучин #price, #contact линк энд ирнэ.
export function PriceInfo() {
  const cols = [
    { id: "standard" as const, name: "Энгийн", sub: "Facebook · Instagram наалт, стенд" },
    { id: "custom" as const, name: "Өөрийн логотой", sub: "Лого, QR, монгол бичвэр" },
  ];
  return (
    <section id="price" aria-labelledby="price-h" className={`${wrap} pt-[200px]`}>
      <p className={`${eyebrow} mb-4 text-mute`}>Үнэ ба хөнгөлөлт</p>
      <h2 id="price-h" className="m-0 text-[clamp(32px,4vw,48px)] font-bold leading-[1.1] tracking-[-.03em]">
        Нэг удаа төлнө.
      </h2>
      <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
        {cols.map((c) => (
          <table key={c.id} className="w-full border-collapse text-left">
            <caption className="pb-4 text-left">
              <span className="block text-lg font-bold tracking-[-.01em]">{c.name}</span>
              <span className="mt-1 block text-sm text-mute">{c.sub}</span>
            </caption>
            <tbody>
              {priceTiers(c.id).map((r) => (
                <tr key={r.label} className="border-t border-line last:border-b">
                  <th scope="row" className="py-3 text-[15px] font-normal text-body">
                    {r.label}
                  </th>
                  <td className="py-3 text-right text-[15px] font-bold tabular-nums">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      <ul className="m-0 mt-10 grid list-none gap-3 p-0 text-[15px] leading-[1.6] text-body md:grid-cols-3 md:gap-8">
        <li>
          <strong className="text-ink">{DELIVERY.freeFromQty} ба түүнээс дээш ширхэг:</strong> нэгж үнэ буурна, хүргэлт үнэгүй.
        </li>
        <li>
          <strong className="text-ink">Хүргэлт:</strong> хот дотор {fmt(DELIVERY.fee)}₮.
        </li>
        <li>
          <strong className="text-ink">{REFUND_DAYS} хоногийн баталгаа:</strong> ажиллахгүй бол мөнгийг бүтэн буцаана.{" "}
          <Link href="/terms" className="font-bold text-ink underline underline-offset-4 hover:opacity-55">
            Нөхцөл
          </Link>
        </li>
      </ul>
      <p id="contact" className="mb-0 mt-8 text-[15px] leading-[1.6] text-body max-md:scroll-mt-24">
        Асуух зүйл, {CUSTOM_PHONE_ONLY_FROM}+ ширхэг, хотоос гадуур хүргэлт — утсаар эсвэл имэйлээр:{" "}
        <ContactLine />
      </p>
    </section>
  );
}

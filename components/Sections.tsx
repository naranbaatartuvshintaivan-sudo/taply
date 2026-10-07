import { CONTACT, PRICE_CARDS } from "@/lib/config";
import { GoLink } from "./PageTransition";
import { Photo } from "./Photo";

const wrap = "mx-auto max-w-[1360px] px-6 md:px-12";
const eyebrow = "text-[13px] font-medium uppercase tracking-[.22em]";
const h2 = "font-bold leading-[1.05] tracking-[-.035em] text-[clamp(40px,5.5vw,76px)]";

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
      <div className="mt-[120px]">
        <Photo n={1} label="Хүн NFC картаа барьж байгаа (өргөн кадр)" height={640} />
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
      <div className="mt-24">
        <Photo n={2} label="Утсаа картанд хүргэж буй close-up (tap-ийн мөч)" height={420} />
      </div>
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

const products = [
  { src: "/photos/stand-instagram.jpg", name: "Instagram стенд", alt: "Instagram NFC болон QR кодтой ширээний стенд" },
  { src: "/photos/stand-facebook.jpg", name: "Facebook стенд", alt: "Facebook NFC болон QR кодтой ширээний стенд" },
  { src: "/photos/stand-blank.jpg", name: "Хоосон стенд", alt: "Цагаан хоосон ширээний стенд" },
  { src: "/photos/sticker-instagram.jpg", name: "Instagram наалт", alt: "Instagram NFC наалт", zoom: 2.1 },
  { src: "/photos/sticker-facebook.jpg", name: "Facebook наалт", alt: "Facebook NFC наалт", zoom: 2.1 },
  { src: "/photos/stand-blank-tall.jpg", name: "Хоосон стенд (босоо)", alt: "Цагаан хоосон босоо ширээний стенд" },
];

export function Products() {
  return (
    <section id="products" className={`${wrap} pt-[240px]`}>
      <p className={`${eyebrow} mb-6 text-mute`}>Бүтээгдэхүүн</p>
      <h2 className={`${h2} mb-[120px] max-w-[820px]`}>Бидний хийдэг зүйлс.</h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p, i) => (
          <figure key={p.src} className="m-0">
            <Photo n={i + 1} label={p.name} src={p.src} alt={p.alt} aspect="3 / 4" zoom={p.zoom} />
            <figcaption className="mt-4 text-[15px] font-medium">{p.name}</figcaption>
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
      <p className="mb-0 mt-12 max-w-[640px] text-[15px] leading-[1.7] text-body">
        Custom загвар үнэгүй. Лого, бичвэрээ илгээнэ, батлагдсанаас хойш 3–5 хоногт бэлэн. Хот
        доторх хүргэлт 7,000₮, 3 ба түүнээс дээш ширхэг бол үнэгүй. 30 ширхэгээс дээш бол утсаар
        тохирно.
      </p>
    </section>
  );
}

export function Order() {
  return (
    <section id="order" className={`${wrap} pt-[280px]`}>
      <h2 className="m-0 text-[clamp(64px,11vw,168px)] font-extrabold leading-[.95] tracking-[-.045em]">
        Захиалах.
      </h2>
      <p className="mb-16 mt-14 max-w-[520px] text-xl leading-[1.55] text-[#2a2a2a]">
        Манайхтай чатлаад бизнесээ хэлээрэй. Бусдыг нь бид хийнэ.
      </p>
      <div className="flex flex-wrap gap-4">
        <a
          href={CONTACT.instagram}
          className="inline-flex min-h-[60px] items-center justify-center rounded-full bg-ink px-11 text-base font-bold text-white hover:bg-[#2a2a2a]"
        >
          Instagram DM
        </a>
        <a
          href={CONTACT.facebook}
          className="inline-flex min-h-[60px] items-center justify-center rounded-full border-[1.5px] border-ink px-11 text-base font-bold hover:bg-ink hover:text-white"
        >
          Facebook Messenger
        </a>
      </div>
      <p className="mb-0 mt-10 text-base text-body">
        Утас:{" "}
        {CONTACT.phones.map((p, i) => (
          <span key={p.href}>
            {i > 0 && " · "}
            <a href={p.href} className="font-bold text-ink hover:opacity-55">
              {p.label}
            </a>
          </span>
        ))}
      </p>
    </section>
  );
}

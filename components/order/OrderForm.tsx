"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CONTACT, DELIVERY } from "@/lib/config";
import { normalizeFacebook, normalizeInstagram } from "@/lib/links";
import { fmt, MAX_QTY, quote, SKU_PLATFORM, STANDARD_SKUS, type StandardSku } from "@/lib/pricing";
import { btnLine, btnSolid, eyebrow, Field, Select, Stepper, StepNav, SummaryRow, TextArea, TextInput } from "./ui";

const PRODUCTS: { sku: StandardSku; name: string; kind: string; src: string; alt: string }[] = [
  { sku: "fb_sticker", name: "Facebook наалт", kind: "Хэвтээ наалт · 100 × 100 мм", src: "/products/fb-sticker.png", alt: "Facebook NFC наалт" },
  { sku: "ig_sticker", name: "Instagram наалт", kind: "Хэвтээ наалт · 100 × 100 мм", src: "/products/ig-sticker.png", alt: "Instagram NFC наалт" },
  { sku: "fb_stand", name: "Facebook стенд", kind: "Ширээний босоо стенд", src: "/products/fb-stand.png", alt: "Facebook NFC стенд" },
  { sku: "ig_stand", name: "Instagram стенд", kind: "Ширээний босоо стенд", src: "/products/ig-stand.png", alt: "Instagram NFC стенд" },
];

const STEPS = ["Бүтээгдэхүүн", "Линк", "Хүргэлт", "Төлөх"];
const OTHER = "__other";

type ServerQuote = { totalQty: number; subtotal: number; unitPrice: number | null; deliveryFee: number; total: number };
type Errors = Partial<Record<string, string>>;

export function OrderForm({ testKey }: { testKey?: string }) {
  const [step, setStep] = useState(0);
  const [qty, setQty] = useState<Record<StandardSku, number>>({ fb_sticker: 0, ig_sticker: 0, fb_stand: 0, ig_stand: 0 });
  const [f, setF] = useState({ fb: "", ig: "", name: "", phone: "", email: "", district: "", address: "", note: "", website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [serverQuote, setServerQuote] = useState<ServerQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const items = STANDARD_SKUS.map((sku) => ({ sku, qty: qty[sku] }));
  const estimate = quote("standard", items);
  const needs = useMemo(() => new Set(STANDARD_SKUS.filter((s) => qty[s] > 0).map((s) => SKU_PLATFORM[s])), [qty]);
  const payload = () =>
    testMode
      ? { ...f, test: true, testKey }
      : { items, ...f, fb: needs.has("fb") ? f.fb : "", ig: needs.has("ig") ? f.ig : "" };

  const go = (n: number) => {
    setStep(n);
    setFatal(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Алхам бүрийн client шалгалт (сервер дахин бүгдийг шалгана) ──
  function check(s: number): boolean {
    const e: Errors = {};
    if (s === 0 && !estimate.ok) e.items = estimate.reason === "too_many" ? `${MAX_QTY}-аас дээш бол утсаар тохирно` : "Дор хаяж нэг бүтээгдэхүүн сонгоно уу";
    if (s === 1) {
      if (needs.has("fb") && !normalizeFacebook(f.fb)) e.fb = "Facebook хуудасныхаа линкийг оруулна уу (facebook.com/...)";
      if (needs.has("ig") && !normalizeInstagram(f.ig)) e.ig = "Instagram хаягаа оруулна уу (@нэр эсвэл instagram.com/...)";
    }
    if (s === 2) {
      if (f.name.trim().length < 2) e.name = "Нэрээ оруулна уу";
      if (!/^\d{8}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Утасны дугаар 8 оронтой байх ёстой";
      if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Имэйл хаяг буруу байна";
      if (!DELIVERY.districts.includes(f.district)) e.district = "Хүргэлтийн дүүргээ сонгоно уу";
      if (f.address.trim().length < 5) e.address = "Хаягаа дэлгэрэнгүй оруулна уу";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Серверийн алдааг тохирох алхам руу буцаана
  function showServerError(field: string | undefined, message: string) {
    const stepOf: Record<string, number> = { items: 0, fb: 1, ig: 1, name: 2, phone: 2, email: 2, district: 2, address: 2, note: 2 };
    if (field && field in stepOf) {
      setErrors({ [field]: message });
      go(stepOf[field]);
    } else setFatal(message);
  }

  async function toSummary() {
    if (!check(2)) return;
    if (testMode) {
      setServerQuote({ totalQty: 1, subtotal: 100, unitPrice: null, deliveryFee: 0, total: 100 });
      return go(3);
    }
    setBusy(true);
    setFatal(null);
    try {
      const r = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const d = await r.json();
      if (!r.ok || !d.ok) return showServerError(d.field, d.message ?? "Алдаа гарлаа");
      setServerQuote(d);
      go(3);
    } catch {
      setFatal(`Сүлжээний алдаа. Дахин оролдоно уу эсвэл ${CONTACT.phones[0].label} руу залгана уу.`);
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setBusy(true);
    setFatal(null);
    try {
      const r = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const d = await r.json();
      if (!r.ok || !d.ok || typeof d.url !== "string") {
        setBusy(false);
        return showServerError(d.field, d.message ?? "Алдаа гарлаа");
      }
      window.location.href = d.url; // pay.wire.mn — busy хэвээр үлдээнэ (давхар дархаас сэргийлнэ)
    } catch {
      setBusy(false);
      setFatal(`Сүлжээний алдаа. Дахин оролдоно уу эсвэл ${CONTACT.phones[0].label} руу залгана уу.`);
    }
  }

  const otherDistrict = f.district === OTHER;

  return (
    <div>
      {testKey && (
        <div className="mb-12 flex flex-wrap items-center justify-between gap-4 border-[1.5px] border-dashed border-ink px-6 py-5">
          <span className="text-base font-bold">🧪 Тест горим {testMode ? "· 100₮ тест төлбөр" : ""}</span>
          <button
            type="button"
            className={btnLine}
            onClick={() => {
              setTestMode((m) => !m);
              go(testMode ? 0 : 2);
            }}
          >
            {testMode ? "Тест горимоос гарах" : "100₮ тест захиалга"}
          </button>
        </div>
      )}
      <StepNav steps={STEPS} current={step} />

      <div className="mt-16">
        {/* ── 01 Бүтээгдэхүүн ── */}
        {step === 0 && (
          <section aria-labelledby="s0">
            <h2 id="s0" className="sr-only">Бүтээгдэхүүн</h2>
            <div>
              {PRODUCTS.map((p) => (
                <div key={p.sku} className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-line py-6 last:border-b">
                  <div className="relative h-20 w-20 flex-none overflow-hidden rounded-[6px] bg-ph">
                    <Image src={p.src} alt={p.alt} fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <div className="text-lg font-bold tracking-[-.01em]">{p.name}</div>
                    <div className="mt-1 text-sm text-mute">{p.kind}</div>
                  </div>
                  <Stepper label={p.name} value={qty[p.sku]} max={MAX_QTY} onChange={(v) => { setQty((q) => ({ ...q, [p.sku]: v })); setErrors({}); }} />
                </div>
              ))}
            </div>
            {errors.items && <p role="alert" className="mt-4 text-sm font-medium text-[#c62828]">{errors.items}</p>}

            <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className={`${eyebrow} text-mute`}>Урьдчилсан дүн</div>
                <div className="mt-2 text-[40px] font-extrabold leading-none tracking-[-.03em]">
                  {estimate.ok ? `${fmt(estimate.total)}₮` : "—"}
                </div>
                {estimate.ok && <div className="mt-2 text-sm text-body">{estimate.breakdown}</div>}
              </div>
              <button type="button" className={btnSolid} onClick={() => check(0) && go(1)}>
                Үргэлжлүүлэх
              </button>
            </div>
            <p className="mt-8 max-w-[560px] text-sm leading-[1.7] text-mute">
              Үнэ формат хамааралгүй, нийт ширхгээр шатлана: 1 ш 34,900₮ · 2 ш 55,900₮ · 3–9 ш 27,900₮/ш · 10+ ш 24,900₮/ш.
              3 ба түүнээс дээш бол хүргэлт үнэгүй.
            </p>
          </section>
        )}

        {/* ── 02 Линк ── */}
        {step === 1 && (
          <section className="max-w-[640px]" aria-labelledby="s1">
            <h2 id="s1" className="m-0 text-2xl font-bold tracking-[-.02em]">Карт аль хуудас руу нээгдэх вэ?</h2>
            <p className="mb-12 mt-3 text-base text-body">Бид энэ линкийг таны карт руу бичнэ.</p>
            <div className="flex flex-col gap-10">
              {needs.has("fb") && (
                <Field label="Facebook хуудас" hint="Жишээ: facebook.com/taniinhuudas" error={errors.fb}>
                  <TextInput value={f.fb} onChange={set("fb")} invalid={!!errors.fb} placeholder="facebook.com/..." inputMode="url" autoComplete="url" />
                </Field>
              )}
              {needs.has("ig") && (
                <Field label="Instagram" hint="Жишээ: @taniinner эсвэл instagram.com/taniinner" error={errors.ig}>
                  <TextInput value={f.ig} onChange={set("ig")} invalid={!!errors.ig} placeholder="@..." autoCapitalize="none" autoCorrect="off" />
                </Field>
              )}
            </div>
            <div className="mt-14 flex flex-wrap gap-4">
              <button type="button" className={btnLine} onClick={() => go(0)}>Буцах</button>
              <button type="button" className={btnSolid} onClick={() => check(1) && go(2)}>Үргэлжлүүлэх</button>
            </div>
          </section>
        )}

        {/* ── 03 Хүргэлт ── */}
        {step === 2 && (
          <section className="max-w-[640px]" aria-labelledby="s2">
            <h2 id="s2" className="m-0 text-2xl font-bold tracking-[-.02em]">Хэнд, хаана хүргэх вэ?</h2>
            <div className="mt-12 flex flex-col gap-10">
              <Field label="Нэр" error={errors.name}>
                <TextInput value={f.name} onChange={set("name")} invalid={!!errors.name} autoComplete="name" />
              </Field>
              <Field label="Утас" error={errors.phone}>
                <TextInput value={f.phone} onChange={set("phone")} invalid={!!errors.phone} inputMode="tel" autoComplete="tel-national" placeholder="9911 2233" />
              </Field>
              <Field label="Имэйл (заавал биш)" hint="Төлбөрийн баримтыг имэйлээр илгээнэ" error={errors.email}>
                <TextInput value={f.email} onChange={set("email")} invalid={!!errors.email} type="email" inputMode="email" autoComplete="email" />
              </Field>
              <Field label="Дүүрэг" error={errors.district}>
                <Select value={f.district} onChange={set("district")} invalid={!!errors.district}>
                  <option value="" disabled>Сонгоно уу</option>
                  {DELIVERY.districts.map((d) => <option key={d} value={d}>{d}</option>)}
                  <option value={OTHER}>Бусад газар</option>
                </Select>
              </Field>
              {otherDistrict ? (
                <div className="border-[1.5px] border-ink p-6 text-base leading-[1.7]">
                  Бусад газар хүргэх эсэхийг утсаар тохирно:{" "}
                  {CONTACT.phones.map((p, i) => (
                    <span key={p.href}>{i > 0 && " · "}<a href={p.href} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">{p.label}</a></span>
                  ))}
                </div>
              ) : (
                <>
                  <Field label="Хаяг" hint="Хороо, байр, орц, тоот" error={errors.address}>
                    <TextArea value={f.address} onChange={set("address")} invalid={!!errors.address} autoComplete="street-address" rows={2} />
                  </Field>
                  <Field label="Тэмдэглэл (заавал биш)" error={errors.note}>
                    <TextArea value={f.note} onChange={set("note")} rows={2} />
                  </Field>
                </>
              )}
              {/* Honeypot — хүнд харагдахгүй */}
              <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>Вэбсайт<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></label>
              </div>
            </div>
            {fatal && <p role="alert" className="mt-8 text-base font-medium text-[#c62828]">{fatal}</p>}
            <div className="mt-14 flex flex-wrap gap-4">
              <button type="button" className={btnLine} onClick={() => go(testMode ? 2 : 1)} disabled={testMode}>Буцах</button>
              <button type="button" className={btnSolid} onClick={toSummary} disabled={busy || otherDistrict}>
                {busy ? "Түр хүлээнэ үү…" : "Үргэлжлүүлэх"}
              </button>
            </div>
          </section>
        )}

        {/* ── 04 Төлөх ── */}
        {step === 3 && serverQuote && (
          <section className="max-w-[640px]" aria-labelledby="s3">
            <h2 id="s3" className="m-0 text-2xl font-bold tracking-[-.02em]">Захиалгаа шалгана уу</h2>
            <div className="mt-10 border-b border-line">
              {testMode && <SummaryRow k="🧪 Тест бүтээгдэхүүн" v="1 ш" />}
              {!testMode && PRODUCTS.filter((p) => qty[p.sku] > 0).map((p) => (
                <SummaryRow key={p.sku} k={p.name} v={`${qty[p.sku]} ш`} />
              ))}
              <SummaryRow
                k="Үнэ"
                v={serverQuote.unitPrice ? `${serverQuote.totalQty} × ${fmt(serverQuote.unitPrice)}₮` : `${fmt(serverQuote.subtotal)}₮`}
              />
              <SummaryRow k="Хүргэлт" v={serverQuote.deliveryFee === 0 ? "Үнэгүй" : `${fmt(serverQuote.deliveryFee)}₮`} />
              <SummaryRow k="Хүргэх" v={<span className="font-medium">{f.name} · {f.phone}<br />{f.district}, {f.address}</span>} />
              <SummaryRow k="Нийт" v={`${fmt(serverQuote.total)}₮`} strong />
            </div>
            <p className="mt-6 text-sm leading-[1.7] text-mute">
              Wire-ийн төлбөрийн хуудас руу шилжинэ. Банкны апп эсвэл QR-аар төлнө. 7 хоногийн дотор
              ажиллахгүй бол мөнгийг бүтэн буцаана.
            </p>
            {fatal && <p role="alert" className="mt-6 text-base font-medium text-[#c62828]">{fatal}</p>}
            <div className="mt-12 flex flex-wrap gap-4">
              <button type="button" className={btnLine} onClick={() => go(2)} disabled={busy}>Буцах</button>
              <button type="button" className={btnSolid} onClick={pay} disabled={busy}>
                {busy ? "Түр хүлээнэ үү…" : `Төлөх · ${fmt(serverQuote.total)}₮`}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

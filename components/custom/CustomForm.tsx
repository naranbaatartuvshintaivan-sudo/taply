"use client";

import { useEffect, useState } from "react";
import { CONTACT, DELIVERY } from "@/lib/config";
import { normalizeFacebook, normalizeInstagram } from "@/lib/links";
import { MAX_QTY } from "@/lib/pricing";
import { btnLine, btnSolid, eyebrow, Field, Select, Stepper, TextArea, TextInput } from "../order/ui";

// Сервер (lib/image-check.ts) бүгдийг дахин шалгана — энд зөвхөн хэрэглэгчид эрт мэдэгдэх.
const LOGO_MAX_BYTES = 4 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const OTHER = "__other";

type Errors = Partial<Record<string, string>>;

export function CustomForm() {
  const [f, setF] = useState({
    business: "", name: "", phone: "", email: "", fb: "", ig: "", district: "", address: "", note: "", website: "",
  });
  const [qty, setQty] = useState(1);
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [noLogo, setNoLogo] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!logo) return setPreview(null);
    const url = URL.createObjectURL(logo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  function pickLogo(file: File | undefined) {
    setErrors((p) => ({ ...p, logo: undefined }));
    if (!file) return setLogo(null);
    if (file.type === "image/svg+xml") return setErrors((p) => ({ ...p, logo: "SVG файл хүлээж авахгүй. PNG, JPG эсвэл WEBP илгээнэ үү" }));
    if (!LOGO_TYPES.includes(file.type)) return setErrors((p) => ({ ...p, logo: "Логоны файл PNG, JPG эсвэл WEBP байх ёстой" }));
    if (file.size > LOGO_MAX_BYTES) return setErrors((p) => ({ ...p, logo: "Логоны файл 4 MB-аас ихгүй байх ёстой" }));
    setLogo(file);
  }

  function check(): Errors {
    const e: Errors = {};
    if (!f.business.trim()) e.business = "Бизнесийнхээ нэрийг оруулна уу";
    if (!noLogo && !logo) e.logo = "Логогоо оруулна уу, эсвэл “Лого байхгүй”-г сонгоно уу";
    const fbOk = f.fb.trim() ? !!normalizeFacebook(f.fb) : null;
    const igOk = f.ig.trim() ? !!normalizeInstagram(f.ig) : null;
    if (fbOk === false) e.fb = "Facebook хуудасныхаа линкийг оруулна уу (facebook.com/...)";
    if (igOk === false) e.ig = "Instagram хаягаа оруулна уу (@нэр эсвэл instagram.com/...)";
    if (fbOk === null && igOk === null) e.fb = "Facebook эсвэл Instagram-аас дор хаяж нэгийг оруулна уу";
    if (f.name.trim().length < 2) e.name = "Нэрээ оруулна уу";
    if (!/^\d{8}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Утасны дугаар 8 оронтой байх ёстой";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Имэйл хаягаа зөв оруулна уу — загварууд имэйлээр очно";
    if (!DELIVERY.districts.includes(f.district)) e.district = "Хүргэлтийн дүүргээ сонгоно уу";
    if (f.address.trim().length < 5) e.address = "Хаягаа дэлгэрэнгүй оруулна уу";
    return e;
  }

  function focusFirst(e: Errors) {
    const first = Object.keys(e)[0];
    if (first) document.getElementById(`cf-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setFatal(null);
    const e = check();
    setErrors(e);
    if (Object.keys(e).length) return focusFirst(e);

    const body = new FormData();
    for (const [k, v] of Object.entries(f)) body.set(k, v);
    body.set("qty", String(qty));
    if (noLogo) body.set("noLogo", "true");
    else if (logo) body.set("logo", logo);

    setBusy(true);
    try {
      const res = await fetch("/api/custom", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; field?: string; message?: string } | null;
      if (res.ok && json?.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (json?.field) {
        const fe = { [json.field]: json.message ?? "Буруу байна" };
        setErrors(fe);
        focusFirst(fe);
      } else {
        setFatal(json?.message ?? `Алдаа гарлаа, ${CONTACT.phones[0].label} руу залгана уу.`);
      }
    } catch {
      setFatal(`Сүлжээний алдаа. Дахин оролдоно уу, эсвэл ${CONTACT.phones[0].label} руу залгана уу.`);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-[640px]" role="status">
        <p className="m-0 text-[clamp(32px,4.5vw,56px)] font-extrabold leading-[1.05] tracking-[-.035em]">
          Хүсэлт хүлээн авлаа.
        </p>
        <p className="mb-0 mt-8 text-xl leading-[1.55] text-[#2a2a2a]">Загварууд имэйлээр очно.</p>
      </div>
    );
  }

  const otherDistrict = f.district === OTHER;
  const h2 = "m-0 text-2xl font-bold tracking-[-.02em]";
  const section = "max-w-[640px] border-t-[1.5px] border-ink pt-10";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-24">
      {/* ── Брэнд ── */}
      <section className={section} aria-labelledby="c1">
        <h2 id="c1" className={h2}>Таны брэнд</h2>
        <div className="mt-12 flex flex-col gap-10">
          <div id="cf-business">
            <Field label="Бизнесийн нэр" hint="Стенд дээр яг ингэж бичигдэнэ" error={errors.business}>
              <TextInput value={f.business} onChange={set("business")} invalid={!!errors.business} autoComplete="organization" maxLength={80} />
            </Field>
          </div>

          <div id="cf-logo">
            <span className={`${eyebrow} block text-mute`}>Лого</span>
            {!noLogo && (
              <div className="mt-4 flex flex-wrap items-center gap-6">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element -- хэрэглэгчийн локал файлын урьдчилсан харагдац (blob URL)
                  <img src={preview} alt="Сонгосон лого" className="h-24 w-24 rounded-[6px] border border-line bg-[#f5f5f5] object-contain p-2" />
                )}
                <label className={`${btnLine} cursor-pointer`}>
                  {logo ? "Өөр файл сонгох" : "Файл сонгох"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => pickLogo(e.target.files?.[0])}
                  />
                </label>
                {logo && <span className="text-sm text-body break-all">{logo.name}</span>}
              </div>
            )}
            {errors.logo ? (
              <span role="alert" className="mt-3 block text-sm font-medium text-[#c62828]">{errors.logo}</span>
            ) : (
              !noLogo && <span className="mt-3 block text-sm text-mute">PNG, JPG эсвэл WEBP · 4 MB хүртэл · тунгалаг дэвсгэртэй PNG хамгийн тохиромжтой</span>
            )}
            <label className="mt-6 flex min-h-11 cursor-pointer items-center gap-3 text-base">
              <input
                type="checkbox"
                checked={noLogo}
                onChange={(e) => { setNoLogo(e.target.checked); setErrors((p) => ({ ...p, logo: undefined })); }}
                className="h-5 w-5 accent-ink"
              />
              Лого байхгүй — бид тантай холбогдож хамт гаргана
            </label>
          </div>
        </div>
      </section>

      {/* ── Линк ── */}
      <section className={section} aria-labelledby="c2">
        <h2 id="c2" className={h2}>Карт аль хуудас руу нээгдэх вэ?</h2>
        <p className="mb-0 mt-4 text-base text-body">Дор хаяж нэгийг оруулна уу. Стенд дээр зөвхөн оруулсан платформын тэмдэг гарна.</p>
        <div className="mt-12 flex flex-col gap-10">
          <div id="cf-fb">
            <Field label="Facebook хуудас" error={errors.fb}>
              <TextInput value={f.fb} onChange={set("fb")} invalid={!!errors.fb} inputMode="url" placeholder="facebook.com/таны-хуудас" />
            </Field>
          </div>
          <div id="cf-ig">
            <Field label="Instagram" error={errors.ig}>
              <TextInput value={f.ig} onChange={set("ig")} invalid={!!errors.ig} placeholder="@таны_нэр" autoCapitalize="none" />
            </Field>
          </div>
        </div>
      </section>

      {/* ── Тоо ── */}
      <section className={section} aria-labelledby="c3">
        <h2 id="c3" className={h2}>Хэдэн ширхэг вэ?</h2>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Stepper label="Тоо ширхэг" value={qty} max={MAX_QTY} onChange={(v) => setQty(Math.max(1, v))} />
          <span className="text-sm text-mute">1 ш 44,900₮ · 2 ш 69,900₮ · 3–9 ш 32,900₮/ш · 10+ ш 29,900₮/ш</span>
        </div>
        {qty >= 30 && <p className="mb-0 mt-6 text-base text-body">30-аас дээш ширхгийн үнийг утсаар тохирно. Хүсэлтээ илгээгээрэй.</p>}
      </section>

      {/* ── Холбоо барих, хүргэлт ── */}
      <section className={section} aria-labelledby="c4">
        <h2 id="c4" className={h2}>Холбоо барих, хүргэлт</h2>
        <div className="mt-12 flex flex-col gap-10">
          <div id="cf-name">
            <Field label="Таны нэр" error={errors.name}>
              <TextInput value={f.name} onChange={set("name")} invalid={!!errors.name} autoComplete="name" />
            </Field>
          </div>
          <div id="cf-phone">
            <Field label="Утас" error={errors.phone}>
              <TextInput value={f.phone} onChange={set("phone")} invalid={!!errors.phone} inputMode="tel" autoComplete="tel-national" placeholder="9911 2233" />
            </Field>
          </div>
          <div id="cf-email">
            <Field label="Имэйл" hint="3 загварыг энэ имэйл рүү илгээнэ" error={errors.email}>
              <TextInput value={f.email} onChange={set("email")} invalid={!!errors.email} type="email" inputMode="email" autoComplete="email" />
            </Field>
          </div>
          <div id="cf-district">
            <Field label="Дүүрэг" error={errors.district}>
              <Select value={f.district} onChange={set("district")} invalid={!!errors.district}>
                <option value="" disabled>Сонгоно уу</option>
                {DELIVERY.districts.map((d) => <option key={d} value={d}>{d}</option>)}
                <option value={OTHER}>Бусад газар</option>
              </Select>
            </Field>
          </div>
          {otherDistrict ? (
            <div className="border-[1.5px] border-ink p-6 text-base leading-[1.7]">
              Бусад газар хүргэх эсэхийг утсаар тохирно:{" "}
              {CONTACT.phones.map((p, i) => (
                <span key={p.href}>{i > 0 && " · "}<a href={p.href} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">{p.label}</a></span>
              ))}
            </div>
          ) : (
            <>
              <div id="cf-address">
                <Field label="Хаяг" hint="Хороо, байр, орц, тоот" error={errors.address}>
                  <TextArea value={f.address} onChange={set("address")} invalid={!!errors.address} autoComplete="street-address" rows={2} />
                </Field>
              </div>
              <div id="cf-note">
                <Field label="Тэмдэглэл (заавал биш)" hint="Өнгө, бичвэр, хүсэлт гэх мэт" error={errors.note}>
                  <TextArea value={f.note} onChange={set("note")} rows={3} maxLength={500} />
                </Field>
              </div>
            </>
          )}
          {/* Honeypot — хүнд харагдахгүй */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>Вэбсайт<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></label>
          </div>
        </div>
      </section>

      <div className="max-w-[640px]">
        {fatal && <p role="alert" className="mb-8 mt-0 text-base font-medium text-[#c62828]">{fatal}</p>}
        <button type="submit" className={btnSolid} disabled={busy || otherDistrict}>
          {busy ? "Илгээж байна…" : "Хүсэлт илгээх"}
        </button>
        <p className="mb-0 mt-6 text-sm leading-[1.7] text-mute">
          Илгээсний дараа 3 загвар гаргаж имэйлээр явуулна. Та сонгоод онлайнаар төлнө.
        </p>
      </div>
    </form>
  );
}

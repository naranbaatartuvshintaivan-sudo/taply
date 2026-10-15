import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_COOKIE, isAdminCookie } from "@/lib/admin";
import { ADMIN_MESSAGES, type AdminMessage } from "@/lib/admin-action";
import { customDb, type CustomStatus } from "@/lib/custom-db";
import { mockupPath, PLATFORM_LABEL, requestPlatforms } from "@/lib/custom-mockups";
import { isUuid } from "@/lib/db";
import { displayLink } from "@/lib/links";
import { DESIGN_KEYS, designSet } from "@/lib/mockups/designs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Custom — TAPLY админ", robots: { index: false, follow: false } };

const eyebrow = "text-[13px] font-medium uppercase tracking-[.22em] text-mute";
const btn =
  "inline-flex min-h-14 w-full items-center justify-center rounded-full px-8 text-[16px] font-bold sm:w-auto";

const STATUS: Record<CustomStatus, string> = {
  generating: "Загвар үүсгэж байна…",
  awaiting_approval: "Шалгаад имэйл илгээнэ үү",
  sent: "Имэйл илгээсэн — сонголт хүлээж байна",
  chosen: "Харилцагч сонгосон",
  failed: "Загвар үүсгэж чадсангүй",
  manual: "Логогүй — гараар хийнэ",
};

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar", dateStyle: "short", timeStyle: "short" }) : "—";

export default async function AdminCustomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp, jar] = await Promise.all([params, searchParams, cookies()]);
  // Зөвхөн cookie (/admin/login-оор нэвтэрсэн) — түлхүүр URL-д хэзээ ч орохгүй
  if (!isUuid(id) || !isAdminCookie(jar.get(ADMIN_COOKIE)?.value)) notFound();

  const req = await customDb.getCustomRequest(id);
  if (!req) notFound();
  const [biz, logoUrl] = await Promise.all([
    customDb.getBusiness(req.business_id),
    req.logo_path ? customDb.logoSignedUrl(req.logo_path) : Promise.resolve(null),
  ]);

  const m = typeof sp.m === "string" && sp.m in ADMIN_MESSAGES ? ADMIN_MESSAGES[sp.m as AdminMessage] : null;
  const labels = req.design_set > 0 ? designSet(req.design_set) : null;
  const dir = req.mockup_dir;
  const showDesigns = dir && labels && req.status !== "generating";
  const canSend = req.status === "awaiting_approval" && !!dir;
  const canRegen = !!req.logo_path && req.status !== "chosen" && req.status !== "generating";
  // FB+IG хоёулаа бол таб: ?p=fb | ?p=ig
  const platforms = requestPlatforms(req);
  const platform = platforms.find((p) => p === sp.p) ?? platforms[0];

  return (
    <main className="min-h-screen bg-white px-4 pb-24 pt-8 text-ink sm:px-8">
      {req.status === "generating" && <meta httpEquiv="refresh" content="4" />}
      <div className="mx-auto max-w-[1200px]">
        <p className={eyebrow}>TAPLY · Custom хүсэлт</p>
        <h1 className="mb-0 mt-3 text-[clamp(32px,7vw,64px)] font-extrabold leading-[1] tracking-[-.035em]">{req.business_name}</h1>
        <p className="mb-0 mt-4 text-lg font-semibold">
          {STATUS[req.status]}
          {req.design_set > 0 && <span className="font-normal text-mute"> · багц {req.design_set}</span>}
        </p>
        {m && <p role="status" className="mb-0 mt-4 rounded-xl bg-[#f2f2f2] px-4 py-3 text-[15px] font-semibold">{m}</p>}

        {(canSend || canRegen) && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {canSend && (
              <form method="post" action={`/api/admin/custom/${req.id}/send`}>
                <button className={`${btn} bg-ink text-white`}>Имэйл илгээх</button>
              </form>
            )}
            {canRegen && (
              <form method="post" action={`/api/admin/custom/${req.id}/regenerate`}>
                <button className={`${btn} border-[1.5px] border-ink`}>Дахин үүсгэх</button>
              </form>
            )}
          </div>
        )}
        {req.status === "sent" && (
          <p className="mb-0 mt-3 text-sm text-mute">“Дахин үүсгэх” дарвал шинэ загварыг дахин имэйлээр илгээх хэрэгтэй болно.</p>
        )}

        {showDesigns && platforms.length > 1 && (
          <nav className="mt-10 flex gap-2" aria-label="Платформ">
            {platforms.map((p) => (
              <a
                key={p}
                href={`?p=${p}`}
                aria-current={p === platform ? "page" : undefined}
                className={`inline-flex min-h-12 items-center rounded-full px-6 text-[15px] font-bold ${p === platform ? "bg-ink text-white" : "border-[1.5px] border-ink"}`}
              >
                {PLATFORM_LABEL[p]}
              </a>
            ))}
          </nav>
        )}

        {showDesigns && (
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            {DESIGN_KEYS.map((k) => (
              <figure key={k} className="m-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={customDb.mockupUrl(mockupPath(dir, k, platform, "preview"))} alt={`Загвар ${k} · ${PLATFORM_LABEL[platform]}`} className="block aspect-square w-full rounded-md bg-[#e2e2e2]" />
                <figcaption className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-bold">
                    {k} · {labels[k].label}
                  </span>
                  <a href={customDb.mockupUrl(mockupPath(dir, k, platform, "face"))} target="_blank" rel="noreferrer" className="min-h-11 py-2 text-sm font-semibold underline">
                    Хэвлэх нүүр
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <dl className="mt-12 grid grid-cols-1 gap-x-10 border-t border-[#e5e5e5] sm:grid-cols-[180px_1fr]">
          <Row k="Холбоо барих" v={req.contact_name} />
          <Row k="Утас" v={biz ? <a href={`tel:+976${biz.phone}`} className="underline">{biz.phone}</a> : "—"} />
          <Row k="Имэйл" v={req.email} />
          <Row k="Тоо" v={`${req.quantity} ширхэг`} />
          {req.fb_url && <Row k="Facebook" v={<a href={req.fb_url} target="_blank" rel="noreferrer" className="break-all underline">{displayLink(req.fb_url)}</a>} />}
          {req.ig_url && <Row k="Instagram" v={<a href={req.ig_url} target="_blank" rel="noreferrer" className="break-all underline">{displayLink(req.ig_url)}</a>} />}
          {biz && <Row k="Хаяг" v={`${biz.district}, ${biz.address}`} />}
          {req.note && <Row k="Тэмдэглэл" v={req.note} />}
          <Row k="Ирсэн" v={fmtTime(req.created_at)} />
          <Row k="Загвар" v={fmtTime(req.generated_at)} />
          <Row k="Имэйл илгээсэн" v={fmtTime(req.sent_at)} />
        </dl>

        {logoUrl && (
          <div className="mt-10">
            <p className={eyebrow}>Эх лого</p>
            <a href={logoUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Эх лого" className="mt-3 block max-h-[240px] max-w-full rounded-md border border-[#e5e5e5] bg-[repeating-conic-gradient(#f2f2f2_0_25%,#fff_0_50%)] bg-[length:20px_20px] p-4" />
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="pt-4 text-[13px] font-medium uppercase tracking-[.16em] text-mute sm:border-b sm:border-[#e5e5e5] sm:pb-4">{k}</dt>
      <dd className="m-0 border-b border-[#e5e5e5] pb-4 pt-1 text-[16px] font-semibold sm:pt-4">{v}</dd>
    </>
  );
}

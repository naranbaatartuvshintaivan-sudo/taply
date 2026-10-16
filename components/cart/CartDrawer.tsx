"use client";

import Image from "next/image";
import { useState } from "react";
import { cartQuote, lineCap, platformsOf, toItems, totalQty, upsellHint } from "@/lib/cart";
import {
  checkContact,
  checkLinks,
  EMPTY_FIELDS,
  orderPayload,
  submitCheckout,
  TOO_MANY_MESSAGE,
  type Errors,
  type OrderFields,
} from "@/lib/checkout";
import { REFUND_DAYS } from "@/lib/config";
import { fmt, FROM_PRICE } from "@/lib/pricing";
import { shopItem } from "@/lib/shop";
import { ContactLine } from "../ContactLine";
import { DeliveryFields, LinkFields, OTHER_DISTRICT } from "../order/OrderFields";
import { btnLine, btnSolid, Stepper } from "../order/ui";
import { useCart, type CartStep } from "./context";
import { CloseButton, Sheet } from "./Sheet";

const STEPS: { id: CartStep; label: string }[] = [
  { id: "cart", label: "Сагс" },
  { id: "details", label: "Мэдээлэл" },
];

type Fatal = { message: string; contact: boolean } | null;

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 py-2 ${strong ? "text-lg font-extrabold" : "text-[15px]"}`}>
      <span className={strong ? "" : "text-body"}>{k}</span>
      <span className={`text-right tabular-nums ${strong ? "" : "font-bold"}`}>{v}</span>
    </div>
  );
}

function Alert({ fatal }: { fatal: NonNullable<Fatal> }) {
  return (
    <div role="alert" className="text-[15px] font-medium leading-[1.6] text-[#c62828]">
      {fatal.message} {fatal.contact && <ContactLine linkClassName="font-bold text-[#c62828]" />}
    </div>
  );
}

export function CartDrawer() {
  const { state, dispatch, open, step, closeCart, setStep, clearAll } = useCart();
  const [f, setF] = useState<OrderFields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [fatal, setFatal] = useState<Fatal>(null);
  // Сервер өөр дүн буцаавал (жишээ нь үнэ шинэчлэгдсэн) — хэрэглэгч шинэ дүнг хараад дахин дарна
  const [confirmed, setConfirmed] = useState<{ key: string; total: number } | null>(null);

  const q = cartQuote(state);
  const n = totalQty(state);
  const needs = platformsOf(state);
  const hint = upsellHint(state);
  const cartKey = JSON.stringify(state.lines);
  const shownTotal = confirmed?.key === cartKey ? confirmed.total : q.ok ? q.total : 0;

  const set = (k: keyof OrderFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const goStep = (s: CartStep) => {
    setFatal(null);
    setStep(s);
  };

  function focusFirstError() {
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus());
  }

  async function pay() {
    if (!q.ok || busy) return;
    const e = { ...checkLinks(f, needs), ...checkContact(f) };
    setErrors(e);
    if (Object.keys(e).length > 0) return focusFirstError();

    setBusy(true);
    setFatal(null);
    const res = await submitCheckout(orderPayload(toItems(state), f, needs), shownTotal);
    if (res.ok) {
      clearAll();
      window.location.href = res.url; // pay.wire.mn — busy хэвээр (давхар дархаас сэргийлнэ)
      return;
    }
    setBusy(false);
    if (res.kind === "price_changed") {
      setConfirmed({ key: cartKey, total: res.total });
      setFatal({ message: `Үнэ шинэчлэгдлээ: нийт ${fmt(res.total)}₮. Дахин дарж баталгаажуулна уу.`, contact: false });
      return;
    }
    if (res.field && res.field in EMPTY_FIELDS && res.field !== "website" && !res.contact) {
      setErrors({ [res.field]: res.message });
      return focusFirstError();
    }
    setFatal({ message: res.message, contact: res.contact });
  }

  const title = step === "cart" ? "Сагс" : "Захиалгын мэдээлэл";

  return (
    <Sheet open={open} onClose={closeCart} label={title} variant="drawer">
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-3">
        <ol className="m-0 flex list-none gap-6 p-0" aria-label="Алхам">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              aria-current={s.id === step ? "step" : undefined}
              className={`text-sm font-medium ${s.id === step ? "text-ink" : "text-mute"}`}
            >
              <span className="mr-2 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              {s.label}
            </li>
          ))}
        </ol>
        <CloseButton onClick={closeCart} label="Сагсыг хаах" />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-8 pt-6">
        <h2 className="m-0 text-[28px] font-extrabold tracking-[-.03em]">{title}</h2>

        {step === "cart" &&
          (n === 0 ? (
            <div className="mt-8">
              <p className="m-0 text-base text-body">Сагс хоосон байна.</p>
              <button
                type="button"
                className={`${btnLine} mt-6`}
                onClick={() => {
                  closeCart();
                  setTimeout(() => document.getElementById("products")?.scrollIntoView({ block: "start" }), 50);
                }}
              >
                Бүтээгдэхүүн сонгох
              </button>
            </div>
          ) : (
            <>
              <ul className="m-0 mt-6 list-none p-0">
                {state.lines.map((l) => {
                  const p = shopItem(l.sku);
                  return (
                    <li key={l.sku} className="flex gap-4 border-t border-line py-5 last:border-b">
                      <div className="relative h-16 w-16 flex-none overflow-hidden rounded-[6px] bg-ph">
                        <Image src={p.src} alt="" fill sizes="64px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-base font-bold tracking-[-.01em]">{p.name}</div>
                            <div className="mt-0.5 text-[13px] text-mute">{p.kind}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => dispatch({ type: "remove", sku: l.sku })}
                            aria-label={`${p.name} сагснаас хасах`}
                            className="-mr-2 -mt-2 inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-mute underline underline-offset-4 hover:text-ink"
                          >
                            Хасах
                          </button>
                        </div>
                        <div className="mt-3">
                          <Stepper
                            label={p.name}
                            value={l.qty}
                            min={1}
                            max={lineCap(null)}
                            onChange={(v) => dispatch({ type: "set", sku: l.sku, qty: v })}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {hint && (
                <p className="mb-0 mt-6 rounded-[8px] bg-ph px-4 py-3 text-[14px] leading-[1.6]">
                  Дахиад <strong>{hint.add} ширхэг</strong> нэмбэл нийт <strong>{fmt(hint.total)}₮</strong> (
                  {hint.freeDelivery ? "хүргэлт үнэгүй, " : ""}нэгж үнэ {fmt(hint.unitPrice)}₮)
                </p>
              )}

              {!q.ok && q.reason === "too_many" && (
                <div role="alert" className="mt-6 text-[15px] font-medium leading-[1.6] text-[#c62828]">
                  {TOO_MANY_MESSAGE}: <ContactLine linkClassName="font-bold text-[#c62828]" />
                </div>
              )}
            </>
          ))}

        {step === "details" && (
          <form
            className="mt-8 flex flex-col gap-8"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              pay();
            }}
          >
            <LinkFields f={f} set={set} errors={errors} needs={needs} />
            <DeliveryFields f={f} set={set} errors={errors} />
            <button type="submit" hidden aria-hidden tabIndex={-1} />
          </form>
        )}

        <p className="mb-0 mt-10 text-[13px] leading-[1.6] text-mute">
          Асуух зүйл байвал: <ContactLine linkClassName="font-bold text-ink" />
        </p>
      </div>

      {n > 0 && (
        <div className="border-t border-line px-6 pb-5 pt-4">
          {q.ok && step === "details" && (
            <div className="mb-3">
              <Row k={`Нийт · ${q.totalQty} ш, ${q.deliveryFee === 0 ? "хүргэлт үнэгүй" : `хүргэлт ${fmt(q.deliveryFee)}₮`}`} v={`${fmt(shownTotal)}₮`} strong />
            </div>
          )}
          {q.ok && step === "cart" && (
            <div className="mb-3">
              <Row k={q.unitPrice ? `${q.totalQty} × ${fmt(q.unitPrice)}₮` : `${q.totalQty} ширхэг`} v={`${fmt(q.subtotal)}₮`} />
              {FROM_PRICE.standard * q.totalQty > q.subtotal && (
                <Row k="Хөнгөлөлт" v={`−${fmt(FROM_PRICE.standard * q.totalQty - q.subtotal)}₮`} />
              )}
              <Row k="Хүргэлт" v={q.deliveryFee === 0 ? "Үнэгүй" : `${fmt(q.deliveryFee)}₮`} />
              <Row k="Нийт" v={`${fmt(shownTotal)}₮`} strong />
            </div>
          )}
          {fatal && (
            <div className="mb-3">
              <Alert fatal={fatal} />
            </div>
          )}
          {step === "cart" ? (
            <button type="button" className={`${btnSolid} w-full`} disabled={!q.ok} onClick={() => goStep("details")}>
              Захиалах →
            </button>
          ) : (
            <>
              <div className="flex gap-3">
                <button type="button" className={`${btnLine} w-14 flex-none px-0`} onClick={() => goStep("cart")} disabled={busy} aria-label="Сагс руу буцах">
                  ←
                </button>
                <button
                  type="button"
                  className={`${btnSolid} flex-1`}
                  onClick={pay}
                  disabled={busy || !q.ok || f.district === OTHER_DISTRICT}
                >
                  {busy ? "Түр хүлээнэ үү…" : `Төлбөр төлөх · ${fmt(shownTotal)}₮`}
                </button>
              </div>
              <p className="mb-0 mt-3 text-[12px] leading-[1.6] text-mute">
                Wire-ийн төлбөрийн хуудас руу шилжинэ. {REFUND_DAYS} хоногийн дотор ажиллахгүй бол мөнгийг бүтэн буцаана.
              </p>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

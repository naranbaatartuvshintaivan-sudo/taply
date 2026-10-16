"use client";

import Image from "next/image";
import { useState } from "react";
import { cartQuote, cartReducer, lineCap, qtyOf } from "@/lib/cart";
import { TOO_MANY_MESSAGE } from "@/lib/checkout";
import { fmt, quote, type StandardSku } from "@/lib/pricing";
import { shopItem } from "@/lib/shop";
import { ContactLine } from "../ContactLine";
import { btnLine, btnSolid, eyebrow, Stepper } from "../order/ui";
import { useCart } from "./context";
import { CloseButton, Sheet } from "./Sheet";

// Барааны modal — ProductGrid-ээс lazy (next/dynamic) ачаалагдана

const priceText = (q: ReturnType<typeof quote>) =>
  q.ok
    ? `${q.unitPrice ? `${q.totalQty} × ${fmt(q.unitPrice)}₮` : `${q.totalQty} ширхэг`}, ${q.deliveryFee === 0 ? "хүргэлт үнэгүй" : `хүргэлт ${fmt(q.deliveryFee)}₮`}`
    : "";

export function ProductModal({ sku, onClose }: { sku: StandardSku | null; onClose: () => void }) {
  // Хаах animation-ы үеэр агуулга алга болохгүйн тулд сүүлийн барааг санана
  const [last, setLast] = useState<StandardSku | null>(sku);
  const [qty, setQty] = useState(1);
  if (sku && sku !== last) {
    setLast(sku);
    setQty(1);
  }
  const p = last ? shopItem(last) : null;

  return (
    <Sheet open={!!sku} onClose={onClose} label={p?.name ?? "Бүтээгдэхүүн"} variant="modal">
      {p && <ModalBody key={p.sku} sku={p.sku} qty={qty} setQty={setQty} onClose={onClose} />}
    </Sheet>
  );
}

function ModalBody({
  sku,
  qty,
  setQty,
  onClose,
}: {
  sku: StandardSku;
  qty: number;
  setQty: (n: number) => void;
  onClose: () => void;
}) {
  const { state, dispatch, openCart, announce } = useCart();
  const p = shopItem(sku);
  const single = quote("standard", [{ sku, qty }]);
  const inCart = state.lines.some((l) => l.sku !== sku) || qtyOf(state, sku) > 0;
  const combined = cartQuote(cartReducer(state, { type: "add", sku, qty, stock: null }));
  const blocked = !combined.ok;

  const add = () => dispatch({ type: "add", sku, qty, stock: null });

  return (
    // Утсан дээр: зураг + тайлбар гүйлгэгдэнэ, тоо/үнэ/товч доор үргэлж харагдана
    <div className="relative flex min-h-0 flex-1 flex-col md:grid md:grid-cols-2">
      <div className="absolute right-3 top-3 z-10 rounded-full bg-white/90">
        <CloseButton onClick={onClose} />
      </div>
      <div className="relative h-[30dvh] w-full flex-none bg-ph md:h-auto md:min-h-[600px]">
        <Image src={p.src} alt={p.alt} fill sizes="(min-width:768px) 480px, 100vw" className="object-cover" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-6 md:px-10 md:pt-12">
          <div className={`${eyebrow} text-mute`}>{p.kind}</div>
          <h2 className="m-0 mt-3 text-[28px] font-extrabold leading-[1.05] tracking-[-.03em] md:text-[40px]">{p.name}</h2>
          <p className="mb-0 mt-4 text-base leading-[1.6] text-body">{p.summary}</p>
          <ul className="m-0 mt-6 list-none p-0">
            {p.features.map((x) => (
              <li key={x} className="border-t border-line py-3 text-[15px] font-medium last:border-b">
                {x}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-line px-6 pb-5 pt-4 md:px-10 md:pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex rounded-full border-[1.5px] border-line p-1">
              <Stepper label={p.name} value={qty} min={1} max={lineCap(null)} onChange={setQty} />
            </div>
            <div className="text-right" aria-live="polite">
              <div className="text-[28px] font-extrabold leading-none tracking-[-.03em] tabular-nums">
                {single.ok ? `${fmt(single.subtotal)}₮` : "—"}
              </div>
              <div className="mt-1.5 text-[13px] text-body">{priceText(single)}</div>
            </div>
          </div>

          {inCart && combined.ok && (
            <p className="mb-0 mt-3 text-[13px] text-body">
              Сагстай нийлээд: {combined.totalQty} ш · <strong className="text-ink">{fmt(combined.total)}₮</strong> ({priceText(combined)})
            </p>
          )}
          {blocked && (
            <p role="alert" className="mb-0 mt-3 text-[14px] font-medium text-[#c62828]">
              {TOO_MANY_MESSAGE}: <ContactLine linkClassName="font-bold text-[#c62828]" />
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className={`${btnSolid} flex-1 px-4!`}
              disabled={blocked}
              onClick={() => {
                add();
                onClose();
                openCart("details");
              }}
            >
              Одоо захиалах
            </button>
            <button
              type="button"
              className={`${btnLine} flex-1 px-4!`}
              disabled={blocked}
              onClick={() => {
                add();
                announce(`${p.name} × ${qty} сагсанд нэмэгдлээ`);
                onClose();
              }}
            >
              Сагсанд нэмэх
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

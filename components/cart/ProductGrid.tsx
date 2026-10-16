"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { MESSENGER_URL } from "@/lib/config";
import { fmt, FROM_PRICE, type StandardSku } from "@/lib/pricing";
import { CUSTOM_ITEM, SHOP, shopItem } from "@/lib/shop";
import { Photo } from "../Photo";
import { useCart } from "./context";
import { flyToCart } from "./fly";
import { loadModal } from "./lazy";

// Modal (framer-motion, stepper) эхний JS-д орохгүй — зураг руу хулгана/хуруу ойртоход урьдчилан татна
const ProductModal = dynamic(() => loadModal().then((m) => m.ProductModal), { ssr: false });

const SIZES = "(min-width:1024px) 31vw, 50vw";
const eyebrow = "text-[13px] font-medium uppercase tracking-[.22em]";
const chip = "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[13px] font-bold";

export function ProductGrid() {
  const { dispatch, announce } = useCart();
  const [openSku, setOpenSku] = useState<StandardSku | null>(null);
  const [added, setAdded] = useState<StandardSku | null>(null);
  const [modalWanted, setModalWanted] = useState(false);
  const prefetch = () => {
    setModalWanted(true);
    void loadModal();
  };
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Зураг сагс руу нисэж хүрмэгц тоо нэмэгдэнэ (fly.ts)
  const quickAdd = (sku: StandardSku, from: Element | null) => {
    flyToCart(from, () => {
      dispatch({ type: "add", sku, qty: 1, stock: null });
      announce(`${shopItem(sku).name} сагсанд нэмэгдлээ`);
    });
    setAdded(sku);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(null), 1600);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-3">
        {SHOP.map((p, i) => (
          <figure key={p.sku} className="m-0">
            <button
              type="button"
              onPointerEnter={prefetch}
              onTouchStart={prefetch}
              onFocus={prefetch}
              onClick={() => {
                setModalWanted(true);
                setOpenSku(p.sku);
              }}
              aria-label={`${p.name} — дэлгэрэнгүй`}
              className="block w-full cursor-pointer text-left hover:opacity-90"
            >
              <Photo n={i + 1} label={p.name} src={p.src} alt={p.alt} aspect="4 / 5" sizes={SIZES} />
            </button>
            <figcaption className="mt-4">
              <div className="text-[15px] font-bold tracking-[-.01em]">{p.name}</div>
              <div className="mt-1 text-[13px] text-mute">{p.kind}</div>
              <div className="mt-2 text-[15px] font-medium">{fmt(FROM_PRICE.standard)}₮-өөс</div>
              <button
                type="button"
                onClick={(e) => quickAdd(p.sku, e.currentTarget.closest("figure"))}
                aria-label={`${p.name} сагсанд нэмэх`}
                className={`${chip} mt-3 border-[1.5px] border-ink hover:bg-ink hover:text-white`}
              >
                {added === p.sku ? "✓ Нэмэгдлээ" : "+ Сагсанд"}
              </button>
            </figcaption>
          </figure>
        ))}

        <figure className="m-0">
          <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90" tabIndex={-1} aria-hidden>
            <Photo n={5} label={CUSTOM_ITEM.name} src={CUSTOM_ITEM.src} alt="" aspect="4 / 5" sizes={SIZES} />
          </a>
          <figcaption className="mt-4">
            <div className={`${eyebrow} text-mute`}>{CUSTOM_ITEM.kind}</div>
            <div className="mt-1 text-[15px] font-bold tracking-[-.01em]">{CUSTOM_ITEM.name}</div>
            <div className="mt-2 text-[15px] font-medium">{fmt(FROM_PRICE.custom)}₮-өөс</div>
            <p className="mb-0 mt-2 text-[13px] leading-[1.6] text-body">{CUSTOM_ITEM.desc}</p>
            <a
              href={MESSENGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${chip} mt-3 bg-ink text-white hover:bg-[#2a2a2a]`}
            >
              Messenger-ээр бичих →
            </a>
          </figcaption>
        </figure>
      </div>

      {modalWanted && <ProductModal sku={openSku} onClose={() => setOpenSku(null)} />}
    </>
  );
}


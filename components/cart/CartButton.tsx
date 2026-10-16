"use client";

import { totalQty } from "@/lib/cart";
import { useCartOptional } from "./context";

// Header-ийн сагсны товч. CartProvider-гүй хуудсан (/order, /o/...) дээр харагдахгүй.
export function CartButton() {
  const cart = useCartOptional();
  if (!cart) return null;
  const n = cart.ready ? totalQty(cart.state) : 0;
  return (
    <button
      type="button"
      onClick={() => cart.openCart("cart")}
      aria-label={n > 0 ? `Сагс, ${n} ширхэг` : "Сагс, хоосон"}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-ph"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" strokeLinejoin="round" />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" strokeLinecap="round" />
      </svg>
      {n > 0 && (
        <span
          aria-hidden
          className="absolute right-0 top-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold tabular-nums text-white"
        >
          {n > 99 ? "99+" : n}
        </span>
      )}
    </button>
  );
}

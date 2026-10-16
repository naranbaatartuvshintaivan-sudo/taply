"use client";

import { cartQuote, totalQty } from "@/lib/cart";
import { fmt } from "@/lib/pricing";
import { useCart } from "./context";

// Мобайл: сагс хоосон биш үед доор наалдсан товч. iPhone-ий доод зурвасыг (safe-area) тооцно.
// Footer-ийн доод хэсгийг далдлахгүйн тулд ижил өндөртэй хар зай үлдээнэ.
export function CartBar() {
  const { state, ready, open, openCart } = useCart();
  const n = ready ? totalQty(state) : 0;
  if (n === 0) return null;
  const q = cartQuote(state);
  return (
    <>
      <div aria-hidden className="h-[calc(80px+env(safe-area-inset-bottom))] bg-ink md:hidden" />
      {!open && (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#2a2a2a] bg-ink px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 md:hidden">
          <button
            type="button"
            onClick={() => openCart("cart")}
            className="flex min-h-14 w-full items-center justify-between gap-3 rounded-full bg-white px-6 text-[15px] font-bold text-ink"
          >
            <span>
              Сагс · {n} ш{q.ok ? ` · ${fmt(q.subtotal)}₮` : ""}
            </span>
            <span aria-hidden>→</span>
          </button>
        </div>
      )}
    </>
  );
}

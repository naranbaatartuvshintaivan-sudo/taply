"use client";

import { createContext, useContext } from "react";
import type { CartAction, CartState } from "@/lib/cart";

// Context тусдаа файлд: Nav-ийн CartButton үүнийг л импортлох тул drawer, framer-motion
// бусад хуудсын (/order, /o/...) bundle-д орохгүй.
export type CartStep = "cart" | "details";

export type CartCtxValue = {
  state: CartState;
  dispatch: (a: CartAction) => void;
  /** localStorage-оос уншиж дууссан эсэх — түүнээс өмнө badge, bar харуулахгүй (hydration mismatch-гүй) */
  ready: boolean;
  open: boolean;
  step: CartStep;
  openCart: (step?: CartStep) => void;
  closeCart: () => void;
  setStep: (s: CartStep) => void;
  /** Захиалга амжилттай үүссэний дараа: сагс + хадгалалт хоёуланг цэвэрлэнэ */
  clearAll: () => void;
  announce: (msg: string) => void;
};

export const CartCtx = createContext<CartCtxValue | null>(null);

export const useCartOptional = () => useContext(CartCtx);
export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart: CartProvider алга");
  return c;
}

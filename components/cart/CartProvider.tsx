"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { cartReducer, EMPTY_CART, getStorage, loadCart, saveCart } from "@/lib/cart";
import { CartCtx, type CartCtxValue, type CartStep } from "./context";
import { loadDrawer } from "./lazy";

// Drawer (framer-motion, form, checkout) — эхний JS-д орохгүй
const CartDrawer = dynamic(() => loadDrawer().then((m) => m.CartDrawer), { ssr: false });

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<CartStep>("cart");
  const [message, setMessage] = useState("");
  // Нэг удаа prefetch/нээгдсэний дараа drawer mount хэвээр (хаалттай) — дахин нээхэд loading flash-гүй
  const [drawerWanted, setDrawerWanted] = useState(false);

  // Уншилт зөвхөн mount-ын дараа: server render ба эхний client render хоёулаа хоосон сагстай
  useEffect(() => {
    dispatch({ type: "hydrate", lines: loadCart(getStorage()) });
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveCart(getStorage(), state);
  }, [ready, state]);

  const prefetch = useCallback(() => {
    setDrawerWanted(true);
    void loadDrawer();
  }, []);
  const openCart = useCallback((s: CartStep = "cart") => {
    setDrawerWanted(true);
    setStep(s);
    setOpen(true);
  }, []);
  const closeCart = useCallback(() => setOpen(false), []);
  const clearAll = useCallback(() => {
    dispatch({ type: "clear" });
    saveCart(getStorage(), EMPTY_CART);
  }, []);
  const announce = useCallback((msg: string) => {
    // Ижил мессежийг дахин уншуулахын тулд эхлээд хоосолно
    setMessage("");
    requestAnimationFrame(() => setMessage(msg));
  }, []);

  const value = useMemo<CartCtxValue>(
    () => ({ state, dispatch, ready, open, step, openCart, closeCart, setStep, clearAll, announce, prefetch }),
    [state, ready, open, step, openCart, closeCart, clearAll, announce, prefetch],
  );

  return (
    <CartCtx.Provider value={value}>
      {children}
      {drawerWanted && <CartDrawer />}
      <div aria-live="polite" role="status" className="sr-only">
        {message}
      </div>
    </CartCtx.Provider>
  );
}

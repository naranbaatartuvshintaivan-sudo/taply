"use client";

import { LazyMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { cartReducer, EMPTY_CART, getStorage, loadCart, saveCart } from "@/lib/cart";
import { CartDrawer } from "./CartDrawer";
import { CartCtx, type CartCtxValue, type CartStep } from "./context";

const loadFeatures = () => import("./motion-features").then((r) => r.default);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<CartStep>("cart");
  const [message, setMessage] = useState("");

  // Уншилт зөвхөн mount-ын дараа: server render ба эхний client render хоёулаа хоосон сагстай
  useEffect(() => {
    dispatch({ type: "hydrate", lines: loadCart(getStorage()) });
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveCart(getStorage(), state);
  }, [ready, state]);

  const openCart = useCallback((s: CartStep = "cart") => {
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
    () => ({ state, dispatch, ready, open, step, openCart, closeCart, setStep, clearAll, announce }),
    [state, ready, open, step, openCart, closeCart, clearAll, announce],
  );

  return (
    <CartCtx.Provider value={value}>
      <LazyMotion features={loadFeatures} strict>
        {children}
        <CartDrawer />
      </LazyMotion>
      <div aria-live="polite" role="status" className="sr-only">
        {message}
      </div>
    </CartCtx.Provider>
  );
}

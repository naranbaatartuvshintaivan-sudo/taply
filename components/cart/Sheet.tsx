"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

// Сагсны drawer болон барааны modal-ын нийтлэг суурь:
// focus trap, Esc / overlay-ээр хаах, body scroll түгжих, хаахад өмнөх элемент рүү focus буцаах.
// prefers-reduced-motion үед зөвхөн opacity (хөдөлгөөнгүй).

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  label,
  variant,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  variant: "drawer" | "modal";
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = panel.current;
    const items = () =>
      Array.from(el?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((n) => n.tabIndex >= 0 && n.getClientRects().length > 0);
    (items()[0] ?? el)?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const list = items();
      if (list.length === 0) return e.preventDefault();
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !el.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !el.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, [open]);

  const drawer = variant === "drawer";
  const hidden = reduce ? { opacity: 0 } : drawer ? { x: "100%" } : { opacity: 0, y: 32 };
  const shown = reduce ? { opacity: 1 } : drawer ? { x: 0 } : { opacity: 1, y: 0 };

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-[90] flex ${drawer ? "justify-end" : "items-end justify-center md:items-center md:p-8"}`}>
          <m.div
            className="absolute inset-0 bg-ink/50"
            onClick={onClose}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={
              "relative flex flex-col overflow-hidden bg-white outline-none " +
              (drawer
                ? "h-full w-full max-w-[480px] pb-[env(safe-area-inset-bottom)]"
                : "max-h-[92dvh] w-full rounded-t-[16px] pb-[env(safe-area-inset-bottom)] md:max-w-[960px] md:rounded-[12px] md:pb-0")
            }
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={reduce ? { duration: 0.12 } : { type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.32 }}
          >
            {children}
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function CloseButton({ onClick, label = "Хаах" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full hover:bg-ph"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round" />
      </svg>
    </button>
  );
}

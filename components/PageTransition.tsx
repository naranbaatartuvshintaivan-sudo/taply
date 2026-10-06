"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

type Phase = "idle" | "cover" | "reveal";
type GoFn = (e: MouseEvent, id: string) => void;

// Тэгш өнцөгтүүдийн өргөн, өндөр жигд биш — мозайк мэт харагдана
const COL_W = [1.3, 0.7, 1, 1.6, 0.8, 1.2, 0.9, 1.5, 0.7, 1.1];
const ROW_H = [1, 0.7, 1.4, 0.9, 1.2, 0.8, 1.3];
const PHASE_MS = 1000;

const Ctx = createContext<GoFn>(() => {});
export const useGo = () => useContext(Ctx);

export function GoLink({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const go = useGo();
  return (
    <a href={`#${id}`} onClick={(e) => go(e, id)} className={className}>
      {children}
    </a>
  );
}

export function TransitionProvider({
  children,
  origin = "left",
}: {
  children: ReactNode;
  origin?: "left" | "right";
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);

  const set = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  // Хэдэн frame дараалан байрлал өөрчлөгдөөгүй бол хуудас тогтсон гэж үзнэ (дээд тал нь 600мс)
  const settle = (el: HTMLElement, done: () => void) => {
    let last: number | null = null;
    let stable = 0;
    const t0 = Date.now();
    const tick = () => {
      const top = el.getBoundingClientRect().top;
      if (last !== null && Math.abs(top - last) < 0.5) stable++;
      else stable = 0;
      last = top;
      if (stable >= 3 || Date.now() - t0 > 600) done();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Зөвхөн "Яаж ажилладаг" (#how) ↔ "Захиалах" (#order) хооронд мозайк транзишн
  const go = useCallback<GoFn>((e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el || phaseRef.current !== "idle") return;

    const mid = window.innerHeight / 2;
    const inView = (sid: string) => {
      const s = document.getElementById(sid);
      if (!s) return false;
      const r = s.getBoundingClientRect();
      return r.top <= mid && r.bottom > mid;
    };
    const from = inView("order") ? "order" : inView("how") ? "how" : null;
    const special =
      (from === "order" && id === "how") || (from === "how" && id === "order");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!special || reduce) {
      el.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" });
      return;
    }

    set("cover");
    later(() => {
      // Дэлгэц бүрэн хар байхад smooth-гүйгээр шууд зорьсон хэсэгт аваачна
      const saved: [HTMLElement, string][] = [];
      let n: HTMLElement | null = el;
      while (n) {
        saved.push([n, n.style.scrollBehavior]);
        n.style.scrollBehavior = "auto";
        n = n.parentElement;
      }
      el.scrollIntoView({ behavior: "auto", block: "start" });
      settle(el, () => {
        saved.forEach(([node, v]) => (node.style.scrollBehavior = v));
        set("reveal");
        later(() => set("idle"), PHASE_MS);
      });
    }, PHASE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tiles = useMemo(() => {
    const cols = COL_W.length;
    const out: { delay: number }[] = [];
    for (let r = 0; r < ROW_H.length; r++) {
      for (let c = 0; c < cols; c++) {
        const diag = (origin === "right" ? cols - 1 - c : c) + r;
        const jitter = Math.abs(Math.sin((r * 31 + c * 17 + 1) * 12.9898) * 43758.5453) % 1;
        out.push({ delay: Math.round(diag * 34 + jitter * 130) });
      }
    }
    return out;
  }, [origin]);

  const covered = phase === "cover";

  return (
    <Ctx.Provider value={go}>
      {children}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[100] grid"
        style={{
          gridTemplateColumns: COL_W.map((w) => `${w}fr`).join(" "),
          gridTemplateRows: ROW_H.map((h) => `${h}fr`).join(" "),
          pointerEvents: phase === "idle" ? "none" : "all",
        }}
      >
        {tiles.map((t, i) => (
          <div
            key={i}
            className="bg-ink shadow-[0_0_0_1px_#0a0a0a]"
            style={{
              opacity: covered ? 1 : 0,
              transition: phase === "idle" ? "none" : `opacity .14s linear ${t.delay}ms`,
            }}
          />
        ))}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 whitespace-nowrap text-[clamp(56px,11vw,168px)] font-extrabold leading-none tracking-[.16em] text-white"
          style={{
            opacity: covered ? 1 : 0,
            transform: `translate(-50%,-50%) scale(${covered ? 1 : 0.94})`,
            transition: covered
              ? "opacity .22s linear .5s, transform .45s cubic-bezier(.22,1,.36,1) .5s"
              : "opacity .16s linear",
          }}
        >
          TAPLY
        </span>
      </div>
    </Ctx.Provider>
  );
}

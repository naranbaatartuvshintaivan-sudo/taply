// "Сагсанд нэмэх" үед барааны зураг үсрээд дээрх сагсны icon руу нисэж очно, хүрмэгц done()
// дуудагдаж тоо нэмэгдэнэ. Web Animations API — framer-motion-гүй, эхний JS-д хэдхэн мөр.
// Reduced motion, зураг/icon олдохгүй, эсвэл .animate() дэмжигдээгүй бол шууд done().

const DURATION = 720;

export function flyToCart(from: Element | null | undefined, done: () => void) {
  const img = from instanceof HTMLImageElement ? from : from?.querySelector("img");
  const target = document.querySelector("[data-cart-icon]");
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!img || !target || reduce || typeof img.animate !== "function") return done();

  const a = img.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (a.width === 0 || b.width === 0) return done();

  // Эхлэх хэмжээ: зургийн төв дээр дөрвөлжин (том зураг бол 160px хүртэл)
  const size = Math.min(160, a.width, a.height);
  const x0 = a.left + a.width / 2 - size / 2;
  const y0 = a.top + a.height / 2 - size / 2;
  const dx = b.left + b.width / 2 - (x0 + size / 2);
  const dy = b.top + b.height / 2 - (y0 + size / 2);

  // Гадна тал X-ийг, дотор тал Y-ийг өөр easing-ээр хөдөлгөснөөр муруй (нумтай) зам гарна
  const outer = document.createElement("div");
  outer.setAttribute("aria-hidden", "true");
  outer.style.cssText = `position:fixed;left:${x0}px;top:${y0}px;width:${size}px;height:${size}px;z-index:200;pointer-events:none;`;
  const inner = document.createElement("div");
  inner.style.cssText = "width:100%;height:100%;";
  const clone = document.createElement("img");
  clone.src = img.currentSrc || img.src;
  clone.alt = "";
  clone.style.cssText =
    "width:100%;height:100%;object-fit:cover;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.25);";
  inner.appendChild(clone);
  outer.appendChild(inner);
  document.body.appendChild(outer);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    outer.remove();
    done();
  };

  outer.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }], {
    duration: DURATION,
    easing: "cubic-bezier(.45,0,.75,.45)",
    fill: "forwards",
  });
  // Эхлээд бага зэрэг дээш үсэрч томроод, дараа нь сагс руу жижгэрч орно
  const fly = inner.animate(
    [
      { transform: "translateY(0) scale(1)", opacity: 1, offset: 0 },
      { transform: "translateY(-28px) scale(1.08)", opacity: 1, offset: 0.18 },
      { transform: `translateY(${dy}px) scale(.12)`, opacity: 0.7, offset: 1 },
    ],
    { duration: DURATION, easing: "cubic-bezier(.3,.1,.4,1)", fill: "forwards" },
  );
  fly.onfinish = finish;
  fly.oncancel = finish;
  // Таб далд болсон гэх мэт үед animation зогсвол ч тоо заавал нэмэгдэнэ
  window.setTimeout(finish, DURATION + 400);
}

// "Манай хэрэглэгчид" урсгалын зургууд (public/customers/*.webp, scripts/prep-customers.mjs-ээр бэлтгэсэн).
// Нэр мэдэгдэхгүй бол name: null — caption бичихгүй, нэр зохиохгүй. Нэртэй нь эхэнд (урсгалын эхэнд гарна).
export type Customer = { src: string; name: string | null };

const named = (file: string, name: string): Customer => ({ src: `/customers/${file}.webp`, name });
const unnamed = (file: string): Customer => ({ src: `/customers/${file}.webp`, name: null });

export const CUSTOMERS: Customer[] = [
  named("style-brand-store_custom", "Style Brand Store"),
  named("maral_custom", "Maral"),
  named("bolor-store_custom", "BOLOR Store"),
  unnamed("unnamed-01_shoe-store-fb-ig"),
  unnamed("unnamed-02_shoe-store-fb"),
  unnamed("unnamed-03_clothing-boutique-fb"),
  unnamed("unnamed-04_marble-table-fb-ig"),
  unnamed("unnamed-05_white-counter-fb"),
  unnamed("unnamed-06_concrete-counter-fb-ig"),
  unnamed("unnamed-07_dark-desk-fb"),
];

export const customerAlt = (c: Customer) => (c.name ? `${c.name}-ийн NFC стенд` : "Харилцагчийн NFC стенд");

/**
 * Зургуудыг `cols` баганад хуваарилна. Зураг цөөн бол багана бүрт бүх зургийг өөр өөр эхлэлээр
 * (эргүүлж) тавина — хоосон багана гарахгүй. Олон бол ээлжлэн хуваана.
 * Багана бүр урсгалын нэг "хагас"-ыг дүүргэхийн тулд дор хаяж `minPerCol` зурагтай болтол давтагдана.
 */
export function distribute<T>(items: T[], cols: number, minPerCol = 4): T[][] {
  if (items.length === 0) return Array.from({ length: cols }, () => []);
  const base =
    items.length >= cols * 2
      ? Array.from({ length: cols }, (_, c) => items.filter((_, i) => i % cols === c))
      : Array.from({ length: cols }, (_, c) => items.map((_, i) => items[(i + c) % items.length]));
  return base.map((col) => {
    const out = [...col];
    while (out.length < minPerCol) out.push(...col);
    return out;
  });
}

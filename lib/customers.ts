// "Манай хэрэглэгчид" урсгалын зургууд (public/customers/*.webp, scripts/prepare-photos.ts-ээр бэлтгэсэн).
// Шинэ зураг нэмэхдээ width/height-ийг скриптийн гаралтаас хуулна. Нэр мэдэгдэхгүй бол name: null —
// caption бичихгүй, нэр зохиохгүй. Нэртэй нь жагсаалтын эхэнд байна (урсгалын эхэнд гарна).
export type Customer = { src: string; name: string | null; width: number; height: number };

export const CUSTOMERS: Customer[] = [
  { src: "/customers/style-brand-store.webp", name: "Style Brand Store", width: 1200, height: 1600 },
  { src: "/customers/maral.webp", name: "Maral", width: 1200, height: 1600 },
  { src: "/customers/bolor-store.webp", name: "BOLOR Store", width: 1200, height: 1600 },
];

export const customerAlt = (c: Customer) => (c.name ? `${c.name}-ийн NFC стенд` : "Харилцагчийн NFC стенд");

/**
 * Зургуудыг `cols` баганад хуваарилна. Зураг цөөн бол багана бүрт бүх зургийг өөр өөр эхлэлээр
 * (эргүүлж) тавина — хоосон багана гарахгүй. Олон бол ээлжлэн хуваана.
 * Багана бүр урсгалын нэг "хагас"-ыг дүүргэхийн тулд дор хаяж `minPerCol` зурагтай болтол давтагдана.
 */
export function distribute<T>(items: T[], cols: number, minPerCol = 6): T[][] {
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

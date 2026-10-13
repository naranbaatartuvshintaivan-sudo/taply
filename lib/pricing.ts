// Үнийн тооцоо — ЗӨВХӨН сервер дээр ашиглана (client-ийн дүнд итгэхгүй).
// Цэвэр функц: оролт ижил бол гаралт ижил, гадаад хамааралгүй → unit test-тэй.
import { DELIVERY } from "./config";

export type CardType = "standard" | "custom";

export const STANDARD_SKUS = ["fb_sticker", "ig_sticker", "fb_stand", "ig_stand"] as const;
export type StandardSku = (typeof STANDARD_SKUS)[number];
export type Sku = StandardSku | "custom_wide";

export const SKU_LABEL: Record<Sku, string> = {
  fb_sticker: "FB наалт",
  ig_sticker: "IG наалт",
  fb_stand: "FB стенд",
  ig_stand: "IG стенд",
  custom_wide: "Өөрийн логотой стенд",
};

export const SKU_PLATFORM: Record<StandardSku, "fb" | "ig"> = {
  fb_sticker: "fb",
  ig_sticker: "ig",
  fb_stand: "fb",
  ig_stand: "ig",
};

// Ширхгийн шатлал. 1 ба 2 ширхэг нь нийт үнэтэй, 3+ нь нэгж үнэтэй.
const TABLE: Record<CardType, { one: number; two: number; from3: number; from10: number }> = {
  standard: { one: 34_900, two: 55_900, from3: 27_900, from10: 24_900 },
  custom: { one: 44_900, two: 69_900, from3: 32_900, from10: 29_900 },
};

// Custom 30+ ширхэг бол онлайн төлбөргүй — утсаар тохирно
export const CUSTOM_PHONE_ONLY_FROM = 30;
// Нэг захиалгын дээд хязгаар (үүнээс их бол утсаар)
export const MAX_QTY = 200;

export type Quote =
  | {
      ok: true;
      type: CardType;
      totalQty: number;
      subtotal: number;
      unitPrice: number | null; // 3+ ширхэг дээр нэгж үнэ, 1–2 дээр null
      deliveryFee: number;
      total: number;
      breakdown: string; // "3 × 27,900, хүргэлт үнэгүй"
    }
  | { ok: false; reason: "empty" | "phone_only" | "too_many" | "bad_qty" };

export const fmt = (n: number) => n.toLocaleString("en-US");

export function subtotalFor(type: CardType, qty: number): { subtotal: number; unitPrice: number | null } {
  const t = TABLE[type];
  if (qty === 1) return { subtotal: t.one, unitPrice: null };
  if (qty === 2) return { subtotal: t.two, unitPrice: null };
  const unit = qty >= 10 ? t.from10 : t.from3;
  return { subtotal: unit * qty, unitPrice: unit };
}

export function deliveryFeeFor(totalQty: number): number {
  return totalQty >= DELIVERY.freeFromQty ? 0 : DELIVERY.fee;
}

export function quote(type: CardType, items: { sku: string; qty: number }[]): Quote {
  if (items.some((i) => !Number.isInteger(i.qty) || i.qty < 0)) return { ok: false, reason: "bad_qty" };
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  if (totalQty <= 0) return { ok: false, reason: "empty" };
  if (type === "custom" && totalQty >= CUSTOM_PHONE_ONLY_FROM) return { ok: false, reason: "phone_only" };
  if (totalQty > MAX_QTY) return { ok: false, reason: "too_many" };

  const { subtotal, unitPrice } = subtotalFor(type, totalQty);
  const deliveryFee = deliveryFeeFor(totalQty);
  const total = subtotal + deliveryFee;
  const priceText = unitPrice ? `${totalQty} × ${fmt(unitPrice)}` : `${totalQty} ширхэг`;
  const deliveryText = deliveryFee === 0 ? "хүргэлт үнэгүй" : `хүргэлт ${fmt(deliveryFee)}`;
  return {
    ok: true,
    type,
    totalQty,
    subtotal,
    unitPrice,
    deliveryFee,
    total,
    breakdown: `${priceText}, ${deliveryText}`,
  };
}

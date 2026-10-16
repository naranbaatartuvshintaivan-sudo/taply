import type { StandardSku } from "./pricing";

// Нүүр хуудасны дэлгүүр (сагс) болон /order хуудсанд харагдах бараа.
// SKU нь products хүснэгт, /api/orders-ийн items-тэй ижил.
export type ShopItem = {
  sku: StandardSku;
  name: string;
  kind: string;
  src: string;
  alt: string;
  summary: string;
  features: string[];
};

const STICKER_FEATURES = ["NFC: утсаа хүргэхэд л нээгдэнэ", "Апп татах шаардлагагүй", "Таны линкийг наалт руу бичиж өгнө"];
const STAND_FEATURES = [
  "NFC: утсаа хүргэхэд л нээгдэнэ",
  "QR код: камераараа уншуулж болно",
  "Касс, лангуу, ширээ, салоны толины дэргэд тавихад тохиромжтой",
];

export const SHOP: ShopItem[] = [
  {
    sku: "fb_sticker",
    name: "Facebook наалт",
    kind: "Хэвтээ наалт · 100 × 100 мм",
    src: "/products/hevteifb.webp",
    alt: "Facebook хуудас руу холбодог 100 × 100 мм NFC наалт",
    summary: "Жижиг NFC наалт. Утсаа хүргэхэд л таны Facebook хуудас нээгдэнэ.",
    features: STICKER_FEATURES,
  },
  {
    sku: "ig_sticker",
    name: "Instagram наалт",
    kind: "Хэвтээ наалт · 100 × 100 мм",
    src: "/products/hevtei.webp",
    alt: "Instagram хуудас руу холбодог 100 × 100 мм NFC наалт",
    summary: "Жижиг NFC наалт. Утсаа хүргэхэд л таны Instagram хуудас нээгдэнэ.",
    features: STICKER_FEATURES,
  },
  {
    sku: "fb_stand",
    name: "Facebook стенд",
    kind: "Ширээний босоо стенд",
    src: "/products/bosoofb.webp",
    alt: "Facebook хуудас руу холбодог ширээний NFC стенд",
    summary: "Ширээн дээр зогсдог стенд. Утсаа хүргэх эсвэл QR уншуулахад Facebook хуудас нээгдэнэ.",
    features: STAND_FEATURES,
  },
  {
    sku: "ig_stand",
    name: "Instagram стенд",
    kind: "Ширээний босоо стенд",
    src: "/products/bosooig.webp",
    alt: "Instagram хуудас руу холбодог ширээний NFC стенд",
    summary: "Ширээн дээр зогсдог стенд. Утсаа хүргэх эсвэл QR уншуулахад Instagram хуудас нээгдэнэ.",
    features: STAND_FEATURES,
  },
];

// Өөрийн логотой карт сагсанд орохгүй — Messenger-ээр гараар тохирно
export const CUSTOM_ITEM = {
  name: "Өөрийн логотой",
  kind: "Таны брэнд",
  src: "/photos/stand-blank.jpg",
  alt: "Өөрийн лого, QR, бичвэрээр хийлгэх цагаан ширээний стенд",
  desc: "Логогоо Messenger-ээр илгээнэ үү. 3 загвар гаргаж үзүүлнэ, та сонгоно.",
};

export const shopItem = (sku: StandardSku) => SHOP.find((p) => p.sku === sku)!;
